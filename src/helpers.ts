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
import { ChainBlock } from './block';
import { createHash } from 'crypto';

/**
 * Calculates the hash of a block.
 *
 * @param {ChainBlock} block The block from where to calculate the hash from.
 *
 * @return {Buffer} The hash.
 */
export function calculateBlockHash(block: ChainBlock): Buffer {
    return createHash('sha256')
        .update(new Buffer(block.index + "\n", 'utf8'))
        .update(block.previousHash).update(new Buffer("\n", 'utf8'))
        .update(new Buffer(block.timestamp + "\n", 'utf8'))
        .update(block.data)
        .digest();
}

/**
 * Checks if a block is valid with another block.
 *
 * @param {ChainBlock} block The block that is handled as "current" one.
 * @param {ChainBlock} prevBlock The instance that is handled as "previous" block.
 *
 * @return {boolean} Is valid or not.
 */
export function isBlockValidWith(block: ChainBlock, prevBlock: ChainBlock): boolean {
    if (!_.isNil(block) && !_.isNil(prevBlock)) {
        if (prevBlock !== block) {
            if (calculateBlockHash(block).equals(block.hash)) {
                if (block.previousHash.equals(prevBlock.hash)) {
                    return true;
                }
            }
        }
    }

    return false;
}
