"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isNone = exports.isSome = exports.isRight = exports.isLeft = void 0;
const isLeft = (either) => either._tag === 'Left';
exports.isLeft = isLeft;
const isRight = (either) => either._tag === 'Right';
exports.isRight = isRight;
const isSome = (option) => option._tag === 'Some';
exports.isSome = isSome;
const isNone = (option) => option._tag === 'None';
exports.isNone = isNone;
//# sourceMappingURL=data.js.map