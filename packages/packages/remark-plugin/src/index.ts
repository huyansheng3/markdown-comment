/**
 * @comment-md/remark-plugin
 * 
 * Remark plugin for parsing and transforming comment-md annotations
 */

// Plugin
export { remarkCommentMd, default } from './plugin';
export type { RemarkCommentMdOptions } from './plugin';

// MDAST types
export type { AnnotationNode, CommentNode } from './mdast-annotation';
