/**
 * @comment-md/core - API: applyEdits
 * 
 * Apply edits to the document and auto-resolve changed annotations
 */

import { parse, serialize } from '../parser';
import type { ApplyEditsResult, Annotation } from '../types';
import { hashContent, getCurrentTimestamp, generateId } from '../utils';

/**
 * Apply edits to the document and detect which annotations should be auto-resolved
 * 
 * @param originalSource - Original markdown with annotations
 * @param newCleanContent - New clean markdown content (without annotation markup)
 * @returns Result with updated source and lists of auto-resolved/still-open annotations
 */
export function applyEdits(
  originalSource: string,
  newCleanContent: string
): ApplyEditsResult {
  const parseResult = parse(originalSource);
  
  const autoResolved: string[] = [];
  const stillOpen: string[] = [];
  
  // Check each annotation to see if its content has changed
  for (const annotation of parseResult.annotations) {
    if (annotation.status === 'resolved') {
      // Already resolved, skip
      continue;
    }
    
    // Check if the referenced content still exists in the new content
    const contentExists = newCleanContent.includes(annotation.content.trim());
    
    if (!contentExists) {
      // Content was modified or removed - auto-resolve
      annotation.status = 'resolved';
      annotation.resolvedAt = getCurrentTimestamp();
      annotation.comments.push({
        by: 'system',
        time: getCurrentTimestamp(),
        content: '**Auto-resolved**: The referenced content was modified.',
      });
      autoResolved.push(annotation.id);
    } else {
      // Check if content hash changed (more precise check)
      const newHash = hashContent(annotation.content);
      if (newHash !== annotation.contentHash) {
        annotation.status = 'resolved';
        annotation.resolvedAt = getCurrentTimestamp();
        annotation.comments.push({
          by: 'system',
          time: getCurrentTimestamp(),
          content: '**Auto-resolved**: The referenced content was modified.',
        });
        autoResolved.push(annotation.id);
      } else {
        stillOpen.push(annotation.id);
      }
    }
  }
  
  // Serialize back with updated annotations
  const updatedSource = serialize(newCleanContent, parseResult.annotations);
  
  return {
    source: updatedSource,
    autoResolved,
    stillOpen,
  };
}

/**
 * Add a new comment to an existing annotation
 */
export function addComment(
  source: string,
  annotationId: string,
  comment: { by: string; content: string }
): string {
  const parseResult = parse(source);
  const annotation = parseResult.annotations.find(a => a.id === annotationId);
  
  if (!annotation) {
    throw new Error(`Annotation with id "${annotationId}" not found`);
  }
  
  annotation.comments.push({
    by: comment.by,
    time: getCurrentTimestamp(),
    content: comment.content,
  });
  
  return serialize(parseResult.cleanMarkdown, parseResult.annotations);
}

/**
 * Create a new annotation on content - inline in the source
 * This function finds the content in the source and wraps it with annotation tags
 */
export function createAnnotation(
  source: string,
  options: {
    id?: string;
    content: string;
    comment: { by: string; content: string; time?: string };
    position?: {
      start: { line: number; column: number };
      end: { line: number; column: number };
    };
  }
): string {
  const id = options.id || generateId();
  const time = options.comment.time || getCurrentTimestamp();
  
  // Find the content in the source
  const contentToWrap = options.content;
  const index = source.indexOf(contentToWrap);
  
  if (index === -1) {
    throw new Error(`Content not found in source: "${contentToWrap.substring(0, 50)}..."`);
  }
  
  // Build the annotation block
  const annotationStart = `<annotation id="${id}" status="open">\n\n`;
  const annotationEnd = `\n\n<comment by="${options.comment.by}" time="${time}">\n${options.comment.content}\n</comment>\n\n</annotation>`;
  
  // Replace the content with the annotated version
  const before = source.substring(0, index);
  const after = source.substring(index + contentToWrap.length);
  
  const newSource = before + annotationStart + contentToWrap + annotationEnd + after;
  
  return newSource;
}
