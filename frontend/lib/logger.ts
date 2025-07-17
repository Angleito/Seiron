// Simple logger utility for frontend
export const logger = {
  safe: (level: string, message: string, context?: any) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    
    if (level === 'error') {
      console.error(logMessage, context);
    } else if (level === 'warn') {
      console.warn(logMessage, context);
    } else {
      console.log(logMessage, context);
    }
  },
  
  info: (message: string, context?: any) => {
    logger.safe('info', message, context);
  },
  
  error: (message: string, context?: any) => {
    logger.safe('error', message, context);
  },
  
  warn: (message: string, context?: any) => {
    logger.safe('warn', message, context);
  },
  
  debug: (message: string, context?: any) => {
    if (process.env.NODE_ENV === 'development') {
      logger.safe('debug', message, context);
    }
  }
};

// Export safe logging functions for various log levels
export const safeError = (message: string, context?: any) => {
  logger.safe('error', message, context);
};

export const safeWarn = (message: string, context?: any) => {
  logger.safe('warn', message, context);
};

export const safeInfo = (message: string, context?: any) => {
  logger.safe('info', message, context);
};

export const safeDebug = (message: string, context?: any) => {
  logger.safe('debug', message, context);
};