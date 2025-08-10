/**
 * Centralized SQL validation module for security and compatibility
 * Used both on query save and execution to prevent dangerous operations
 */

export class SqlValidator {
  static DANGEROUS_KEYWORDS = [
    "drop",
    "delete", 
    "update",
    "insert",
    "alter",
    "create",
    "truncate",
    "replace",
    "pragma",
  ];

  static FORBIDDEN_KEYWORDS = [
    "limit",
    "offset",
  ];

  /**
   * Validate SQL query for security and compatibility
   * @param {string} query - The SQL query to validate
   * @returns {object} - { isValid: boolean, error?: string }
   */
  static validate(query) {
    if (!query || typeof query !== 'string') {
      return { isValid: false, error: "Query must be a non-empty string" };
    }

    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return { isValid: false, error: "Query cannot be empty" };
    }

    const queryLower = trimmedQuery.toLowerCase();

    // Check for semicolons (prevent multiple statements)
    if (query.includes(';')) {
      return {
        isValid: false,
        error: "Semicolons are not allowed. Please write a single SQL statement."
      };
    }

    // Check for dangerous operations
    for (const keyword of this.DANGEROUS_KEYWORDS) {
      if (queryLower.startsWith(keyword)) {
        return {
          isValid: false,
          error: `${keyword.toUpperCase()} operations are not allowed. Only SELECT queries permitted.`
        };
      }
    }

    // Check for forbidden keywords that interfere with pagination
    for (const keyword of this.FORBIDDEN_KEYWORDS) {
      if (queryLower.includes(` ${keyword} `) || queryLower.includes(` ${keyword}(`)) {
        return {
          isValid: false,
          error: `${keyword.toUpperCase()} clauses are not allowed. We handle pagination automatically.`
        };
      }
    }

    // Additional checks can be added here
    // - Complex regex patterns
    // - Whitelist approach for allowed functions
    // - Query complexity limits

    return { isValid: true };
  }

  /**
   * Validate and throw error if invalid (for use in async contexts)
   * @param {string} query - The SQL query to validate
   * @throws {Error} - If validation fails
   */
  static validateOrThrow(query) {
    const result = this.validate(query);
    if (!result.isValid) {
      throw new Error(result.error);
    }
  }

  /**
   * Quick check if query is a SELECT statement
   * @param {string} query - The SQL query to check
   * @returns {boolean}
   */
  static isSelectQuery(query) {
    if (!query || typeof query !== 'string') return false;
    return query.trim().toLowerCase().startsWith('select');
  }
}