/**
 * @comment-md/core - API: applyEdits
 * 
 * Apply edits to the document and auto-resolve changed annotations
 */

import { parse, serialize } from '../parser';
import type { ApplyEditsResult, Annotation } from '../types';
import { hashContent, getCurrentTimestamp } from '../utils';

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
 * Create a new annotation on content
 */
export function createAnnotation(
  source: string,
  options: {
    id?: string;
    content: string;
    comment: { by: string; content: string };
  }
): { source: string; annotation: Annotation } {
  const parseResult = parse(source);
  
  const id = options.id || `c${Date.now().toString(36)}`;
  
  const newAnnotation: Annotation = {
    id,
    status: 'open',
    content: options.content,
    contentHash: hashContent(options.content),
    comments: [
      {
        by: options.comment.by,
        time: getCurrentTimestamp(),
        content: options.comment.content,
      },
    ],
    position: {
      start: { line: 0, column: 0 },
      end: { line: 0, column: 0 },
    },
  };
  
  parseResult.annotations.push(newAnnotation);
  
  return {
    source: serialize(parseResult.cleanMarkdown, parseResult.annotations),
    annotation: newAnnotation,
  };
}
