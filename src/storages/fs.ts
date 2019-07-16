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

import * as _ from "lodash";
import * as egoose from "@egodigital/egoose";
import * as fs from "fs-extra";
import * as joi from "joi";
import * as path from 'path';
import { default as pQueue } from 'p-queue';
import * as sanitizeFilename from 'sanitize-filename';
import { BlockChainBlock, ChainBlock } from "../block";
import { BlockChainIterator, BlockChainIteratorItem, BlockChainStorage, CreateChainResult, GetChainResult } from "../storage";
import { BlockChain } from "../chain";

interface BlockFile {
    data: string;
    hash: string;
    index: number;
    previousHash: string;
    timestamp: string;
}

const JSON_SCHEMA_BLOCK_FILE = joi.object({
    data: joi.string().trim().base64().required(),
    hash: joi.string().trim().base64().required(),
    index: joi.number().min(0).required(),
    previousHash: joi.string().trim().base64().required(),
    timestamp: joi.string().trim().regex(/^([0-9]{14})$/i).required(),
});

const REGEX_BLOCK_FILE = /^([0-9]+)(\.json)$/i;

class FileIterator implements BlockChainIterator {
    private _current: BlockChainIteratorItem;
    private _index: number;

    public constructor(
        private readonly _STORAGE: FileBlockChainStorage,
        private readonly _CHAIN: BlockChain,
        private readonly _OFFSET: number,
    ) {
        if (isNaN(this._OFFSET)) {
            this._OFFSET = 0;
        }

        this._index = this._OFFSET - 1;
    }

    public get current(): BlockChainIteratorItem {
        return this._current;
    }

    public next(): Promise<BlockChainIteratorItem>  {
        return this._STORAGE.queue.add(async () => {
            let newCurrent: BlockChainIteratorItem = false;

            try {
                const NEW_INDEX = ++this._index;

                const CHAIN_DIR = this._STORAGE.getChainRoot(
                    this._CHAIN.name
                );
                if (false !== CHAIN_DIR) {
                    const BLOCK_FILE = path.resolve(
                        CHAIN_DIR, `${ NEW_INDEX }.json`
                    );

                    if (fs.existsSync(BLOCK_FILE)) {
                        const CONTENT: BlockFile = JSON.parse(
                            await fs.readFile(
                                BLOCK_FILE, 'utf8'
                            )
                        );

                        if (_.isObjectLike(CONTENT)) {
                            if (_.isNil(JSON_SCHEMA_BLOCK_FILE.validate(CONTENT).error)) {
                                return {
                                    data: new Buffer(CONTENT.data.trim(), 'base64'),
                                    index: parseInt(
                                        egoose.toStringSafe(
                                            CONTENT.index
                                        ).trim()
                                    ),
                                    hash: new Buffer(CONTENT.hash.trim(), 'base64'),
                                    previousHash: new Buffer(CONTENT.previousHash.trim(), 'base64'),
                                    timestamp: CONTENT.timestamp.trim(),
                                };
                            }
                        }
                    }
                }
            } catch { }

            this._current = newCurrent;
            return newCurrent;
        });
    }
}

/**
 * A block chain storage based on a local file system.
 */
export class FileBlockChainStorage implements BlockChainStorage {
    /**
     * Initializes a new instance of that class.
     *
     * @param {string} rootDirectory The root directory.
     */
    public constructor(
        public readonly rootDirectory: string
    ) { }

    /** @inheritdoc */
    public addBlock(block: ChainBlock, chain: BlockChain) {
        return this.queue.add(async () => {
            try {
                const CHAIN_DIR = this.getChainRoot(chain.name);
                if (false !== CHAIN_DIR) {
                    if (fs.existsSync(CHAIN_DIR)) {
                        const LATEST_BLOCK = await getLatestBlockFile(CHAIN_DIR);
                        if (false !== LATEST_BLOCK) {
                            if (fs.existsSync(LATEST_BLOCK.path)) {
                                const LATEST_BLOCK_CONTENT = await LATEST_BLOCK.getBlockFile();
                                if (false !== LATEST_BLOCK_CONTENT) {
                                    block.chain = chain;
                                    block.index = LATEST_BLOCK.index + 1;
                                    block.previousHash = new Buffer(
                                        LATEST_BLOCK_CONTENT.hash.trim(),
                                        'base64'
                                    );

                                    await saveBlock(
                                        block,
                                        path.join(
                                            CHAIN_DIR, `${ block.index }.json`
                                        ),
                                    );
                                }
                            }
                        }
                    }
                }
            } catch { }

            return false;
        });
    }

    /** @inheritdoc */
    public createChain(name: string): Promise<CreateChainResult> {
        return this.queue.add(async () => {
            try {
                const CHAIN_DIR = this.getChainRoot(name);
                if (false !== CHAIN_DIR) {
                    if (!fs.existsSync(CHAIN_DIR)) {
                        await fs.mkdirs(CHAIN_DIR);

                        // genesis block
                        await saveBlock(
                            BlockChainBlock.createGenesis(),
                            path.join(
                                CHAIN_DIR, '0.json'
                            )
                        );

                        const CHAIN = new BlockChain();
                        CHAIN.name = normalizeChainName(name);
                        CHAIN.setStorage(this);

                        return CHAIN;
                    }
                }
            } catch { }

            return false;
        });
    }

    /** @inheritdoc */
    public getChain(name: string): Promise<GetChainResult> {
        return this.queue.add(async () => {
            try {
                const CHAIN_DIR = this.getChainRoot(name);
                if (false !== CHAIN_DIR) {
                    if (fs.existsSync(CHAIN_DIR)) {
                        const CHAIN = new BlockChain();
                        CHAIN.name = normalizeChainName(name);
                        CHAIN.setStorage(this);

                        return CHAIN;
                    }
                }
            } catch { }

            return false;
        });
    }

    public getChainRoot(name: string) {
        name = normalizeChainName(name);
        if ('' !== name) {
            return path.resolve(
                path.join(
                    this.getStorageRoot(), name
                )
            );
        }

        return false;
    }

    /** @inheritdoc */
    public getIterator(chain: BlockChain, offset?: number): BlockChainIterator {
        return new FileIterator(
            this, chain, offset
        );
    }

    private getStorageRoot() {
        let rootDir = this.rootDirectory;
        if (egoose.isEmptyString(rootDir)) {
            rootDir = process.cwd();
        }

        if (!path.isAbsolute(rootDir)) {
            rootDir = path.join(
                process.cwd(),
                rootDir
            );
        }

        return path.resolve(
            rootDir
        );
    }

    /**
     * The queue that is used for file system operations.
     */
    public readonly queue = new pQueue({
        concurrency: 1,
    });
}

async function getLatestBlockFile(chainDir: string) {
    return egoose.from(
        await fs.readdir(chainDir)
    ).where(x => REGEX_BLOCK_FILE.test(x))
     .select(x => {
        return {
            getBlockFile: async function() {
                try {
                    if (fs.existsSync(this.path)) {
                        const CONTENT: BlockFile = JSON.parse(
                            await fs.readFile(
                                this.path, 'utf8'
                            )
                        );

                        if (_.isObjectLike(CONTENT)) {
                            if (_.isNil(JSON_SCHEMA_BLOCK_FILE.validate(CONTENT).error)) {
                                return CONTENT;
                            }
                        }
                    }
                } catch { }

                return false;
            },
            index: parseInt(
                x.substr(
                    0, x.indexOf('.')
                ).trim()
            ),
            path: path.resolve(
                path.join(
                    chainDir, x
                )
            )
        };
    }).where(x => !isNaN(x.index))
      .where(x => x.index >= 0)
      .orderByDescending(x => x.index)
      .firstOrDefault(x => true, false);
}

function normalizeChainName(name: any) {
    return sanitizeFilename(
        egoose.normalizeString(
            name
        )
    );
}

async function saveBlock(block: ChainBlock, file: string) {
    try {
        if (!fs.existsSync(file)) {
            const CONTENT: BlockFile = {
                data: block.data.toString('base64'),
                hash: block.hash.toString('base64'),
                index: block.index,
                previousHash: block.previousHash.toString('base64'),
                timestamp: block.timestamp,
            };

            await fs.writeFile(
                file,
                JSON.stringify(CONTENT, null, 2),
                'utf8'
            );

            return true;
        }
    } catch { }

    return false;
}
