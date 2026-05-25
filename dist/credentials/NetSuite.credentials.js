"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetSuite = void 0;
class NetSuite {
    name = 'netsuite';
    displayName = 'NetSuite';
    documentationUrl = 'netsuite';
    properties = [
        {
            displayName: 'Hostname',
            name: 'hostname',
            type: 'string',
            default: '',
            required: true,
        },
        {
            displayName: 'Account ID',
            name: 'accountId',
            type: 'string',
            default: '',
            required: true,
            description: 'NetSuite Account ID',
        },
        {
            displayName: 'Consumer Key',
            name: 'consumerKey',
            type: 'string',
            default: '',
            required: true,
        },
        {
            displayName: 'Consumer Secret',
            name: 'consumerSecret',
            type: 'string',
            typeOptions: {
                password: true,
            },
            default: '',
            required: true,
        },
        {
            displayName: 'Token Key',
            name: 'tokenKey',
            type: 'string',
            default: '',
            required: true,
        },
        {
            displayName: 'Token Secret',
            name: 'tokenSecret',
            type: 'string',
            typeOptions: {
                password: true,
            },
            default: '',
            required: true,
        },
    ];
}
exports.NetSuite = NetSuite;
//# sourceMappingURL=NetSuite.credentials.js.map