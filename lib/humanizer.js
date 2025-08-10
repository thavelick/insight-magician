/**
 * Humanizes field names by converting various naming conventions to readable text
 * Handles snake_case, camelCase, PascalCase, and kebab-case
 */

// Common abbreviations that should be uppercased
const ABBREVIATIONS = new Set([
  "id",
  "url",
  "uri",
  "api",
  "http",
  "https",
  "sql",
  "json",
  "xml",
  "html",
  "css",
  "js",
  "ts",
  "ui",
  "ux",
  "db",
  "fk",
  "pk",
  "uuid",
  "guid",
  "ip",
  "tcp",
  "udp",
  "ftp",
  "ssh",
]);

/**
 * Converts a field name to human-readable format
 * @param {string} fieldName - The field name to humanize
 * @returns {string} - The humanized field name
 */
function humanizeField(fieldName) {
  if (!fieldName || typeof fieldName !== "string") {
    return fieldName;
  }

  // Handle different naming conventions
  let words = [];

  // Check if it contains underscores (snake_case)
  if (fieldName.includes("_")) {
    words = fieldName.split("_");
  }
  // Check if it contains hyphens (kebab-case)
  else if (fieldName.includes("-")) {
    words = fieldName.split("-");
  }
  // Handle camelCase and PascalCase
  else {
    // Split on word boundaries, handling consecutive capitals
    words = fieldName
      .split(/(?<=[a-z])(?=[A-Z])|(?<=[A-Z])(?=[A-Z][a-z])/)
      .filter((word) => word.length > 0);
  }

  // Process each word
  const humanizedWords = words.map((word) => {
    const lowerWord = word.toLowerCase();

    // Check if it's a known abbreviation
    if (ABBREVIATIONS.has(lowerWord)) {
      return lowerWord.toUpperCase();
    }

    // Capitalize first letter
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });

  return humanizedWords.join(" ");
}

export { humanizeField };
