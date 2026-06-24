import { IDataObject } from 'n8n-workflow';
import { INetSuiteCredentials, INetSuiteResponse } from './nodes/NetSuite/NetSuite.node.types';
export declare class NetSuiteClient {
    private hostname;
    private accountId;
    private consumerKey;
    private consumerSecret;
    private tokenKey;
    private tokenSecret;
    private apiBaseUrl;
    constructor(credentials: INetSuiteCredentials);
    request(path: string, method?: string, body?: IDataObject | string, query?: IDataObject | string, headers?: Record<string, string>): Promise<INetSuiteResponse>;
    private buildAuthorizationHeader;
    private getSignature;
    private buildParameterString;
    private rfc3986Encode;
    private createNonce;
    private getTimestamp;
}
//# sourceMappingURL=NetSuiteClient.d.ts.map