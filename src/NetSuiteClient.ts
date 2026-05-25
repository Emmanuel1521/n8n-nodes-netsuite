import { createHmac, randomBytes } from 'crypto';
import { IDataObject } from 'n8n-workflow';

export class NetSuiteClient {
  private hostname: string;
  private accountId: string;
  private consumerKey: string;
  private consumerSecret: string;
  private tokenKey: string;
  private tokenSecret: string;
  private apiBaseUrl: string;

  constructor(credentials: IDataObject) {
    this.hostname = credentials.hostname as string;
    this.accountId = credentials.accountId as string;
    this.consumerKey = credentials.consumerKey as string;
    this.consumerSecret = credentials.consumerSecret as string;
    this.tokenKey = credentials.tokenKey as string;
    this.tokenSecret = credentials.tokenSecret as string;

    if (!this.hostname || !this.accountId || !this.consumerKey || !this.consumerSecret || !this.tokenKey || !this.tokenSecret) {
      throw new Error('Missing required NetSuite credential data.');
    }

    this.apiBaseUrl = `https://${this.hostname}/services/rest/record/v1`;
  }

  async request(path: string, method = 'GET', body?: IDataObject, query?: IDataObject): Promise<any> {
    const url = new URL(`${this.apiBaseUrl}/${path}`);

    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      });
    }

    const authorization = this.buildAuthorizationHeader(method, url, query);
    const headers: Record<string, string> = {
      Authorization: authorization,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    const response = await fetch(url.toString(), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(`NetSuite API request failed: ${response.status} ${response.statusText} - ${responseText}`);
    }

    return responseText ? JSON.parse(responseText) : {};
  }

  private buildAuthorizationHeader(method: string, url: URL, query?: IDataObject): string {
    const oauth = {
      oauth_consumer_key: this.consumerKey,
      oauth_nonce: this.createNonce(),
      oauth_signature_method: 'HMAC-SHA256',
      oauth_timestamp: this.getTimestamp(),
      oauth_token: this.tokenKey,
      oauth_version: '1.0',
    } as Record<string, string>;

    const signature = this.getSignature(method, url, oauth, query);
    oauth.oauth_signature = signature;

    const headerItems = {
      realm: this.accountId,
      ...oauth,
    };

    return (
      'OAuth ' +
      Object.entries(headerItems)
        .map(([key, value]) => `${this.rfc3986Encode(key)}="${this.rfc3986Encode(value)}"`)
        .join(', ')
    );
  }

  private getSignature(method: string, url: URL, oauth: Record<string, string>, query?: IDataObject): string {
    const parameters: Record<string, string> = {};

    Object.entries(oauth).forEach(([key, value]) => {
      parameters[key] = value;
    });

    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        parameters[key] = String(value);
      });
    }

    const baseUrl = `${url.origin}${url.pathname}`;
    const parameterString = this.buildParameterString(parameters);
    const baseString = `${method.toUpperCase()}&${this.rfc3986Encode(baseUrl)}&${this.rfc3986Encode(parameterString)}`;
    const signingKey = `${this.rfc3986Encode(this.consumerSecret)}&${this.rfc3986Encode(this.tokenSecret)}`;

    return createHmac('sha256', signingKey).update(baseString).digest('base64');
  }

  private buildParameterString(parameters: Record<string, string>): string {
    return Object.entries(parameters)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${this.rfc3986Encode(key)}=${this.rfc3986Encode(value)}`)
      .join('&');
  }

  private rfc3986Encode(value: string): string {
    return encodeURIComponent(value).replace(/[!*'()]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
  }

  private createNonce(): string {
    return randomBytes(16).toString('hex');
  }

  private getTimestamp(): string {
    return Math.floor(Date.now() / 1000).toString();
  }
}
