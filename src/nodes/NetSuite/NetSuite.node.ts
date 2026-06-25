import { debuglog } from 'util';
import {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
	NodeApiError,
} from 'n8n-workflow';

import {
	INetSuiteCredentials,
	INetSuiteOperationOptions,
	INetSuitePagedBody,
	INetSuiteRequestOptions,
	INetSuiteResponse,
	INetSuiteResponseBody,
	NetSuiteRequestType,
} from './NetSuite.node.types';

import {
	nodeDescription,
} from './NetSuite.node.options';

import { NetSuiteClient } from '../../NetSuiteClient';

import pLimit from '../../utils/pLimit';

const debug = debuglog('n8n-nodes-netsuite');

const handleNetsuiteResponse = (fns: IExecuteFunctions, response: INetSuiteResponse, itemIndex: number): INodeExecutionData => {
	debug(`Netsuite response:`, response.statusCode, response.body);
	let body: JsonObject = {};
	const bodyObj = (typeof response.body === 'string' ? { message: response.body } : response.body) as INetSuiteResponseBody;
	const {
		title: webTitle = undefined,
		'o:errorCode': webCode,
		'o:errorDetails': webDetails,
		message: restletMessage = undefined,
	} = bodyObj;
	if (!(response.statusCode && response.statusCode >= 200 && response.statusCode < 400)) {
		let message = webTitle || restletMessage || webCode || response.statusText;
		if (webDetails && webDetails.length > 0) {
			message = webDetails[0].detail || message;
		}
		const error = new NodeApiError(fns.getNode(), bodyObj);
		error.message = message;
		if (fns.continueOnFail(error)) {
			return { json: { error: message }, pairedItem: { item: itemIndex } };
		}
		throw error;
	} else {
		body = bodyObj;
		const requestOptions = response.request.options as { method?: string } | null;
		if (requestOptions?.method && ['POST', 'PATCH', 'DELETE'].includes(requestOptions.method)) {
			body = bodyObj;
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

const getConfig = (credentials: INetSuiteCredentials) => ({
	netsuiteApiHost: credentials.hostname,
	consumerKey: credentials.consumerKey,
	consumerSecret: credentials.consumerSecret,
	netsuiteAccountId: credentials.accountId,
	netsuiteTokenKey: credentials.tokenKey,
	netsuiteTokenSecret: credentials.tokenSecret,
	netsuiteQueryLimit: 1000,
});

const makeRequest = async (credentials: INetSuiteCredentials, requestOptions: INetSuiteRequestOptions): Promise<INetSuiteResponse> => {
	const client = new NetSuiteClient({
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

export class NetSuite implements INodeType {
	description: INodeTypeDescription = nodeDescription;

	static getRecordType({ fns, itemIndex }: INetSuiteOperationOptions): string {
		let recordType = fns.getNodeParameter('recordType', itemIndex) as string;
		if (recordType === 'custom') {
			recordType = fns.getNodeParameter('customRecordTypeScriptId', itemIndex) as string;
		}
		return recordType;
	}

	static async listRecords(options: INetSuiteOperationOptions): Promise<INodeExecutionData[]> {
		const { fns, credentials, itemIndex } = options;
		const nodeContext = fns.getContext('node');
		const apiVersion = fns.getNodeParameter('version', itemIndex) as string;
		const recordType = NetSuite.getRecordType(options);
		const returnAll = fns.getNodeParameter('returnAll', itemIndex) as boolean;
		const query = fns.getNodeParameter('query', itemIndex) as string;
		let limit = 100;
		let offset = 0;
		let hasMore = true;
		const method = 'GET';
		let nextUrl;
		const requestType = NetSuiteRequestType.Record;
		const returnData: INodeExecutionData[] = [];
		const queryParams: Record<string, string> = {};
		if (query) {
			new URLSearchParams(query).forEach((v, k) => { queryParams[k] = v; });
		}
		if (returnAll !== true) {
			limit = fns.getNodeParameter('limit', itemIndex) as number || limit;
			offset = fns.getNodeParameter('offset', itemIndex) as number || offset;
			queryParams['limit'] = String(limit);
			queryParams['offset'] = String(offset);
		}
		const requestData: INetSuiteRequestOptions = {
			method,
			requestType,
			path: `services/rest/record/${apiVersion}/${recordType}`,
			query: queryParams,
		};
		nodeContext.hasMore = hasMore;
		nodeContext.count = limit;
		nodeContext.offset = offset;
		while ((returnAll || returnData.length < limit) && hasMore === true) {
			const response = await makeRequest(credentials, requestData);
			const result = handleNetsuiteResponse(fns, response, itemIndex);
			const { hasMore: doContinue, items, links, offset, count, totalResults } = result.json as INetSuitePagedBody;
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

	static async runSuiteQL(options: INetSuiteOperationOptions): Promise<INodeExecutionData[]> {
		const { fns, credentials, itemIndex } = options;
		const nodeContext = fns.getContext('node');
		const apiVersion = fns.getNodeParameter('version', itemIndex) as string;
		const returnAll = fns.getNodeParameter('returnAll', itemIndex) as boolean;
		const query = fns.getNodeParameter('query', itemIndex) as string;
		let limit = 1000;
		let offset = 0;
		let hasMore = true;
		const method = 'POST';
		let nextUrl;
		const requestType = NetSuiteRequestType.SuiteQL;
		const returnData: INodeExecutionData[] = [];
		const config = { ...credentials, netsuiteQueryLimit: limit };
		const urlQueryParams: Record<string, string> = {};
		if (returnAll !== true) {
			limit = fns.getNodeParameter('limit', itemIndex) as number || limit;
			offset = fns.getNodeParameter('offset', itemIndex) as number || offset;
			urlQueryParams['offset'] = String(offset);
		}
		urlQueryParams['limit'] = String(limit);
		config.netsuiteQueryLimit = limit;
		const requestData: INetSuiteRequestOptions = {
			method,
			requestType,
			body: { q: query },
			query: urlQueryParams,
			path: `services/rest/query/${apiVersion}/suiteql`,
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
			const result = handleNetsuiteResponse(fns, response, itemIndex);
			const { hasMore: doContinue, items, links, count, totalResults, offset } = result.json as INetSuitePagedBody;
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

	static async getRecord(options: INetSuiteOperationOptions): Promise<INodeExecutionData> {
		const { item, fns, credentials, itemIndex } = options;
		const params = new URLSearchParams();
		const expandSubResources = fns.getNodeParameter('expandSubResources', itemIndex) as boolean;
		const simpleEnumFormat = fns.getNodeParameter('simpleEnumFormat', itemIndex) as boolean;
		const apiVersion = fns.getNodeParameter('version', itemIndex) as string;
		const recordType = NetSuite.getRecordType(options);
		const internalId = fns.getNodeParameter('internalId', itemIndex) as string;
		if (expandSubResources) {
			params.append('expandSubResources', 'true');
		}
		if (simpleEnumFormat) {
			params.append('simpleEnumFormat', 'true');
		}
		const q = params.toString();
		const requestData = {
			method: 'GET',
			requestType: NetSuiteRequestType.Record,
			path: `services/rest/record/${apiVersion}/${recordType}/${internalId}${q ? `?${q}` : ''}`,
		};
		const response = await makeRequest(credentials, requestData);
		return handleNetsuiteResponse(fns, response, itemIndex);
	}

	static async removeRecord(options: INetSuiteOperationOptions): Promise<INodeExecutionData> {
		const { fns, credentials, itemIndex } = options;
		const apiVersion = fns.getNodeParameter('version', itemIndex) as string;
		const recordType = NetSuite.getRecordType(options);
		const internalId = fns.getNodeParameter('internalId', itemIndex) as string;
		const requestData = {
			method: 'DELETE',
			requestType: NetSuiteRequestType.Record,
			path: `services/rest/record/${apiVersion}/${recordType}/${internalId}`,
		};
		const response = await makeRequest(credentials, requestData);
		return handleNetsuiteResponse(fns, response, itemIndex);
	}

	static async insertRecord(options: INetSuiteOperationOptions): Promise<INodeExecutionData> {
		const { fns, credentials, itemIndex, item } = options;
		const apiVersion = fns.getNodeParameter('version', itemIndex) as string;
		const recordType = NetSuite.getRecordType(options);
		const query = item ? item.json : undefined;
		const requestData: INetSuiteRequestOptions = {
			method: 'POST',
			requestType: NetSuiteRequestType.Record,
			path: `services/rest/record/${apiVersion}/${recordType}`,
		};
		if (query) {
			requestData.query = query as Record<string, string | number | boolean>;
		}
		const response = await makeRequest(credentials, requestData);
		return handleNetsuiteResponse(fns, response, itemIndex);
	}

	static async updateRecord(options: INetSuiteOperationOptions): Promise<INodeExecutionData> {
		const { fns, credentials, itemIndex, item } = options;
		const apiVersion = fns.getNodeParameter('version', itemIndex) as string;
		const recordType = NetSuite.getRecordType(options);
		const internalId = fns.getNodeParameter('internalId', itemIndex) as string;
		const query = item ? item.json : undefined;
		const requestData: INetSuiteRequestOptions = {
			method: 'PATCH',
			requestType: NetSuiteRequestType.Record,
			path: `services/rest/record/${apiVersion}/${recordType}/${internalId}`,
		};
		if (query) {
			requestData.query = query as Record<string, string | number | boolean>;
		}
		const response = await makeRequest(credentials, requestData);
		return handleNetsuiteResponse(fns, response, itemIndex);
	}

	static async rawRequest(options: INetSuiteOperationOptions): Promise<INodeExecutionData> {
		const { fns, credentials, itemIndex, item } = options;
		const nodeContext = fns.getContext('node');
		let path = fns.getNodeParameter('path', itemIndex) as string;
		const method = fns.getNodeParameter('method', itemIndex) as string;
		const body = fns.getNodeParameter('body', itemIndex) as string;
		const requestType = fns.getNodeParameter('requestType', itemIndex) as NetSuiteRequestType;
		const bodyContent = body || (item ? item.json : undefined);
		const nodeOptions = fns.getNodeParameter('options', 0) as IDataObject;
		let urlQueryParams: Record<string, string> = {};

		if (path && (path.startsWith('https://') || path.startsWith('http://'))) {
			const url = new URL(path);
			path = url.pathname.replace(/^\//, '');
			if (url.search) {
				urlQueryParams = Object.fromEntries(new URLSearchParams(url.search));
			}
		}

		const requestData: INetSuiteRequestOptions = {
			method,
			requestType,
			path,
			query: Object.keys(urlQueryParams).length > 0 ? urlQueryParams : undefined,
		};

		if (bodyContent && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
			try {
				const parsed = typeof bodyContent === 'string' ? JSON.parse(bodyContent) : bodyContent;
				requestData.body = parsed;
			} catch {
				requestData.body = bodyContent as string;
			}
		}

		const response = await makeRequest(credentials, requestData);

		if (response.body) {
			const pagedBody = response.body as unknown as INetSuitePagedBody;
			nodeContext.hasMore = pagedBody.hasMore;
			nodeContext.count = pagedBody.count;
			nodeContext.offset = pagedBody.offset;
			nodeContext.totalResults = pagedBody.totalResults;
		}

		if (nodeOptions.fullResponse) {
			return {
				json: {
					statusCode: response.statusCode,
					headers: response.headers,
					body: response.body,
				},
			};
		} else {
			const rawBody = response.body;
			return { json: typeof rawBody === 'string' ? { message: rawBody } : rawBody };
		}
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const credentials: INetSuiteCredentials = (await this.getCredentials('netsuite')) as INetSuiteCredentials;
		const operation = this.getNodeParameter('operation', 0) as string;
		const items: INodeExecutionData[] = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const promises = [];
		const options = this.getNodeParameter('options', 0) as IDataObject;
		const concurrency = (options.concurrency as number) || 1;
		const limit = pLimit(concurrency);

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			const item: INodeExecutionData = items[itemIndex];
			let data: INodeExecutionData | INodeExecutionData[];

			promises.push(limit(async () => {
				debug(`Processing ${operation} for ${itemIndex + 1} of ${items.length}`);
				if (operation === 'getRecord') {
					data = await NetSuite.getRecord({ item, fns: this, credentials, itemIndex });
				} else if (operation === 'listRecords') {
					data = await NetSuite.listRecords({ item, fns: this, credentials, itemIndex });
				} else if (operation === 'removeRecord') {
					data = await NetSuite.removeRecord({ item, fns: this, credentials, itemIndex });
				} else if (operation === 'insertRecord') {
					data = await NetSuite.insertRecord({ item, fns: this, credentials, itemIndex });
				} else if (operation === 'updateRecord') {
					data = await NetSuite.updateRecord({ item, fns: this, credentials, itemIndex });
				} else if (operation === 'rawRequest') {
					data = await NetSuite.rawRequest({ item, fns: this, credentials, itemIndex });
				} else if (operation === 'runSuiteQL') {
					data = await NetSuite.runSuiteQL({ item, fns: this, credentials, itemIndex });
				} else {
					const error = new Error(`The operation "${operation}" is not supported!`);
					if (this.continueOnFail(error)) {
						data = { json: { error: error.message }, pairedItem: { item: itemIndex } };
					} else {
						throw error;
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
				} else {
					returnData.push(result);
				}
			}
		}

		return [returnData];
	}
}
