/**
 * @comment-md/core - API: exportAiView
 * 
 * Export a clean view of the document optimized for AI processing
 */

import { parse } from '../parser';
import type { ExportAiViewOptions } from '../types';

/**
 * Export a markdown view optimized for AI processing
 * 
 * - Only includes open annotations
 * - Formats annotations in a clear, parseable way
 * - Removes resolved/archived content to reduce noise
 */
export function exportAiView(
  source: string,
  options: ExportAiViewOptions = {}
): string {
  const { openOnly = true, includeMetadata = false } = options;
  
  const { annotations, cleanMarkdown } = parse(source, {
    includeResolved: !openOnly,
  });
  
  // Filter to only open annotations if requested
  const relevantAnnotations = openOnly
    ? annotations.filter(a => a.status === 'open')
    : annotations;
  
  if (relevantAnnotations.length === 0) {
    return cleanMarkdown;
  }
  
  // Build the AI-optimized view
  let result = cleanMarkdown;
  
  // Append a summary section for AI
  result += '\n\n---\n\n';
  result += '## Active Review Comments\n\n';
  result += `There are ${relevantAnnotations.length} open comment thread(s) that need attention:\n\n`;
  
  for (const ann of relevantAnnotations) {
    result += `### Thread ${ann.id}\n\n`;
    
    if (includeMetadata) {
      result += `- Status: ${ann.status}\n`;
      result += `- Comments: ${ann.comments.length}\n\n`;
    }
    
    result += '**Referenced content:**\n';
    result += '```\n';
    result += ann.content.trim();
    result += '\n```\n\n';
    
    result += '**Comments:**\n\n';
    for (const comment of ann.comments) {
      result += `- **${comment.by}**: ${comment.content}\n`;
    }
    result += '\n';
  }
  
  return result;
}

/**
 * Export only the clean markdown without any annotations
 */
export function exportCleanMarkdown(source: string): string {
  const { cleanMarkdown } = parse(source);
  return cleanMarkdown;
}
