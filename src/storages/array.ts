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
import { BlockChainBlock, ChainBlock } from "../block";
import { BlockChainIterator, BlockChainIteratorItem, BlockChainStorage, CreateChainResult, GetChainResult } from "../storage";
import { BlockChain } from "../chain";

class ArrayIterator implements BlockChainIterator {
    private _index: number;

    public constructor(
        private readonly _ARRAY: ChainBlock[],
        private readonly _OFFSET: number,
    ) {
        if (isNaN(this._OFFSET)) {
            this._OFFSET = 0;
        }

        this._index = this._OFFSET - 1;
    }

    public get current(): BlockChainIteratorItem {
        return this._ARRAY[
            this._index
        ];
    }

    public next(): BlockChainIteratorItem  {
        const NEW_INDEX = ++this._index;

        if (NEW_INDEX >= this._ARRAY.length) {
            return false;
        }

        return this._ARRAY[NEW_INDEX];
    }
}

/**
 * A block chain storage based on an array.
 */
export class ArrayBlockChainStorage implements BlockChainStorage {
    private readonly _BLOCKS: ChainBlock[] = [
        BlockChainBlock.createGenesis()
    ];
    private readonly _CHAIN: { [name: string]: BlockChain } = {};

    /** @inheritdoc */
    public addBlock(block: ChainBlock, chain: BlockChain) {
        const LATEST_BLOCK = this.getLatestBlock();

        block.chain = chain;
        block.index = LATEST_BLOCK.index + 1;
        block.previousHash = LATEST_BLOCK.hash;

        this._BLOCKS
            .push(block);

        return true;
    }

    /** @inheritdoc */
    public createChain(name: string): CreateChainResult {
        name = normalizeChainName(name);

        let chain = this._CHAIN[name];
        if (!_.isNil(chain)) {
            return false;
        }

        chain = new BlockChain();
        chain.name = name;

        return this._CHAIN[name] = chain;
    }

    /** @inheritdoc */
    public getChain(name: string): GetChainResult {
        name = normalizeChainName(name);

        let chain = this._CHAIN[name];
        if (_.isNil(chain)) {
            return false;
        }

        return chain;
    }

    /** @inheritdoc */
    public getIterator(chain: BlockChain, offset?: number): BlockChainIterator {
        return new ArrayIterator(
            this._BLOCKS, offset
        );
    }

    private getLatestBlock() {
        return this._BLOCKS[
            this._BLOCKS.length - 1
        ];
    }
}

function normalizeChainName(name: any) {
    return egoose.normalizeString(
        name
    );
}
