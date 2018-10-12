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
import * as mongoose from 'mongoose';
import { ChainBlock, BlockChainBlock } from "../block";
import { BlockChainIterator, BlockChainIteratorItem, BlockChainStorage, CreateChainResult, GetChainResult } from "../storage";
import { BlockChain } from "../chain";

/**
 * A document from 'blockchainblocks' collection.
 */
export interface BlockChainBlockMongoDocument extends mongoose.Document {
    /**
     * The id of the underlying chain.
     */
    chain: string;
    /**
     * The data.
     */
    data: Buffer;
    /**
     * The hash.
     */
    hash: Buffer;
    /**
     * The zero based index.
     */
    index: number;
    /**
     * The hash of the previous block.
     */
    previousHash: Buffer;
    /**
     * The timestamp.
     */
    timestamp: string;
}

/**
 * A document from 'blockchains' collection.
 */
export interface BlockChainMongoDocument extends mongoose.Document {
    /**
     * The name of the chain.
     */
    name: string;
}

class MongoIterator implements BlockChainIterator {
    private _current: BlockChainIteratorItem;
    private _index: number;

    public constructor(
        private readonly _STORAGE: MongoBlockChainStorage,
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

    public async next(): Promise<BlockChainIteratorItem>  {
        let newCurrent: BlockChainIteratorItem;

        try {
            newCurrent = await this._STORAGE.withDatabase(async (db) => {
                const NEW_INDEX = ++this._index;
                const CHAIN_NAME = normalizeChainName(this._CHAIN.name);

                const CHAIN_DOC = await db.BlockChains
                    .findOne({ name: CHAIN_NAME })
                    .exec();

                if (!_.isNil(CHAIN_DOC)) {
                    const BLOCK_DOC = await db.BlockChainBlocks
                        .findOne({
                            index: NEW_INDEX,
                            chain: egoose.toStringSafe(CHAIN_DOC._id),
                        }).exec();

                    if (!_.isNil(BLOCK_DOC)) {
                        return {
                            chain: this._CHAIN,
                            data: BLOCK_DOC.data,
                            hash: BLOCK_DOC.hash,
                            index: BLOCK_DOC.index,
                            previousHash: BLOCK_DOC.previousHash,
                            timestamp: BLOCK_DOC.timestamp,
                        };
                    }
                }

                return false;
            });
        } catch {
            newCurrent = false;
        }

        this._current = newCurrent;
        return newCurrent;
    }
}

/**
 * A block chain storage based on a Mongo Database connection.
 */
export class MongoBlockChainStorage implements BlockChainStorage {
    /**
     * Initializes a new instance of that class.
     *
     * @param {Function} databaseCreator A function that returns a new database connection.
     */
    public constructor(
        public readonly databaseCreator: () => BlockChainMongoDatabase
    ) { }

    /** @inheritdoc */
    public async addBlock(block: ChainBlock, chain: BlockChain): Promise<boolean> {
        try {
            const CHAIN_NAME = normalizeChainName(chain.name);
            return await this.withDatabase(async (db) => {
                const CHAIN_DOC = await db.BlockChains
                    .findOne({ name: CHAIN_NAME })
                    .exec();

                if (!_.isNil(CHAIN_DOC)) {
                    const LATEST_BLOCK = await this.getLatestBlock(db, CHAIN_DOC._id);

                    if (!_.isNil(LATEST_BLOCK)) {
                        block.chain = chain;
                        block.index = LATEST_BLOCK.index + 1;
                        block.previousHash = LATEST_BLOCK.hash;

                        await addBlock(
                            db,
                            egoose.toStringSafe(CHAIN_DOC._id), block,
                        );

                        return true;
                    }
                }

                return false;
            });
        } catch { }

        return false;
    }

    /** @inheritdoc */
    public async createChain(name: string): Promise<CreateChainResult> {
        try {
            name = normalizeChainName(name);
            if ('' !== name) {
                return await this.withDatabase(async (db) => {
                    const DOC = await db.BlockChains
                        .findOne({ name: name })
                        .exec();

                    if (_.isNil(DOC)) {
                        const NEW_CHAIN_DOC = (await db.BlockChains
                            .insertMany([
                                { name: name }
                            ])
                        )[0];

                        const CHAIN = new BlockChain();
                        CHAIN.name = NEW_CHAIN_DOC.name;
                        CHAIN.setStorage(this);

                        // Genesis block
                        await addBlock(
                            db,
                            egoose.toStringSafe(NEW_CHAIN_DOC._id), BlockChainBlock.createGenesis(),
                        );

                        return CHAIN;
                    }

                    return false;
                });
            }
        } catch { }

        return false;
    }

    /** @inheritdoc */
    public async getChain(name: string): Promise<GetChainResult> {
        try {
            name = normalizeChainName(name);
            if ('' !== name) {
                const DOC = await this.withDatabase(async (db) => {
                    return db.BlockChains
                        .findOne({ name: name })
                        .exec();
                });

                if (!_.isNil(DOC)) {
                    const CHAIN = new BlockChain();
                    CHAIN.name = DOC.name;
                    CHAIN.setStorage(this);

                    return CHAIN;
                }
            }
        } catch { }

        return false;
    }

    /** @inheritdoc */
    public getIterator(chain: BlockChain, offset?: number): BlockChainIterator {
        return new MongoIterator(
            this, chain, offset
        );
    }

    private async getLatestBlock(
        db: BlockChainMongoDatabase, chainId: any
    ) {
        return await db.BlockChainBlocks
            .findOne({ chain: egoose.toStringSafe(chainId).trim() })
            .sort({ index: -1 })
            .exec();
    }

    /**
     * Invokes a transaction save action for a database connection.
     *
     * @param {Function} action The action to invoke.
     *
     * @return {TResult} The result of the action.
     */
    public async withDatabase<TResult = any>(
        action: (
            db: BlockChainMongoDatabase
        ) => TResult | PromiseLike<TResult>
    ) : Promise<TResult> {
        const DB = this.databaseCreator();
        await DB.connect();

        let result: TResult;

        try {
            const SESSION = await DB.mongo
                .startSession();
            try {
                await SESSION.startTransaction();

                result = await Promise.resolve(
                    action(
                        DB
                    )
                );

                await SESSION.commitTransaction();
            } catch (e) {
                await SESSION.abortTransaction();

                throw e;
            }
        } finally {
            await DB.disconnect();
        }

        return result;
    }
}

/**
 * A connection to a Mongo database with blockchain data.
 */
export class BlockChainMongoDatabase extends egoose.MongoDatabase {
    /**
     * Gets the 'blockchainblocks' collection.
     */
    public get BlockChainBlocks(): mongoose.Model<BlockChainBlockMongoDocument> {
        return this.model('BlockChainBlocks');
    }

    /**
     * Gets the 'blockchains' collection.
     */
    public get BlockChains(): mongoose.Model<BlockChainMongoDocument> {
        return this.model('BlockChains');
    }

    /** @inheritdoc */
    public static fromEnvironment(): BlockChainMongoDatabase {
        return new BlockChainMongoDatabase({
            database: process.env.MONGO_DB,
            host: process.env.MONGO_HOST,
            options: process.env.MONGO_OPTIONS,
            port: parseInt( process.env.MONGO_PORT ),
            password: process.env.MONGO_PASSWORD,
            user: process.env.MONGO_USER,
        });
    }
}

/**
 * Initializes the mongoose database schema.
 */
export function initMongoDatabaseSchema() {
    mongoose.set('useCreateIndex', true);

    egoose.MONGO_SCHEMAS['BlockChains'] = new mongoose.Schema({
        name: {
            lowercase: true,
            trim: true,
            type: String,
            unique: true,
        }
    });

    egoose.MONGO_SCHEMAS['BlockChainBlocks'] = new mongoose.Schema({
        chain: {
            type: String,
        },
        data: {
            type: Buffer,
        },
        hash: {
            type: Buffer,
        },
        index: {
            type: Number,
        },
        previousHash: {
            type: Buffer,
        },
        timestamp: {
            type: String,
        },
    });
    egoose.MONGO_SCHEMAS['BlockChainBlocks']
          .index({ chain: 1 });
    egoose.MONGO_SCHEMAS['BlockChainBlocks']
          .index({ chain: 1, index: 1 }, { unique: true });
}

async function addBlock(db: BlockChainMongoDatabase, chain: string, block: ChainBlock) {
    await db.BlockChainBlocks.insertMany([{
        chain: chain,
        data: block.data,
        hash: block.hash,
        index: block.index,
        previousHash: block.previousHash,
        timestamp: block.timestamp,
    }]);
}

function normalizeChainName(name: any) {
    return egoose.normalizeString(
        name
    );
}
