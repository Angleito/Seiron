"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loggerStream = void 0;
const winston_1 = require("winston");
const path_1 = __importDefault(require("path"));
const { combine, timestamp, errors, json, printf, colorize } = winston_1.format;
const consoleFormat = printf(({ level, message, timestamp, stack }) => {
    return `${timestamp} [${level}]: ${stack || message}`;
});
const logDir = path_1.default.join(process.cwd(), 'logs');
const logger = (0, winston_1.createLogger)({
    level: process.env.LOG_LEVEL || 'info',
    format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), errors({ stack: true }), json()),
    defaultMeta: { service: 'sei-portfolio-backend' },
    transports: [
        new winston_1.transports.Console({
            format: combine(colorize(), timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), consoleFormat)
        }),
        new winston_1.transports.File({
            filename: path_1.default.join(logDir, 'error.log'),
            level: 'error',
            maxsize: 5242880,
            maxFiles: 5,
        }),
        new winston_1.transports.File({
            filename: path_1.default.join(logDir, 'combined.log'),
            maxsize: 5242880,
            maxFiles: 5,
        })
    ],
});
exports.loggerStream = {
    write: (message) => {
        logger.info(message.trim());
    }
};
exports.default = logger;
//# sourceMappingURL=logger.js.map