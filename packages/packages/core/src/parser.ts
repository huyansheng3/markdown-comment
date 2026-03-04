/**
 * @comment-md/core - Parser
 * 
 * Parses Markdown documents with annotation/comment syntax
 */

import type {
  Annotation,
  Comment,
  ParseResult,
  ParseOptions,
  Diagnostic,
  Position,
  Range,
} from './types';
import { hashContent, normalizeContent } from './utils';

// Regex patterns for parsing
const ANNOTATION_OPEN_PATTERN = /<annotation\s+([^>]*)>/gi;
const ANNOTATION_CLOSE_PATTERN = /<\/annotation>/gi;
const COMMENT_PATTERN = /<comment\s+([^>]*)>([\s\S]*?)<\/comment>/gi;
const ATTRIBUTE_PATTERN = /(\w+)=["']([^"']*)["']/g;

/**
 * Parse attributes from a tag string
 */
function parseAttributes(attrString: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  let match: RegExpExecArray | null;
  
  while ((match = ATTRIBUTE_PATTERN.exec(attrString)) !== null) {
    attrs[match[1]] = match[2];
  }
  
  // Reset lastIndex for reuse
  ATTRIBUTE_PATTERN.lastIndex = 0;
  
  return attrs;
}

/**
 * Calculate line and column from offset
 */
function offsetToPosition(source: string, offset: number): Position {
  let line = 1;
  let column = 1;
  
  for (let i = 0; i < offset && i < source.length; i++) {
    if (source[i] === '\n') {
      line++;
      column = 1;
    } else {
      column++;
    }
  }
  
  return { line, column, offset };
}

/**
 * Parse comments from annotation content
 */
function parseComments(content: string): { comments: Comment[]; cleanContent: string } {
  const comments: Comment[] = [];
  let cleanContent = content;
  let match: RegExpExecArray | null;
  
  // Reset pattern
  COMMENT_PATTERN.lastIndex = 0;
  
  // Extract all comments
  const matches: Array<{ full: string; attrs: string; content: string }> = [];
  while ((match = COMMENT_PATTERN.exec(content)) !== null) {
    matches.push({
      full: match[0],
      attrs: match[1],
      content: match[2].trim(),
    });
  }
  
  // Process matches in reverse to maintain correct positions when removing
  for (const m of matches) {
    const attrs = parseAttributes(m.attrs);
    comments.push({
      by: attrs.by || 'unknown',
      time: attrs.time || new Date().toISOString(),
      content: m.content,
    });
    cleanContent = cleanContent.replace(m.full, '');
  }
  
  // Clean up extra whitespace
  cleanContent = cleanContent.replace(/\n{3,}/g, '\n\n').trim();
  
  return { comments, cleanContent };
}

/**
 * Find all annotation blocks in source
 */
function findAnnotationBlocks(source: string): Array<{
  fullMatch: string;
  openTag: string;
  closeTag: string;
  content: string;
  attributes: Record<string, string>;
  startOffset: number;
  endOffset: number;
}> {
  const blocks: Array<{
    fullMatch: string;
    openTag: string;
    closeTag: string;
    content: string;
    attributes: Record<string, string>;
    startOffset: number;
    endOffset: number;
  }> = [];
  
  // Find all opening tags first
  const openings: Array<{ tag: string; attrs: string; index: number; endIndex: number }> = [];
  let match: RegExpExecArray | null;
  
  ANNOTATION_OPEN_PATTERN.lastIndex = 0;
  while ((match = ANNOTATION_OPEN_PATTERN.exec(source)) !== null) {
    openings.push({
      tag: match[0],
      attrs: match[1],
      index: match.index,
      endIndex: match.index + match[0].length,
    });
  }
  
  // Match each opening with its closing tag
  for (const opening of openings) {
    // Find the next closing tag after this opening
    ANNOTATION_CLOSE_PATTERN.lastIndex = opening.endIndex;
    const closeMatch = ANNOTATION_CLOSE_PATTERN.exec(source);
    
    if (closeMatch) {
      const content = source.slice(opening.endIndex, closeMatch.index);
      const fullMatch = source.slice(opening.index, closeMatch.index + closeMatch[0].length);
      
      blocks.push({
        fullMatch,
        openTag: opening.tag,
        closeTag: closeMatch[0],
        content,
        attributes: parseAttributes(opening.attrs),
        startOffset: opening.index,
        endOffset: closeMatch.index + closeMatch[0].length,
      });
    }
  }
  
  return blocks;
}

/**
 * Main parse function
 */
export function parse(source: string, options: ParseOptions = {}): ParseResult {
  const {
    includeResolved = true,
    calculateHashes = true,
  } = options;
  
  const annotations: Annotation[] = [];
  const diagnostics: Diagnostic[] = [];
  let cleanMarkdown = source;
  
  // Find all annotation blocks
  const blocks = findAnnotationBlocks(source);
  
  // Process blocks in reverse order to maintain correct offsets when replacing
  for (let i = blocks.length - 1; i >= 0; i--) {
    const block = blocks[i];
    const { comments, cleanContent } = parseComments(block.content);
    
    const status = (block.attributes.status || 'open') as 'open' | 'resolved';
    
    // Skip resolved if not including them
    if (!includeResolved && status === 'resolved') {
      // Remove the entire block from clean markdown
      cleanMarkdown = 
        cleanMarkdown.slice(0, block.startOffset) + 
        cleanMarkdown.slice(block.endOffset);
      continue;
    }
    
    const annotation: Annotation = {
      id: block.attributes.id || `auto-${i}`,
      status,
      content: cleanContent,
      contentHash: calculateHashes ? hashContent(cleanContent) : '',
      comments,
      position: {
        start: offsetToPosition(source, block.startOffset),
        end: offsetToPosition(source, block.endOffset),
      },
    };
    
    if (block.attributes['resolved-at']) {
      annotation.resolvedAt = block.attributes['resolved-at'];
    }
    
    annotations.unshift(annotation); // Maintain original order
    
    // Replace annotation block with clean content in cleanMarkdown
    cleanMarkdown = 
      cleanMarkdown.slice(0, block.startOffset) + 
      cleanContent + 
      cleanMarkdown.slice(block.endOffset);
  }
  
  // Validate annotations
  const seenIds = new Set<string>();
  for (const ann of annotations) {
    if (seenIds.has(ann.id)) {
      diagnostics.push({
        severity: 'warning',
        message: `Duplicate annotation ID: ${ann.id}`,
        position: ann.position,
      });
    }
    seenIds.add(ann.id);
    
    if (ann.comments.length === 0) {
      diagnostics.push({
        severity: 'info',
        message: `Annotation ${ann.id} has no comments`,
        position: ann.position,
      });
    }
  }
  
  return {
    cleanMarkdown: cleanMarkdown.trim(),
    source,
    annotations,
    diagnostics,
  };
}

/**
 * Serialize annotations back to markdown
 */
export function serialize(
  cleanMarkdown: string,
  annotations: Annotation[],
  options: { archiveSectionTitle?: string } = {}
): string {
  const { archiveSectionTitle = '## Archived Comments' } = options;
  
  // Separate open and resolved annotations
  const open = annotations.filter(a => a.status === 'open');
  const resolved = annotations.filter(a => a.status === 'resolved');
  
  let result = cleanMarkdown;
  
  // Note: In a full implementation, we would need to track where to insert
  // each annotation back into the document. For now, we append them.
  
  // Append open annotations (in practice, these would be inline)
  if (open.length > 0) {
    result += '\n\n<!-- Open Annotations -->\n';
    for (const ann of open) {
      result += formatAnnotation(ann);
    }
  }
  
  // Append archived section
  if (resolved.length > 0) {
    result += `\n\n${archiveSectionTitle}\n\n`;
    for (const ann of resolved) {
      result += formatAnnotation(ann);
    }
  }
  
  return result;
}

/**
 * Format a single annotation as markdown
 */
function formatAnnotation(annotation: Annotation): string {
  const attrs = [`id="${annotation.id}"`, `status="${annotation.status}"`];
  
  if (annotation.resolvedAt) {
    attrs.push(`resolved-at="${annotation.resolvedAt}"`);
  }
  
  let result = `\n<annotation ${attrs.join(' ')}>\n\n`;
  result += annotation.content;
  result += '\n\n';
  
  for (const comment of annotation.comments) {
    result += `<comment by="${comment.by}" time="${comment.time}">\n`;
    result += comment.content;
    result += '\n</comment>\n\n';
  }
  
  result += '</annotation>\n';
  
  return result;
}
