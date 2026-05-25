declare module 'n8n-workflow' {
  export type IDataObject = {
    [key: string]: any;
  };

  export type JsonObject = {
    [key: string]: any;
  };

  export interface INodeExecutionData {
    json: IDataObject;
    pairedItem?: {
      item: number;
    };
  }

  export interface INodeProperties {
    displayName: string;
    name: string;
    type: string;
    default: any;
    description?: string;
    placeholder?: string;
    required?: boolean;
    options?: Array<INodePropertyOption> | INodeProperties[];
    displayOptions?: {
      show?: {
        [key: string]: string[] | boolean[];
      };
    };
    typeOptions?: {
      password?: boolean;
      minValue?: number;
      maxValue?: number;
    };
  }

  export interface INodePropertyOption {
    name: string;
    value: string;
    description?: string;
  }

  export interface INodeTypeDescription {
    displayName: string;
    name: string;
    icon?: string;
    iconColor?: string;
    group?: string[];
    version: number;
    description: string;
    defaults?: {
      name: string;
      color?: string;
    };
    inputs?: string[];
    outputs?: string[];
    credentials?: Array<{ name: string; required: boolean }>;
    properties: INodeProperties[];
  }

  export interface INodeType {
    description: INodeTypeDescription;
    execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]>;
  }

  export interface IExecuteFunctions {
    getInputData(): INodeExecutionData[];
    getNodeParameter(name: string, index: number, defaultValue?: any): any;
    getCredentials(name: string): Promise<IDataObject | undefined>;
    getNode(): any;
    getContext(scope: string): IDataObject;
    continueOnFail(): boolean;
    helpers: {
      returnJsonArray(data: IDataObject[]): INodeExecutionData[];
    };
  }

  export enum NodeConnectionTypes {
    Main = 'main',
  }

  export interface ICredentialType {
    name: string;
    displayName: string;
    documentationUrl?: string;
    properties: INodeProperties[];
  }

  export class NodeOperationError extends Error {
    constructor(node: any, message: string);
  }

  export class NodeApiError extends Error {
    constructor(node: any, body: any);
  }
}
