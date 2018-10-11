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
import * as api_v1 from './api/v1';
import * as egoose from '@egodigital/egoose';
import * as express from 'express';
import { BlockChainStorage } from './storage';
import { ArrayBlockChainStorage } from './storages/array';
import { FileBlockChainStorage } from './storages/fs';

(async () => {
    const APP = express();

    const BLOCKCHAIN_STORAGE = egoose.normalizeString(
        process.env.BLOCKCHAIN_STORAGE
    );

    const BLOCKCHAIN_API_KEY = egoose.toStringSafe(
        process.env.BLOCKCHAIN_API_KEY
    ).trim();

    let storage: BlockChainStorage | false = false;
    switch (BLOCKCHAIN_STORAGE) {
        case '':
        case 'mem':
        case 'memory':
            storage = new ArrayBlockChainStorage();
            break;

        case 'file':
        case 'files':
        case 'filesystem':
        case 'fs':
        case 'json':
            storage = new FileBlockChainStorage(
                egoose.toStringSafe(
                    process.env.BLOCKCHAIN_PATH
                )
            );
            break;
    }

    if (false === storage) {
        throw new Error(`Storage '${ BLOCKCHAIN_STORAGE }' is not suppoted!`);
    }

    APP.use((req, res, next) => {
        res.header('X-Powered-By', 'e.GO Digital GmbH, Aachen, Germany');
        res.header('X-Tm-Mk', '1979-09-05 23:09');

        return next();
    });

    APP.use((req, res, next) => {
        if ('' === BLOCKCHAIN_API_KEY) {
            return next();
        }

        const AUTHORIZATION = egoose.toStringSafe(
            req.headers['authorization']
        ).trim();
        if (AUTHORIZATION.toLowerCase().startsWith('bearer ')) {
            if (AUTHORIZATION.substr(7).trim() === BLOCKCHAIN_API_KEY) {
                return next();
            }
        }

        return res.status(401)
            .send();
    });

    // v1
    {
        const v1 = express.Router();

        api_v1.init(
            v1, storage,
        );

        APP.use('/api/v1', v1);
    }

    let port = parseInt(
        egoose.toStringSafe(process.env.APP_PORT)
            .trim()
    );
    if (isNaN(port)) {
        port = 80;
    }

    APP.listen(port);
})();