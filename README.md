# blockchain-api

A RESTful API for using a simple blockchain.

## Usage

### Install

Run

```bash
npm install
```

from your project folder.

### Run

Execute

```bash
npm start
```

to start the API service.

This will store all data in memory and will be lost, when shutting down.

### Environment variables

You can set environment variables to setup the API.

| Name | Description |
| --- | --- |
| `APP_PORT` | Defines the TCP port, the service should run on. Default: `80` |
| `BLOCKCHAIN_STORAGE` | The type of storage to use. Default: `memory` |
