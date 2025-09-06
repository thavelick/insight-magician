/**
 * Environment-controlled logging utility
 *
 * Controls logging output based on LOG_LEVEL environment variable:
 * - LOG_LEVEL=debug: All logging enabled (default for development)
 * - LOG_LEVEL=info: Info, warn, and error logging
 * - LOG_LEVEL=warn: Warn and error logging only
 * - LOG_LEVEL=error: Error logging only
 * - LOG_LEVEL=silent: No logging
 */

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
};

const currentLevel =
  LOG_LEVELS[process.env.LOG_LEVEL?.toLowerCase()] ?? LOG_LEVELS.debug;

function shouldLog(level) {
  return currentLevel <= LOG_LEVELS[level];
}

export const logger = {
  /**
   * Debug level logging - detailed debugging information, tool execution traces
   */
  debug: (message, data) => {
    if (shouldLog("debug")) {
      console.log(message, data);
    }
  },

  /**
   * Info level logging - general operational information
   */
  info: (message, data) => {
    if (shouldLog("info")) {
      console.log(message, data);
    }
  },

  /**
   * Warning level logging - concerning situations that aren't errors
   */
  warn: (message, data) => {
    if (shouldLog("warn")) {
      console.warn(message, data);
    }
  },

  /**
   * Error level logging - errors and failures that need attention
   */
  error: (message, data) => {
    if (shouldLog("error")) {
      console.error(message, data);
    }
  },
};
