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

import * as express from 'express';
import { ChainBlock } from './block';
import { BlockChain } from './chain';

/**
 * Arguments for a block chain API event.
 */
export interface BlockChainApiEventArguments {
    /**
     * The request.
     */
    request: express.Request;
    /**
     * The response.
     */
    response: express.Response;
}

/**
 * Arguments for an event that is invoked AFTER a block chain has been created successfully.
 */
export interface BlockChainCreatedApiEventArguments extends BlockChainApiEventArguments {
    /**
     * The new chain.
     */
    chain: BlockChain;
}

/**
 * Arguments for an event that prepares a chain block for returning it.
 */
export interface ReturnBlockApiEventArguments extends BlockChainApiEventArguments {
    /**
     * The original chain.
     */
    block: ChainBlock;
    /**
     * The underlying chain.
     */
    chain: BlockChain;
    /**
     * The input object to return.
     */
    input: any;
    /**
     * The output object. This is (false) and indicates to return 'input'.
     * If not (false), that value is returned.
     */
    output: any;
}

/**
 * Arguments for an event that prepares chain block data for returning it.
 */
export interface ReturnBlockDataApiEventArguments extends BlockChainApiEventArguments {
    /**
     * The original chain.
     */
    block: ChainBlock;
    /**
     * The underlying chain.
     */
    chain: BlockChain;
    /**
     * The input data to return.
     */
    input: any;
    /**
     * The output data. This is (false) and indicates to return 'input'.
     * If not (false), that value is returned.
     */
    output: any;
}

/**
 * An event module for a block chain API (call).
 */
export interface BlockChainApiEventModule {
    /**
     * Is invoked after a block chain has been created.
     *
     * @param {BlockChainCreatedApiEventArguments} args The arguments for the event.
     */
    onBlockChainCreated?: (
        args: BlockChainCreatedApiEventArguments,
    ) => void | PromiseLike<void>;
    /**
     * Event to prepare an input object for returning it.
     *
     * @param {ReturnBlockApiEventArguments} args The arguments for the event.
     */
    onReturnBlock?: (
        args: ReturnBlockApiEventArguments,
    ) => void | PromiseLike<void>;
    /**
     * Event to prepare an input object for returning it.
     *
     * @param {ReturnBlockDataApiEventArguments} args The arguments for the event.
     */
    onReturnBlockData?: (
        args: ReturnBlockDataApiEventArguments,
    ) => void | PromiseLike<void>;
}
