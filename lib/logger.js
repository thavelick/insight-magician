/**
 * Universal logging utility that works in both browser and server environments
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

function getLogLevel() {
  if (typeof window !== "undefined" && typeof process === "undefined") {
    // Browser: default to debug for now, could be configurable later
    return LOG_LEVELS.debug;
  }

  return LOG_LEVELS[process.env.LOG_LEVEL?.toLowerCase()] ?? LOG_LEVELS.debug;
}

const currentLevel = getLogLevel();

function shouldLog(level) {
  return currentLevel <= LOG_LEVELS[level];
}

export const logger = {
  debug: (message, data) => {
    if (shouldLog("debug")) {
      console.log(message, data);
    }
  },

  info: (message, data) => {
    if (shouldLog("info")) {
      console.log(message, data);
    }
  },

  warn: (message, data) => {
    if (shouldLog("warn")) {
      console.warn(message, data);
    }
  },

  error: (message, data) => {
    if (shouldLog("error")) {
      console.error(message, data);
    }
  },
};
