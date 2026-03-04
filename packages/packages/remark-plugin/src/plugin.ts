/**
 * @comment-md/remark-plugin - Main Plugin
 * 
 * Remark plugin that transforms annotation/comment HTML blocks
 * by adding data attributes to the annotated elements instead of wrapping them
 */

import { visit } from 'unist-util-visit';
import type { Plugin, Transformer } from 'unified';
import type { Root, Html, Parent, RootContent, Code, Table, List, Paragraph, Blockquote, Image } from 'mdast';

// Regex patterns
const ANNOTATION_OPEN_PATTERN = /<annotation\s+([^>]*)>\s*$/i;
const ANNOTATION_CLOSE_PATTERN = /^\s*<\/annotation>/i;
const COMMENT_OPEN_PATTERN = /<comment\s+([^>]*)>/i;
const COMMENT_CLOSE_PATTERN = /<\/comment>/i;

/**
 * Parse attributes from a tag attribute string
 */
function parseAttributes(attrString: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const pattern = /(\w+(?:-\w+)?)=["']([^"']*)["']/g;
  let match: RegExpExecArray | null;
  
  while ((match = pattern.exec(attrString)) !== null) {
    attrs[match[1]] = match[2];
  }
  
  return attrs;
}

/**
 * Check if an HTML node is an annotation opening tag
 */
function isAnnotationOpenTag(node: Html): boolean {
  return ANNOTATION_OPEN_PATTERN.test(node.value);
}

/**
 * Check if an HTML node is an annotation closing tag
 */
function isAnnotationCloseTag(node: Html): boolean {
  return ANNOTATION_CLOSE_PATTERN.test(node.value);
}

/**
 * Check if an HTML node is a comment tag
 */
function isCommentTag(node: Html): boolean {
  return COMMENT_OPEN_PATTERN.test(node.value);
}

/**
 * Check if an HTML node is a closing comment tag
 */
function isCommentCloseTag(node: Html): boolean {
  return COMMENT_CLOSE_PATTERN.test(node.value) && !COMMENT_OPEN_PATTERN.test(node.value);
}

/**
 * Add annotation attributes to a node
 */
function addAnnotationAttributes(node: any, annotationId: string, status: string): void {
  if (!node.data) {
    node.data = {};
  }
  if (!node.data.hProperties) {
    node.data.hProperties = {};
  }
  
  node.data.hProperties['data-annotation-id'] = annotationId;
  node.data.hProperties['data-annotation-status'] = status;
}

/**
 * Add annotation attributes to all significant nodes in the children array
 */
function annotateChildren(children: RootContent[], annotationId: string, status: string): RootContent[] {
  const result: RootContent[] = [];
  let inComment = false;
  
  for (const child of children) {
    // Skip comment tags
    if (child.type === 'html') {
      const htmlNode = child as Html;
      if (COMMENT_OPEN_PATTERN.test(htmlNode.value)) {
        inComment = true;
        if (COMMENT_CLOSE_PATTERN.test(htmlNode.value)) {
          inComment = false;
        }
        continue;
      }
      if (inComment && COMMENT_CLOSE_PATTERN.test(htmlNode.value)) {
        inComment = false;
        continue;
      }
    }
    
    if (inComment) {
      continue;
    }
    
    // Add annotation attributes to significant nodes
    if (child.type === 'code' || 
        child.type === 'table' || 
        child.type === 'list' || 
        child.type === 'blockquote' ||
        child.type === 'paragraph' ||
        child.type === 'heading' ||
        child.type === 'image') {
      addAnnotationAttributes(child, annotationId, status);
      result.push(child);
    } else {
      result.push(child);
    }
  }
  
  return result;
}

/**
 * Plugin options
 */
export interface RemarkCommentMdOptions {
  /** Whether to include resolved annotations (default: true) */
  includeResolved?: boolean;
}

/**
 * Remark plugin to process annotation and comment tags
 */
export const remarkCommentMd: Plugin<[RemarkCommentMdOptions?], Root> = (options = {}) => {
  const { includeResolved = true } = options;
  
  const transformer: Transformer<Root> = (tree: Root) => {
    visit(tree, (node: Parent) => {
      if (!('children' in node) || !Array.isArray(node.children)) {
        return;
      }
      
      const children = node.children as RootContent[];
      let i = 0;
      
      while (i < children.length) {
        const child = children[i];
        
        // Look for annotation opening tag
        if (child.type === 'html' && isAnnotationOpenTag(child as Html)) {
          const openTag = child as Html;
          const openMatch = ANNOTATION_OPEN_PATTERN.exec(openTag.value);
          
          if (openMatch) {
            const attrs = parseAttributes(openMatch[1]);
            const annotationId = attrs.id || '';
            const status = (attrs.status as 'open' | 'resolved') || 'open';
            
            // Find the closing tag
            let closeIndex = -1;
            for (let j = i + 1; j < children.length; j++) {
              const candidate = children[j];
              if (candidate.type === 'html' && isAnnotationCloseTag(candidate as Html)) {
                closeIndex = j;
                break;
              }
            }
            
            if (closeIndex > i) {
              // Extract children between open and close tags
              const annotationChildren = children.slice(i + 1, closeIndex);
              
              // Add annotation attributes to the children
              const annotatedChildren = annotateChildren(annotationChildren, annotationId, status);
              
              // Skip resolved if not including them
              if (!includeResolved && status === 'resolved') {
                // Remove all nodes from open to close
                children.splice(i, closeIndex - i + 1);
              } else {
                // Replace open tag through close tag with annotated children
                children.splice(i, closeIndex - i + 1, ...annotatedChildren);
                // Move past the inserted children
                i += annotatedChildren.length;
              }
              
              continue;
            }
          }
        }
        
        // Also filter out standalone comment tags
        if (child.type === 'html' && isCommentTag(child as Html)) {
          children.splice(i, 1);
          continue;
        }
        
        if (child.type === 'html' && isCommentCloseTag(child as Html)) {
          children.splice(i, 1);
          continue;
        }
        
        i++;
      }
    });
  };
  
  return transformer;
};

export default remarkCommentMd;
