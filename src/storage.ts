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

import { BlockChainBlock } from './block';
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
export type BlockChainIteratorItem = BlockChainBlock | false;

/**
 * A block chain storage.
 */
export interface BlockChainStorage {
    /**
     * Adds a block to the storage.
     *
     * @param {BlockChainBlock} block The block to add.
     */
    addBlock(block: BlockChainBlock): void | PromiseLike<void>;

    /**
     * Returns a block chain.
     *
     * @param {string} name The name of the chain.
     * @param {boolean} [autoCreate] Create if nor exist.
     *
     * @return {BlockChain|PromiseLike<BlockChain} The result with the (new) chain.
     */
    getChain(name: string, autoCreate?: boolean): BlockChain | PromiseLike<BlockChain>;

    /**
     * Returns the iterator for iterating the storage.
     *
     * @param {number} [limit] The maximum number of items to return.
     *
     * @return {BlockChainIterator} The (block) iterator.
     */
    getIterator(offset?: number): BlockChainIterator;
}
