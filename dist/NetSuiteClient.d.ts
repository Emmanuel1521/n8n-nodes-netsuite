import { IDataObject } from 'n8n-workflow';
export declare class NetSuiteClient {
    private hostname;
    private accountId;
    private consumerKey;
    private consumerSecret;
    private tokenKey;
    private tokenSecret;
    private apiBaseUrl;
    constructor(credentials: IDataObject);
    request(path: string, method?: string, body?: IDataObject | string, query?: IDataObject | string, headers?: Record<string, string>): Promise<any>;
    private buildAuthorizationHeader;
    private getSignature;
    private buildParameterString;
    private rfc3986Encode;
    private createNonce;
    private getTimestamp;
}
//# sourceMappingURL=NetSuiteClient.d.ts.map