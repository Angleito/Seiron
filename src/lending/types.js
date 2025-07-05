"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PERCENTAGE_FACTOR = exports.WAD = exports.RAY = exports.isMaxAmount = exports.canBeLiquidated = exports.isHealthy = void 0;
const isHealthy = (healthFactor) => healthFactor > BigInt('1000000000000000000');
exports.isHealthy = isHealthy;
const canBeLiquidated = (healthFactor) => healthFactor < BigInt('1000000000000000000');
exports.canBeLiquidated = canBeLiquidated;
const isMaxAmount = (amount) => amount === 'max';
exports.isMaxAmount = isMaxAmount;
exports.RAY = BigInt('1000000000000000000000000000');
exports.WAD = BigInt('1000000000000000000');
exports.PERCENTAGE_FACTOR = BigInt('10000');
//# sourceMappingURL=types.js.map