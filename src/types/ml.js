"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isFeatureMap = exports.isTrainingExample = void 0;
const isTrainingExample = (obj) => typeof obj === 'object' &&
    obj !== null &&
    'features' in obj &&
    'label' in obj;
exports.isTrainingExample = isTrainingExample;
const isFeatureMap = (obj) => typeof obj === 'object' &&
    obj !== null &&
    Object.values(obj).every(v => typeof v === 'number');
exports.isFeatureMap = isFeatureMap;
//# sourceMappingURL=ml.js.map