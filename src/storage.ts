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

import { ChainBlock } from './block';
import { BlockChain } from './chain';

/**
 * A block chain iterator.
 */
export interface BlockChainIterator {
    /**
     * Gets the current item.
     */
    readonly current: BlockChainIteratorItem;

    /**
     * Returns the next item.
     *
     * @return {BlockChainIteratorItem|PromiseLike<BlockChainIteratorItem>} The result with the next item.
     */
    next(): BlockChainIteratorItem | PromiseLike<BlockChainIteratorItem>;
}

/**
 * A possible value of an block chain iterator item.
 */
export type BlockChainIteratorItem = ChainBlock | false;

/**
 * A possible value of a 'BlockChainStorage.createChain()' call.
 */
export type CreateChainResult = BlockChain | false;

/**
 * A possible value of a 'BlockChainStorage.getChain()' call.
 */
export type GetChainResult = BlockChain | false;

/**
 * A block chain storage.
 */
export interface BlockChainStorage {
    /**
     * Adds a block to the storage.
     *
     * @param {ChainBlock} block The block to add.
     * @param {BlockChain} chain The underlying chain.
     *
     * @return {boolean|PromiseLike<boolean>} The result that indicates if operation was successful or not.
     */
    addBlock(block: ChainBlock, chain: BlockChain): boolean | PromiseLike<boolean>;

    /**
     * Creates a new chain.
     *
     * @param {string} name The name of the new chain.
     *
     * @return {CreateChainResult|PromiseLike<CreateChainResult} The result with the new chain or (false) if it already exists.
     */
    createChain(name: string): CreateChainResult | PromiseLike<CreateChainResult>;

    /**
     * Returns an existing block chain.
     *
     * @param {string} name The name of the chain.
     *
     * @return {GetBlockChainResult|PromiseLike<GetBlockChainResult} The result with the chain or (false) if not found.
     */
    getChain(name: string): GetChainResult | PromiseLike<GetChainResult>;

    /**
     * Returns the iterator for iterating the storage.
     *
     * @param {number} [offset] The zero based index to start from.
     *
     * @return {BlockChainIterator} The (block) iterator.
     */
    getIterator(offset?: number): BlockChainIterator;
}
