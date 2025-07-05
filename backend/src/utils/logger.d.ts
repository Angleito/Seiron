declare const logger: import("winston").Logger;
export declare class PerformanceTimer {
    private startTime;
    private requestId;
    constructor(requestId: string);
    end(): number;
    log(operation: string, additionalData?: Record<string, any>): number;
}
export declare const generateRequestId: () => string;
export declare const loggerStream: {
    write: (message: string) => void;
};
export default logger;
