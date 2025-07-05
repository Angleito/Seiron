"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSeiOrder = exports.isSeiTransaction = void 0;
const isSeiTransaction = (tx) => 'seiSpecific' in tx && typeof tx.seiSpecific === 'object';
exports.isSeiTransaction = isSeiTransaction;
const isSeiOrder = (obj) => typeof obj === 'object' &&
    obj !== null &&
    'orderId' in obj &&
    'orderType' in obj;
exports.isSeiOrder = isSeiOrder;
//# sourceMappingURL=sei.js.map