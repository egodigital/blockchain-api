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
import { BlockChainBlock, TIMESTAMP_FORMAT } from '../../block';
import { BlockChain } from '../../chain';
import * as egoose from '@egodigital/egoose';
import * as express from 'express';
import * as joi from 'joi';
import * as moment from 'moment';
import * as storage from '../../storage';

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
 * @param {express.Router} root The root.
 * @param {storage.BlockChainStorage} storage The storage to use.
 */
export function init(
    root: express.Router,
    storage: storage.BlockChainStorage,
) {
    // create new chain
    root.post('/', express.json(), async (req, res) => {
        const OPTIONS: CreateChainOptions = req.body;
        if (_.isObjectLike(OPTIONS)) {
            if (_.isNil(JSON_SCHEMA_CREATE_CHAIN.validate(OPTIONS).error)) {
                const NEW_CHAIN = await Promise.resolve(
                    storage.createChain(OPTIONS.name)
                );
                if (false === NEW_CHAIN) {
                    // does already exist

                    return res.status(409)
                        .send();
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
    root.get('/:chain', async (req, res) => {
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
            const CHAIN = await storage.getChain(CHAIN_NAME);
            if (false !== CHAIN) {
                const BLOCKS: any[] = [];
                await CHAIN.each(async (context) => {
                    if (context.index >= limit) {
                        context.cancel();
                        return;
                    }

                    BLOCKS.push(
                        toJSON(CHAIN, context.block)
                    );
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

    // get blocks of chain
    root.get('/:chain/:index', async (req, res) => {
        const CHAIN_NAME = normalizeChainName(req.params['chain']);
        if ('' !== CHAIN_NAME) {
            const INDEX = parseInt(
                egoose.toStringSafe(
                    req.params['index']
                ).trim()
            );
            if (!isNaN(INDEX) && INDEX >= 0) {
                const CHAIN = await storage.getChain(CHAIN_NAME);
                if (false !== CHAIN) {
                    const ITERATOR = CHAIN.getIterator(INDEX);

                    const BLOCK = await ITERATOR.next();
                    if (false !== BLOCK) {
                        return res.status(BLOCK.data.length > 0 ? 200 : 204)
                            .header('Content-type', 'application/octet-stream')
                            .send(BLOCK.data);
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
    root.post('/:chain', async (req, res) => {
        const CHAIN_NAME = normalizeChainName(req.params['chain']);
        if ('' !== CHAIN_NAME) {
            const CHAIN = await storage.getChain(CHAIN_NAME);
            if (false !== CHAIN) {
                const BLOCK = new BlockChainBlock(
                    await egoose.readAll(req)
                );
                await CHAIN.addBlock(BLOCK);

                const RESULT = toJSON(CHAIN, BLOCK);

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
}

function normalizeChainName(name: any) {
    return egoose.normalizeString(
        name
    );
}

function toJSON(chain: BlockChain, block: BlockChainBlock): any {
    if (_.isNil(block)) {
        return block;
    }

    return {
        hash: block.hash.toString('base64'),
        index: block.index,
        previousHash: block.previousHash.toString('base64'),
        resource: '/api/v1/' + encodeURIComponent(chain.name) + '/' + block.index,
        timestamp: moment.utc(block.timestamp, TIMESTAMP_FORMAT)
            .toISOString()
    };
}
