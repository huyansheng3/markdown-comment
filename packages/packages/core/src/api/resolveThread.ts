/**
 * @comment-md/core - API: resolveThread
 * 
 * Resolve (close) an annotation thread
 */

import { parse, serialize } from '../parser';
import type { ResolveOptions, ResolveAction } from '../types';
import { getCurrentTimestamp } from '../utils';

/**
 * Resolve an annotation thread
 * 
 * @param source - Original markdown source
 * @param threadId - ID of the thread to resolve
 * @param options - Resolution options
 * @returns Updated markdown source
 */
export function resolveThread(
  source: string,
  threadId: string,
  options: ResolveOptions = { action: 'archive' }
): string {
  const { action, message, resolvedBy } = options;
  
  const parseResult = parse(source);
  const annotation = parseResult.annotations.find(a => a.id === threadId);
  
  if (!annotation) {
    throw new Error(`Annotation with id "${threadId}" not found`);
  }
  
  if (annotation.status === 'resolved') {
    // Already resolved, return unchanged
    return source;
  }
  
  // Handle based on action
  if (action === 'delete') {
    // Remove the annotation entirely
    const updatedAnnotations = parseResult.annotations.filter(a => a.id !== threadId);
    return serialize(parseResult.cleanMarkdown, updatedAnnotations);
  }
  
  // Archive: mark as resolved and keep
  annotation.status = 'resolved';
  annotation.resolvedAt = getCurrentTimestamp();
  
  // Add resolution comment if message provided
  if (message) {
    annotation.comments.push({
      by: resolvedBy || 'system',
      time: getCurrentTimestamp(),
      content: `**Resolved**: ${message}`,
    });
  }
  
  return serialize(parseResult.cleanMarkdown, parseResult.annotations);
}

/**
 * Batch resolve multiple threads
 */
export function resolveThreads(
  source: string,
  threadIds: string[],
  options: ResolveOptions = { action: 'archive' }
): string {
  let result = source;
  
  for (const id of threadIds) {
    try {
      result = resolveThread(result, id, options);
    } catch (e) {
      // Skip non-existent threads silently
      console.warn(`Could not resolve thread ${id}: ${(e as Error).message}`);
    }
  }
  
  return result;
}

/**
 * Resolve all open threads
 */
export function resolveAllThreads(
  source: string,
  options: ResolveOptions = { action: 'archive' }
): string {
  const { annotations } = parse(source);
  const openIds = annotations
    .filter(a => a.status === 'open')
    .map(a => a.id);
  
  return resolveThreads(source, openIds, options);
}
