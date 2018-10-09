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

import { createHash } from 'crypto';
import * as _ from 'lodash';
import * as moment from 'moment';

/**
 * Moment.js format for a timestamp string.
 */
export const TIMESTAMP_FORMAT = 'YYYYMMDDHHmmss';

/**
 * A block of a block chain.
 */
export class BlockChainBlock {
    private _data: Buffer;
    private _hash: Buffer;
    private _index = 0;
    private _previousHash: Buffer;
    private _timestamp: string;

    /**
     * Initializes a new instance of that class.
     *
     * @param {Buffer|string} data The data of the block.
     * @param {moment.Moment} [time] The (optional) timestamp.
     */
    public constructor(data: Buffer | string, time?: moment.Moment) {
        this._previousHash = new Buffer('TM');

        if (_.isNil(data)) {
            data = Buffer.alloc(0);
        } else if (_.isString(data)) {
            data = new Buffer(data, 'utf8');
        }
        this._data = data;

        if (_.isNil(time)) {
            time = moment.utc();
        } else {
            if (!time.isUTC()) {
                time = time.utc();
            }
        }

        this._timestamp = time.format(TIMESTAMP_FORMAT);

        this.updateHash();
    }

    /**
     * Calculates the hash of that block.
     *
     * @return {Buffer} The calulated hash.
     */
    public calculateHash(): Buffer {
        return createHash('sha256')
            .update(new Buffer(this.index + "\n", 'utf8'))
            .update(this.previousHash).update(new Buffer("\n", 'utf8'))
            .update(new Buffer(this.timestamp + "\n", 'utf8'))
            .update(this.data)
            .digest();
    }

    /**
     * Creates a new genesis block.
     *
     * @return {BlockChainBlock} The new block.
     */
    public static createGenesis(): BlockChainBlock {
        const BLOCK = new BlockChainBlock(
            new Buffer('TM', 'utf8'),
            moment.utc('19790905230900', TIMESTAMP_FORMAT),
        );

        BLOCK.index = 0;
        BLOCK.previousHash = new Buffer('MK', 'utf8');

        return BLOCK;
    }

    /**
     * Gets the data of the block.
     */
    public get data(): Buffer {
        return this._data;
    }

    /**
     * Gets the hash of the block.
     */
    public get hash(): Buffer {
        return this._hash;
    }

    /**
     * Gets or sets the zero based index.
     */
    public get index(): number {
        return this._index;
    }
    public set index(newValue: number) {
        this._index = newValue;

        this.updateHash();
    }

    /**
     * Compares that block with another, and handles that as previous block.
     *
     * @param {BlockChainBlock} preBlock The instance that is handled as previous block.
     *
     * @return {boolean} Is valid or not.
     */
    public isValidWith(prevBlock: BlockChainBlock): boolean {
        if (prevBlock !== this) {
            if (this.calculateHash().equals(this.hash)) {
                if (this.previousHash.equals(prevBlock.hash)) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Gets or sets the hash of the previous block.
     */
    public get previousHash(): Buffer {
        return this._previousHash;
    }
    public set previousHash(newValue: Buffer) {
        this._previousHash = newValue;

        this.updateHash();
    }

    /**
     * Gets the timestamp.
     */
    public get timestamp(): string {
        return this._timestamp;
    }

    private updateHash() {
        this._hash = this.calculateHash();
    }
}
