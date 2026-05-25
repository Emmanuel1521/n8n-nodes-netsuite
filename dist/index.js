"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetSuiteApi = exports.NetSuite = void 0;
const NetSuite_node_1 = require("./nodes/NetSuite/NetSuite.node");
Object.defineProperty(exports, "NetSuite", { enumerable: true, get: function () { return NetSuite_node_1.NetSuite; } });
const NetSuite_credentials_1 = require("./credentials/NetSuite.credentials");
Object.defineProperty(exports, "NetSuiteApi", { enumerable: true, get: function () { return NetSuite_credentials_1.NetSuite; } });
//# sourceMappingURL=index.js.map