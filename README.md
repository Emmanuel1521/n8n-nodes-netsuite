# @custom/n8n-netsuite

An n8n community node package for NetSuite REST API integration.

## What it does

- Adds a `NetSuite` node to n8n
- Supports credential-based token authentication for NetSuite REST
- Includes record operations for `get`, `search`, `create`, `update`, and `delete`

## Installation

Install the package in your n8n root directory:

```bash
npm install @custom/n8n-netsuite
```

If using n8n Docker, install it in the container's n8n directory before startup.

## Configuration

Create new NetSuite credentials inside n8n with:

- Hostname
- Account ID
- Consumer Key
- Consumer Secret
- Token Key
- Token Secret

Then add a NetSuite node to a workflow and configure the operation and record type.

## Development

```bash
npm install
npm run build
```

## Build output

The package is compiled to `dist/` and exports:

- `dist/nodes/NetSuite/NetSuite.node.js`
- `dist/credentials/NetSuite.credentials.js`

## Notes

This is a starter implementation. You can extend it with additional NetSuite resources, finer-grained options, and advanced REST authentication support.
