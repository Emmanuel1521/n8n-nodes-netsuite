"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetSuiteClient = void 0;
const crypto_1 = require("crypto");
class NetSuiteClient {
    hostname;
    accountId;
    consumerKey;
    consumerSecret;
    tokenKey;
    tokenSecret;
    apiBaseUrl;
    constructor(credentials) {
        this.hostname = credentials.hostname;
        this.accountId = credentials.accountId;
        this.consumerKey = credentials.consumerKey;
        this.consumerSecret = credentials.consumerSecret;
        this.tokenKey = credentials.tokenKey;
        this.tokenSecret = credentials.tokenSecret;
        if (!this.hostname || !this.accountId || !this.consumerKey || !this.consumerSecret || !this.tokenKey || !this.tokenSecret) {
            throw new Error('Missing required NetSuite credential data.');
        }
        this.apiBaseUrl = `https://${this.hostname}`;
    }
    async request(path, method = 'GET', body, query, headers) {
        const normalizedPath = path.replace(/^\/+/, '');
        const url = new URL(`${this.apiBaseUrl}/${normalizedPath}`);
        if (typeof query === 'object' && query !== null) {
            Object.entries(query).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    url.searchParams.set(key, String(value));
                }
            });
        }
        else if (typeof query === 'string' && query.length > 0) {
            const extra = query.startsWith('?') ? query.substring(1) : query;
            extra.split('&').forEach((param) => {
                const [key, value] = param.split('=');
                if (key) {
                    url.searchParams.set(key, value || '');
                }
            });
        }
        const authorization = this.buildAuthorizationHeader(method, url, query);
        const requestHeaders = {
            Authorization: authorization,
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...(headers || {}),
        };
        const requestBody = typeof body === 'string' ? body : body ? JSON.stringify(body) : undefined;
        const response = await fetch(url.toString(), {
            method,
            headers: requestHeaders,
            body: requestBody,
        });
        const responseText = await response.text();
        let parsedBody = {};
        if (responseText) {
            try {
                parsedBody = JSON.parse(responseText);
            }
            catch {
                parsedBody = responseText;
            }
        }
        const responseHeaders = {};
        response.headers.forEach((value, key) => {
            responseHeaders[key.toLowerCase()] = value;
        });
        return {
            statusCode: response.status,
            statusText: response.statusText,
            body: parsedBody,
            headers: responseHeaders,
            request: {
                url: url.toString(),
                options: {
                    method,
                    headers: requestHeaders,
                    body: requestBody,
                },
            },
        };
    }
    buildAuthorizationHeader(method, url, query) {
        const oauth = {
            oauth_consumer_key: this.consumerKey,
            oauth_nonce: this.createNonce(),
            oauth_signature_method: 'HMAC-SHA256',
            oauth_timestamp: this.getTimestamp(),
            oauth_token: this.tokenKey,
            oauth_version: '1.0',
        };
        const signature = this.getSignature(method, url, oauth, query);
        oauth.oauth_signature = signature;
        const headerItems = {
            realm: this.accountId,
            ...oauth,
        };
        return ('OAuth ' +
            Object.entries(headerItems)
                .map(([key, value]) => `${this.rfc3986Encode(key)}="${this.rfc3986Encode(value)}"`)
                .join(', '));
    }
    getSignature(method, url, oauth, query) {
        const parameters = {};
        Object.entries(oauth).forEach(([key, value]) => {
            parameters[key] = value;
        });
        if (query) {
            if (typeof query === 'string') {
                const search = new URLSearchParams(query.startsWith('?') ? query.substring(1) : query);
                for (const [key, value] of search) {
                    parameters[key] = value;
                }
            }
            else {
                Object.entries(query).forEach(([key, value]) => {
                    parameters[key] = String(value);
                });
            }
        }
        const baseUrl = `${url.origin}${url.pathname}`;
        const parameterString = this.buildParameterString(parameters);
        const baseString = `${method.toUpperCase()}&${this.rfc3986Encode(baseUrl)}&${this.rfc3986Encode(parameterString)}`;
        const signingKey = `${this.rfc3986Encode(this.consumerSecret)}&${this.rfc3986Encode(this.tokenSecret)}`;
        return (0, crypto_1.createHmac)('sha256', signingKey).update(baseString).digest('base64');
    }
    buildParameterString(parameters) {
        return Object.entries(parameters)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => `${this.rfc3986Encode(key)}=${this.rfc3986Encode(value)}`)
            .join('&');
    }
    rfc3986Encode(value) {
        return encodeURIComponent(value).replace(/[!*'()]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
    }
    createNonce() {
        return (0, crypto_1.randomBytes)(16).toString('hex');
    }
    getTimestamp() {
        return Math.floor(Date.now() / 1000).toString();
    }
}
exports.NetSuiteClient = NetSuiteClient;
//# sourceMappingURL=NetSuiteClient.js.map