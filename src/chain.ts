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
import { ArrayBlockChainStorage } from './storages/array';
import { BlockChainBlock } from './block';
import { BlockChainStorage, BlockChainIterator } from './storage';
import * as uuid from 'uuid';

/**
 * The action for an 'BlockChain.each()' method.
 *
 * @param {BlockChainEachActionContext} context The context for the current item.
 */
export type BlockChainEachAction = (context: BlockChainEachActionContext) => void | PromiseLike<void>;

/**
 * Context for the current item of an 'BlockChain.each()' method call.
 */
export interface BlockChainEachActionContext {
    /**
     * The current block.
     */
    block: BlockChainBlock;

    /**
     * Marks the operation as 'cancelled'.
     *
     * @param {boolean} [flag] Optional 'cancel flag'.
     */
    cancel: (flag?: boolean) => void;

    /**
     * The zero based index of the operation, NOT the block.
     */
    index: number;
}

/**
 * A block chain.
 */
export class BlockChain {
    private _storage: BlockChainStorage = new ArrayBlockChainStorage();

    /**
     * Initializes a new instance of that class.
     */
    public constructor() {
        this.name = `${
            uuid().split('-').join()
        }`;
    }

    /**
     * Adds a block to the underlying storage.
     *
     * @param {BlockChainBlock} block The block to add.
     */
    public addBlock(block: BlockChainBlock) {
        return Promise.resolve(
            this._storage
                .addBlock(block)
        );
    }

    /**
     * Iterates over the blocks of that chain.
     *
     * @param {BlockChainEachAction} action The action to invoke for the current item.
     * @param {number} [offset] The optional, zero-based offset.
     *
     * @return {Promise<boolean>} The promise that indicates if operation has been cancelled or not.
     */
    public async each(action: BlockChainEachAction, offset?: number): Promise<boolean> {
        let i = -1;
        let cancelled = false;

        const ITERATOR = this._storage.getIterator(offset);
        while (!cancelled) {
            ++i;

            const CURRENT_BLOCK = await ITERATOR.next();
            if (false === CURRENT_BLOCK) {
                break;
            }

            await action({
                block: CURRENT_BLOCK,
                cancel: function (flag?) {
                    if (arguments.length < 1) {
                        flag = true;
                    }

                    cancelled = !!flag;
                },
                index: i,
            });
        }

        return cancelled;
    }

    /**
     * Returns the iterator for iterating the storage.
     *
     * @param {number} [limit] The maximum number of items to return.
     *
     * @return {BlockChainIterator} The (block) iterator.
     */
    public getIterator(offset?: number): BlockChainIterator {
        return this._storage
            .getIterator(offset);
    }

    /**
     * The name of that block chain.
     */
    public name: string;

    /**
     * Sets a storage.
     *
     * @param {BlockChainStorage} storage The storage.
     *
     * @return this
     */
    public setStorage(storage: BlockChainStorage): this {
        this._storage = storage;

        return this;
    }

    /**
     * Validates the chain.
     *
     * @return {Promise<boolean>} The promise that indicates if chain is valid or not.
     */
    public async validate(): Promise<boolean> {
        let isValid = true;
        let prevBlock: BlockChainBlock | false = false;

        await this.each(async (context) => {
            try {
                if (false !== prevBlock) {
                    if (!context.block.calculateHash().equals(context.block.hash)) {
                        isValid = false;
                        context.cancel();

                        return;
                    }

                    if (!context.block.previousHash.equals(prevBlock.hash)) {
                        isValid = false;
                        context.cancel();

                        return;
                    }
                }
            } finally {
                prevBlock = context.block;
            }
        }, 0);

        return isValid;
    }
}
