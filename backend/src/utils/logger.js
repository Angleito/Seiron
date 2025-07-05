"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loggerStream = exports.generateRequestId = exports.PerformanceTimer = void 0;
const winston_1 = require("winston");
const path_1 = __importDefault(require("path"));
const crypto_1 = require("crypto");
const { combine, timestamp, errors, json, printf, colorize } = winston_1.format;
const consoleFormat = printf(({ level, message, timestamp, stack, requestId, service, performance }) => {
    const reqId = requestId ? `[${requestId}]` : '';
    const perf = performance && typeof performance === 'object' && 'duration' in performance ? ` (${performance.duration}ms)` : '';
    return `${timestamp} [${level}]${reqId}: ${stack || message}${perf}`;
});
const fileFormat = printf(({ level, message, timestamp, stack, requestId, service, performance, ...meta }) => {
    const logEntry = {
        timestamp,
        level,
        service,
        requestId,
        message: stack || message,
        performance,
        ...meta
    };
    return JSON.stringify(logEntry);
});
const logDir = path_1.default.join(process.cwd(), 'logs');
const logger = (0, winston_1.createLogger)({
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }), errors({ stack: true }), json()),
    defaultMeta: { service: 'sei-portfolio-backend' },
    transports: [
        new winston_1.transports.Console({
            format: combine(colorize(), timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }), consoleFormat)
        }),
        new winston_1.transports.File({
            filename: path_1.default.join(logDir, 'error.log'),
            level: 'error',
            maxsize: 10485760,
            maxFiles: 10,
            format: fileFormat
        }),
        new winston_1.transports.File({
            filename: path_1.default.join(logDir, 'combined.log'),
            maxsize: 10485760,
            maxFiles: 10,
            format: fileFormat
        }),
        new winston_1.transports.File({
            filename: path_1.default.join(logDir, 'requests.log'),
            maxsize: 10485760,
            maxFiles: 10,
            format: fileFormat
        })
    ],
});
class PerformanceTimer {
    constructor(requestId) {
        this.startTime = Date.now();
        this.requestId = requestId;
    }
    end() {
        return Date.now() - this.startTime;
    }
    log(operation, additionalData) {
        const duration = this.end();
        logger.info(`Operation completed: ${operation}`, {
            requestId: this.requestId,
            performance: { duration, operation },
            ...additionalData
        });
        return duration;
    }
}
exports.PerformanceTimer = PerformanceTimer;
const generateRequestId = () => {
    return (0, crypto_1.randomUUID)();
};
exports.generateRequestId = generateRequestId;
exports.loggerStream = {
    write: (message) => {
        logger.info(message.trim(), { source: 'http-request' });
    }
};
exports.default = logger;
//# sourceMappingURL=logger.js.map