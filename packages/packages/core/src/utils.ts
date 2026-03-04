/**
 * @comment-md/core - Utility Functions
 */

/**
 * Generate a simple hash of the content for change detection
 * Uses FNV-1a hash algorithm for speed
 */
export function hashContent(content: string): string {
  const normalized = normalizeContent(content);
  let hash = 2166136261; // FNV offset basis
  for (let i = 0; i < normalized.length; i++) {
    hash ^= normalized.charCodeAt(i);
    hash = (hash * 16777619) >>> 0; // FNV prime, keep as unsigned 32-bit
  }
  return hash.toString(16).padStart(8, '0');
}

/**
 * Normalize content for comparison
 * - Collapse multiple whitespace to single space
 * - Trim leading/trailing whitespace
 * - Normalize line endings
 */
export function normalizeContent(content: string): string {
  return content
    .replace(/\r\n/g, '\n')      // Normalize line endings
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')     // Collapse horizontal whitespace
    .replace(/\n+/g, '\n')       // Collapse multiple newlines
    .trim();
}

/**
 * Generate a unique ID for annotations
 */
export function generateId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `c${timestamp}${random}`;
}

/**
 * Parse ISO 8601 timestamp
 */
export function parseTimestamp(timestamp: string): Date | null {
  try {
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

/**
 * Format current time as ISO 8601
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Escape special regex characters
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Extract text content from HTML-like string (strip tags)
 */
export function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

/**
 * Check if two content strings are semantically equal
 * (ignoring whitespace differences)
 */
export function contentEquals(a: string, b: string): boolean {
  return normalizeContent(a) === normalizeContent(b);
}

/**
 * Indent each line of a string
 */
export function indent(str: string, spaces: number = 2): string {
  const prefix = ' '.repeat(spaces);
  return str
    .split('\n')
    .map(line => prefix + line)
    .join('\n');
}

/**
 * Dedent a string by removing common leading whitespace
 */
export function dedent(str: string): string {
  const lines = str.split('\n');
  const nonEmptyLines = lines.filter(line => line.trim().length > 0);
  
  if (nonEmptyLines.length === 0) return str;
  
  const minIndent = Math.min(
    ...nonEmptyLines.map(line => {
      const match = line.match(/^(\s*)/);
      return match ? match[1].length : 0;
    })
  );
  
  return lines
    .map(line => line.slice(minIndent))
    .join('\n');
}
