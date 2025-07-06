"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CitrexProtocolError = exports.SiloProtocolError = void 0;
class SiloProtocolError extends Error {
    constructor(message, code, details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'SiloProtocolError';
    }
}
exports.SiloProtocolError = SiloProtocolError;
class CitrexProtocolError extends Error {
    constructor(message, code, details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'CitrexProtocolError';
    }
}
exports.CitrexProtocolError = CitrexProtocolError;
//# sourceMappingURL=types.js.map