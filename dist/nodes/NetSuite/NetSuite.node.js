"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetSuite = void 0;
const util_1 = require("util");
const n8n_workflow_1 = require("n8n-workflow");
const NetSuite_node_types_1 = require("./NetSuite.node.types");
const NetSuite_node_options_1 = require("./NetSuite.node.options");
const NetSuiteClient_1 = require("../../NetSuiteClient");
const p_limit_1 = __importDefault(require("p-limit"));
const debug = (0, util_1.debuglog)('n8n-nodes-netsuite');
const handleNetsuiteResponse = (fns, response) => {
    debug(`Netsuite response:`, response.statusCode, response.body);
    let body = {};
    const { title: webTitle = undefined, 'o:errorCode': webCode, 'o:errorDetails': webDetails, message: restletMessage = undefined, } = response.body;
    if (!(response.statusCode && response.statusCode >= 200 && response.statusCode < 400)) {
        let message = webTitle || restletMessage || webCode || response.statusText;
        if (webDetails && webDetails.length > 0) {
            message = webDetails[0].detail || message;
        }
        if (fns.continueOnFail() !== true) {
            const error = new n8n_workflow_1.NodeApiError(fns.getNode(), response.body);
            error.message = message;
            throw error;
        }
        else {
            body = {
                error: message,
            };
        }
    }
    else {
        body = response.body;
        const requestOptions = response.request.options;
        if (requestOptions?.method && ['POST', 'PATCH', 'DELETE'].includes(requestOptions.method)) {
            body = typeof body === 'object' ? response.body : {};
            if (response.headers['x-netsuite-propertyvalidation']) {
                body.propertyValidation = response.headers['x-netsuite-propertyvalidation'].split(',');
            }
            if (response.headers['x-n-operationid']) {
                body.operationId = response.headers['x-n-operationid'];
            }
            if (response.headers['x-netsuite-jobid']) {
                body.jobId = response.headers['x-netsuite-jobid'];
            }
            if (response.headers['location']) {
                body.links = [
                    {
                        rel: 'self',
                        href: response.headers['location'],
                    },
                ];
                const locParts = response.headers['location'].split('/');
                const locId = locParts.pop() ?? null;
                if (locId !== null) {
                    body.id = locId;
                }
            }
            body.success = response.statusCode === 204;
        }
    }
    return { json: body };
};
const getConfig = (credentials) => ({
    netsuiteApiHost: credentials.hostname,
    consumerKey: credentials.consumerKey,
    consumerSecret: credentials.consumerSecret,
    netsuiteAccountId: credentials.accountId,
    netsuiteTokenKey: credentials.tokenKey,
    netsuiteTokenSecret: credentials.tokenSecret,
    netsuiteQueryLimit: 1000,
});
const makeRequest = async (credentials, requestOptions) => {
    const client = new NetSuiteClient_1.NetSuiteClient({
        hostname: credentials.hostname,
        accountId: credentials.accountId,
        consumerKey: credentials.consumerKey,
        consumerSecret: credentials.consumerSecret,
        tokenKey: credentials.tokenKey,
        tokenSecret: credentials.tokenSecret,
    });
    const path = requestOptions.nextUrl || requestOptions.path || '';
    const response = await client.request(path, requestOptions.method, requestOptions.body, requestOptions.query, requestOptions.headers);
    return {
        statusCode: response.statusCode,
        statusText: response.statusText,
        body: response.body,
        headers: response.headers,
        request: response.request,
    };
};
class NetSuite {
    description = NetSuite_node_options_1.nodeDescription;
    static getRecordType({ fns, itemIndex }) {
        let recordType = fns.getNodeParameter('recordType', itemIndex);
        if (recordType === 'custom') {
            recordType = fns.getNodeParameter('customRecordTypeScriptId', itemIndex);
        }
        return recordType;
    }
    static async listRecords(options) {
        const { fns, credentials, itemIndex } = options;
        const nodeContext = fns.getContext('node');
        const apiVersion = fns.getNodeParameter('version', itemIndex);
        const recordType = NetSuite.getRecordType(options);
        const returnAll = fns.getNodeParameter('returnAll', itemIndex);
        const query = fns.getNodeParameter('query', itemIndex);
        let limit = 100;
        let offset = 0;
        let hasMore = true;
        const method = 'GET';
        let nextUrl;
        const requestType = NetSuite_node_types_1.NetSuiteRequestType.Record;
        const params = new URLSearchParams();
        const returnData = [];
        let prefix = query ? `?${query}` : '';
        if (returnAll !== true) {
            prefix = query ? `${prefix}&` : '?';
            limit = fns.getNodeParameter('limit', itemIndex) || limit;
            offset = fns.getNodeParameter('offset', itemIndex) || offset;
            params.set('limit', String(limit));
            params.set('offset', String(offset));
            prefix += params.toString();
        }
        const requestData = {
            method,
            requestType,
            path: `services/rest/record/${apiVersion}/${recordType}${prefix}`,
        };
        nodeContext.hasMore = hasMore;
        nodeContext.count = limit;
        nodeContext.offset = offset;
        while ((returnAll || returnData.length < limit) && hasMore === true) {
            const response = await makeRequest(credentials, requestData);
            const body = handleNetsuiteResponse(fns, response);
            const { hasMore: doContinue, items, links, offset, count, totalResults } = body.json;
            if (doContinue) {
                nextUrl = (links.find((link) => link.rel === 'next') || {}).href;
                requestData.nextUrl = nextUrl;
            }
            if (Array.isArray(items)) {
                for (const json of items) {
                    if (returnAll || returnData.length < limit) {
                        returnData.push({ json });
                    }
                }
            }
            hasMore = doContinue && (returnAll || returnData.length < limit);
            nodeContext.hasMore = doContinue;
            nodeContext.count = count;
            nodeContext.offset = offset;
            nodeContext.totalResults = totalResults;
            if (requestData.nextUrl) {
                nodeContext.nextUrl = requestData.nextUrl;
            }
        }
        return returnData;
    }
    static async runSuiteQL(options) {
        const { fns, credentials, itemIndex } = options;
        const nodeContext = fns.getContext('node');
        const apiVersion = fns.getNodeParameter('version', itemIndex);
        const returnAll = fns.getNodeParameter('returnAll', itemIndex);
        const query = fns.getNodeParameter('query', itemIndex);
        let limit = 1000;
        let offset = 0;
        let hasMore = true;
        const method = 'POST';
        let nextUrl;
        const requestType = NetSuite_node_types_1.NetSuiteRequestType.SuiteQL;
        const params = new URLSearchParams();
        const returnData = [];
        const config = { ...credentials, netsuiteQueryLimit: limit };
        let prefix = '?';
        if (returnAll !== true) {
            limit = fns.getNodeParameter('limit', itemIndex) || limit;
            offset = fns.getNodeParameter('offset', itemIndex) || offset;
            params.set('offset', String(offset));
        }
        params.set('limit', String(limit));
        config.netsuiteQueryLimit = limit;
        prefix += params.toString();
        const requestData = {
            method,
            requestType,
            query: query,
            path: `services/rest/query/${apiVersion}/suiteql${prefix}`,
            headers: {
                'Content-Type': 'application/json',
                'Prefer': 'transient',
            },
        };
        nodeContext.hasMore = hasMore;
        nodeContext.count = limit;
        nodeContext.offset = offset;
        debug('requestData', requestData);
        while ((returnAll || returnData.length < limit) && hasMore === true) {
            const response = await makeRequest(config, requestData);
            const body = handleNetsuiteResponse(fns, response);
            const { hasMore: doContinue, items, links, count, totalResults, offset } = body.json;
            if (doContinue) {
                nextUrl = (links.find((link) => link.rel === 'next') || {}).href;
                requestData.nextUrl = nextUrl;
            }
            if (Array.isArray(items)) {
                for (const json of items) {
                    if (returnAll || returnData.length < limit) {
                        returnData.push({ json });
                    }
                }
            }
            hasMore = doContinue && (returnAll || returnData.length < limit);
            nodeContext.hasMore = doContinue;
            nodeContext.count = count;
            nodeContext.offset = offset;
            nodeContext.totalResults = totalResults;
            if (requestData.nextUrl) {
                nodeContext.nextUrl = requestData.nextUrl;
            }
        }
        return returnData;
    }
    static async getRecord(options) {
        const { item, fns, credentials, itemIndex } = options;
        const params = new URLSearchParams();
        const expandSubResources = fns.getNodeParameter('expandSubResources', itemIndex);
        const simpleEnumFormat = fns.getNodeParameter('simpleEnumFormat', itemIndex);
        const apiVersion = fns.getNodeParameter('version', itemIndex);
        const recordType = NetSuite.getRecordType(options);
        const internalId = fns.getNodeParameter('internalId', itemIndex);
        if (expandSubResources) {
            params.append('expandSubResources', 'true');
        }
        if (simpleEnumFormat) {
            params.append('simpleEnumFormat', 'true');
        }
        const q = params.toString();
        const requestData = {
            method: 'GET',
            requestType: NetSuite_node_types_1.NetSuiteRequestType.Record,
            path: `services/rest/record/${apiVersion}/${recordType}/${internalId}${q ? `?${q}` : ''}`,
        };
        const response = await makeRequest(credentials, requestData);
        if (item)
            response.body.orderNo = item.json.orderNo;
        return handleNetsuiteResponse(fns, response);
    }
    static async removeRecord(options) {
        const { fns, credentials, itemIndex } = options;
        const apiVersion = fns.getNodeParameter('version', itemIndex);
        const recordType = NetSuite.getRecordType(options);
        const internalId = fns.getNodeParameter('internalId', itemIndex);
        const requestData = {
            method: 'DELETE',
            requestType: NetSuite_node_types_1.NetSuiteRequestType.Record,
            path: `services/rest/record/${apiVersion}/${recordType}/${internalId}`,
        };
        const response = await makeRequest(credentials, requestData);
        return handleNetsuiteResponse(fns, response);
    }
    static async insertRecord(options) {
        const { fns, credentials, itemIndex, item } = options;
        const apiVersion = fns.getNodeParameter('version', itemIndex);
        const recordType = NetSuite.getRecordType(options);
        const query = item ? item.json : undefined;
        const requestData = {
            method: 'POST',
            requestType: NetSuite_node_types_1.NetSuiteRequestType.Record,
            path: `services/rest/record/${apiVersion}/${recordType}`,
        };
        if (query) {
            requestData.query = query;
        }
        const response = await makeRequest(credentials, requestData);
        return handleNetsuiteResponse(fns, response);
    }
    static async updateRecord(options) {
        const { fns, credentials, itemIndex, item } = options;
        const apiVersion = fns.getNodeParameter('version', itemIndex);
        const recordType = NetSuite.getRecordType(options);
        const internalId = fns.getNodeParameter('internalId', itemIndex);
        const query = item ? item.json : undefined;
        const requestData = {
            method: 'PATCH',
            requestType: NetSuite_node_types_1.NetSuiteRequestType.Record,
            path: `services/rest/record/${apiVersion}/${recordType}/${internalId}`,
        };
        if (query) {
            requestData.query = query;
        }
        const response = await makeRequest(credentials, requestData);
        return handleNetsuiteResponse(fns, response);
    }
    static async rawRequest(options) {
        const { fns, credentials, itemIndex, item } = options;
        const nodeContext = fns.getContext('node');
        let path = fns.getNodeParameter('path', itemIndex);
        const method = fns.getNodeParameter('method', itemIndex);
        const body = fns.getNodeParameter('body', itemIndex);
        const requestType = fns.getNodeParameter('requestType', itemIndex);
        const query = body || (item ? item.json : undefined);
        const nodeOptions = fns.getNodeParameter('options', 0);
        if (path && (path.startsWith('https://') || path.startsWith('http://'))) {
            const url = new URL(path);
            path = `${url.pathname.replace(/^\//, '')}${url.search || ''}`;
        }
        const requestData = {
            method,
            requestType,
            path,
        };
        if (query && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
            try {
                const parsedQuery = typeof query === 'string' ? JSON.parse(query) : query;
                if (typeof parsedQuery === 'string') {
                    requestData.query = parsedQuery;
                }
                else {
                    requestData.query = parsedQuery;
                }
            }
            catch {
                requestData.query = query;
            }
        }
        if (requestData.query?.query) {
            requestData.query = (requestData.query.query);
        }
        const response = await makeRequest(credentials, requestData);
        if (response.body) {
            nodeContext.hasMore = response.body.hasMore;
            nodeContext.count = response.body.count;
            nodeContext.offset = response.body.offset;
            nodeContext.totalResults = response.body.totalResults;
        }
        if (nodeOptions.fullResponse) {
            return {
                json: {
                    statusCode: response.statusCode,
                    headers: response.headers,
                    body: response.body,
                },
            };
        }
        else {
            return { json: response.body };
        }
    }
    async execute() {
        const credentials = (await this.getCredentials('netsuite'));
        const operation = this.getNodeParameter('operation', 0);
        const items = this.getInputData();
        const returnData = [];
        const promises = [];
        const options = this.getNodeParameter('options', 0);
        const concurrency = options.concurrency || 1;
        const limit = (0, p_limit_1.default)(concurrency);
        for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
            const item = items[itemIndex];
            let data;
            promises.push(limit(async () => {
                debug(`Processing ${operation} for ${itemIndex + 1} of ${items.length}`);
                if (operation === 'getRecord') {
                    data = await NetSuite.getRecord({ item, fns: this, credentials, itemIndex });
                }
                else if (operation === 'listRecords') {
                    data = await NetSuite.listRecords({ item, fns: this, credentials, itemIndex });
                }
                else if (operation === 'removeRecord') {
                    data = await NetSuite.removeRecord({ item, fns: this, credentials, itemIndex });
                }
                else if (operation === 'insertRecord') {
                    data = await NetSuite.insertRecord({ item, fns: this, credentials, itemIndex });
                }
                else if (operation === 'updateRecord') {
                    data = await NetSuite.updateRecord({ item, fns: this, credentials, itemIndex });
                }
                else if (operation === 'rawRequest') {
                    data = await NetSuite.rawRequest({ item, fns: this, credentials, itemIndex });
                }
                else if (operation === 'runSuiteQL') {
                    data = await NetSuite.runSuiteQL({ item, fns: this, credentials, itemIndex });
                }
                else {
                    const error = `The operation "${operation}" is not supported!`;
                    if (this.continueOnFail() !== true) {
                        throw new Error(error);
                    }
                    else {
                        data = { json: { error } };
                    }
                }
                return data;
            }));
        }
        const results = await Promise.all(promises);
        for await (const result of results) {
            if (result) {
                if (Array.isArray(result)) {
                    returnData.push(...result);
                }
                else {
                    returnData.push(result);
                }
            }
        }
        return [returnData];
    }
}
exports.NetSuite = NetSuite;
//# sourceMappingURL=NetSuite.node.js.map