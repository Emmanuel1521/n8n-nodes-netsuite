import { IExecuteFunctions, INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow';
import { INetSuiteOperationOptions } from './NetSuite.node.types';
export declare class NetSuite implements INodeType {
    description: INodeTypeDescription;
    static getRecordType({ fns, itemIndex }: INetSuiteOperationOptions): string;
    static listRecords(options: INetSuiteOperationOptions): Promise<INodeExecutionData[]>;
    static runSuiteQL(options: INetSuiteOperationOptions): Promise<INodeExecutionData[]>;
    static getRecord(options: INetSuiteOperationOptions): Promise<INodeExecutionData>;
    static removeRecord(options: INetSuiteOperationOptions): Promise<INodeExecutionData>;
    static insertRecord(options: INetSuiteOperationOptions): Promise<INodeExecutionData>;
    static updateRecord(options: INetSuiteOperationOptions): Promise<INodeExecutionData>;
    static rawRequest(options: INetSuiteOperationOptions): Promise<INodeExecutionData>;
    execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]>;
}
//# sourceMappingURL=NetSuite.node.d.ts.map