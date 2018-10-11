/**
 * This file is part of @egodigital/blockchain (https://github.com/egodigital/blockchain-api).
 * Copyright (c) e.GO Digital GmbH, Aachen, Germany (https://www.e-go-digital.com/).
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, version 3.
 *
 * This program is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

import * as _ from 'lodash';
import { BlockChainBlock, ChainBlock, TIMESTAMP_FORMAT } from '../../block';
import { BlockChain } from '../../chain';
import { isBlockValidWith } from '../../helpers';
import * as egoose from '@egodigital/egoose';
import * as events from '../../events';
import * as express from 'express';
import * as joi from 'joi';
import * as moment from 'moment';
import * as storage from '../../storage';

/**
 * API version 1 context.
 */
export interface ApiContextV1 {
    /**
     * Returns the current event module.
     *
     * @return {events.BlockChainApiEventModule} The module.
     */
    readonly getEventModule: () => events.BlockChainApiEventModule;

    /**
     * The root of the API.
     */
    readonly root: express.Router;

    /**
     * The storage to use.
     */
    readonly storage: storage.BlockChainStorage;
}

interface CreateChainOptions {
    name: string;
}

const JSON_SCHEMA_CREATE_CHAIN = joi.object({
    name: joi.string()
        .trim()
        .min(1)
        .required(),
});

/**
 * Initializes the version 1 API.
 *
 * @param {ApiContextV1} context The context.
 */
export function init(
    context: ApiContextV1,
) {
    // const storage = context.storage;

    // create new chain
    context.root.post('/', express.json(), async (req, res) => {
        const OPTIONS: CreateChainOptions = req.body;
        if (_.isObjectLike(OPTIONS)) {
            if (_.isNil(JSON_SCHEMA_CREATE_CHAIN.validate(OPTIONS).error)) {
                const EVENTS = context.getEventModule();

                const NEW_CHAIN = await Promise.resolve(
                    context.storage
                        .createChain(OPTIONS.name)
                );
                if (false === NEW_CHAIN) {
                    // does already exist

                    return res.status(409)
                        .send();
                }

                if (EVENTS.onBlockChainCreated) {
                    await Promise.resolve(
                        EVENTS.onBlockChainCreated({
                            chain: NEW_CHAIN,
                            request: req,
                            response: res,
                        })
                    );
                }

                const RESULT = {
                    name: NEW_CHAIN.name,
                    resource: '/api/v1/' + encodeURIComponent(NEW_CHAIN.name)
                };

                return res.status(200)
                    .header('Content-type', 'application/json; charset=utf-8')
                    .send(new Buffer(JSON.stringify(RESULT), 'utf8'));
            }
        }

        return res.status(400)
            .send();
    });

    // get blocks of chain
    context.root.get('/:chain', async (req, res) => {
        let offset = parseInt(
            egoose.toStringSafe(req.query['o'])
                .trim()
        );
        if (isNaN(offset)) {
            offset = 0;
        }
        if (offset < 0) {
            offset = 0;
        }

        let limit = parseInt(
            egoose.toStringSafe(req.query['l'])
                .trim()
        );
        if (isNaN(limit)) {
            limit = 10;
        }
        if (limit > 100) {
            limit = 100;
        }

        const CHAIN_NAME = normalizeChainName(req.params['chain']);
        if ('' !== CHAIN_NAME) {
            const CHAIN = await context.storage
                .getChain(CHAIN_NAME);
            if (false !== CHAIN) {
                const EVENTS = context.getEventModule();

                let prevBlock: ChainBlock | false = false;

                const BLOCKS: any[] = [];
                await CHAIN.each(async (context) => {
                    if (context.index >= limit) {
                        context.cancel();
                        return;
                    }

                    let inputBlock = toJSON(
                        CHAIN, context.block,
                        false !== prevBlock ? isBlockValidWith(context.block, prevBlock)
                                            : true,
                    );
                    let outputBlock = inputBlock;

                    if (EVENTS.onReturnBlock) {
                        const ARGS: events.ReturnBlockApiEventArguments = {
                            block: context.block,
                            chain: CHAIN,
                            input: inputBlock,
                            output: false,
                            request: req,
                            response: res,
                        };

                        await Promise.resolve(
                            EVENTS.onReturnBlock(
                                ARGS
                            ),
                        );

                        if (ARGS.output) {
                            outputBlock = ARGS.output;
                        }
                    }

                    BLOCKS.push(outputBlock);

                    if (false === prevBlock) {
                        prevBlock = context.block;
                    }
                }, offset);

                const RESULT = {
                    blocks: BLOCKS,
                    offset: offset,
                };

                return res.status(200)
                    .header('Content-type', 'application/json; charset=utf-8')
                    .send(new Buffer(JSON.stringify(RESULT), 'utf8'));
            }

            return res.status(404)
                .send();
        }

        return res.status(400)
            .send();
    });

    // get data of block
    context.root.get('/:chain/:index', async (req, res) => {
        const CHAIN_NAME = normalizeChainName(req.params['chain']);
        if ('' !== CHAIN_NAME) {
            const INDEX = parseInt(
                egoose.toStringSafe(
                    req.params['index']
                ).trim()
            );
            if (!isNaN(INDEX) && INDEX >= 0) {
                const CHAIN = await context.storage
                    .getChain(CHAIN_NAME);
                if (false !== CHAIN) {
                    const ITERATOR = CHAIN.getIterator(INDEX);

                    const BLOCK = await ITERATOR.next();
                    if (false !== BLOCK) {
                        const EVENTS = context.getEventModule();

                        let inputData = BLOCK.data;
                        let outputData = inputData;

                        if (EVENTS.onReturnBlockData) {
                            const ARGS: events.ReturnBlockDataApiEventArguments = {
                                block: BLOCK,
                                chain: CHAIN,
                                input: inputData,
                                output: false,
                                request: req,
                                response: res,
                            };

                            await Promise.resolve(
                                EVENTS.onReturnBlockData(
                                    ARGS
                                ),
                            );

                            if (ARGS.output) {
                                outputData = ARGS.output;
                            }
                        }

                        return res.status(outputData.length > 0 ? 200 : 204)
                            .header('Content-type', 'application/octet-stream')
                            .send(outputData);
                    }
                }

                return res.status(404)
                    .send();
            }
        }

        return res.status(400)
            .send();
    });

    // add block to chain
    context.root.post('/:chain', async (req, res) => {
        const CHAIN_NAME = normalizeChainName(req.params['chain']);
        if ('' !== CHAIN_NAME) {
            const CHAIN = await context.storage
                .getChain(CHAIN_NAME);
            if (false !== CHAIN) {
                const EVENTS = context.getEventModule();

                const BLOCK = new BlockChainBlock(
                    await egoose.readAll(req)
                );
                await CHAIN.addBlock(BLOCK);

                let inputBlock = toJSON(CHAIN, BLOCK);
                let outputBlock = inputBlock;

                if (EVENTS.onReturnBlock) {
                    const ARGS: events.ReturnBlockApiEventArguments = {
                        block: BLOCK,
                        chain: CHAIN,
                        input: inputBlock,
                        output: false,
                        request: req,
                        response: res,
                    };

                    await Promise.resolve(
                        EVENTS.onReturnBlock(
                            ARGS
                        ),
                    );

                    if (ARGS.output) {
                        outputBlock = ARGS.output;
                    }
                }

                return res.status(200)
                    .header('Content-type', 'application/json; charset=utf-8')
                    .send(new Buffer(outputBlock, 'utf8'));
            }

            return res.status(404)
                .send();
        }

        return res.status(400)
            .send();
    });
}

function normalizeChainName(name: any) {
    return egoose.normalizeString(
        name
    );
}

function toJSON(
    chain: BlockChain, block: ChainBlock,
    isValid?: boolean
): any {
    if (_.isNil(block)) {
        return block;
    }

    return {
        hash: block.hash.toString('base64'),
        index: block.index,
        isValid: isValid,
        previousHash: block.previousHash.toString('base64'),
        resource: '/api/v1/' + encodeURIComponent(chain.name) + '/' + block.index,
        timestamp: moment.utc(block.timestamp, TIMESTAMP_FORMAT)
            .toISOString()
    };
}
