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

#### Environment variables

You can set environment variables to setup the API.

| Name | Description |
| --- | --- |
| `APP_PORT` | Defines the TCP port, the service should run on. Default: `80` |
| `BLOCKCHAIN_API_KEY` | Defines the optional bearer token that is used to authorize all requests via `Authorization` HTTP header. |
| `BLOCKCHAIN_PATH` | If the storage saves blocks to the file system, this is the root path for all chains. |
| `BLOCKCHAIN_STORAGE` | The type of storage to use. Default: `memory` |

##### BLOCKCHAIN_API_KEY

Define variable:

```bash
export BLOCKCHAIN_API_KEY=lXBYlJeYGfk8fGoPWjEQ
```

Make a request:

```http
POST /api/v1/my_chain
Host: <API HOST>
Authorization: Bearer lXBYlJeYGfk8fGoPWjEQ

Lorem ispum
```

##### BLOCKCHAIN_STORAGE

###### Memory

Possible values:

* `mem`
* `memory`

###### File system

Possible values:

* `file`
* `files`
* `filesystem`
* `fs`
* `json`

Example:

```bash
export BLOCKCHAIN_STORAGE=files
export BLOCKCHAIN_PATH=./chains
```

### API

#### v1

##### [POST] /

Creates a new block chain.

Request:

```http
POST /api/v1/
Host: <API HOST>
Content-Type: application/json; charset=utf-8

{
    "name": "My chain"
}
```

Response: 

```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

{
    "name": "my_chain",
    "resource": "/api/v1/my_chain"
}
```

##### [POST] /:chain_name

Adds a block to an existing chain.

Request:

```http
POST /api/v1/my_chain
Host: <API HOST>

Lorem ispum
```

Response: 

```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

{
  "hash": "S4CvY55kkHRb0iRlbmTmzMHCxlad+1Opz0BJZ6rek5Y=",
  "index": 1,
  "previousHash": "geD/z7a0wvbR2oQ+8cHGFSZub5L39ILxvOd+Egou1Ok=",
  "resource": "/api/v1/my_chain/1",
  "timestamp": "2018-10-09T14:50:10.000Z"
}
```

##### [GET] /:chain_name

Gets a list of blocks.

You can submit optional query parameters `o` (offset) and/or `l` (limit) to control the result.

Request:

```http
GET /api/v1/my_chain?o=1&l=20
Host: <API HOST>
```

Response:

```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

{
  "blocks": [
    {
      "hash": "S4CvY55kkHRb0iRlbmTmzMHCxlad+1Opz0BJZ6rek5Y=",
      "index": 1,
      "isValid": true,
      "previousHash": "geD/z7a0wvbR2oQ+8cHGFSZub5L39ILxvOd+Egou1Ok=",
      "resource": "/api/v1/my_chain/1",
      "timestamp": "2018-10-09T14:50:10.000Z"
    },
    {
      "hash": "ggNsImfB4TxttrGeDRfsLIai8kfpcQxn9dVMLGyZObA=",
      "index": 2,
      "isValid": true,
      "previousHash": "S4CvY55kkHRb0iRlbmTmzMHCxlad+1Opz0BJZ6rek5Y=",
      "resource": "/api/v1/my_chain/2",
      "timestamp": "2018-10-09T14:52:34.000Z"
    }
  ],
  "offset": 1
}
```

##### [GET] /:chain_name/:index

Returns the data of a block.

Request:

```http
GET /api/v1/my_chain/1
Host: <API HOST>
```

Response:

```http
HTTP/1.1 200 OK
Content-Type: application/octet-stream

Lorem ipsum
```

This can also return a response with code `204`, if data is empty.
