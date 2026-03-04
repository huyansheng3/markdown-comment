/**
 * @comment-md/remark-plugin - Custom MDAST Node Types
 * 
 * Type definitions for annotation and comment nodes in the Markdown AST
 */

import type { Parent, Literal } from 'unist';
import type { PhrasingContent, BlockContent } from 'mdast';

/**
 * Annotation node in MDAST
 */
export interface AnnotationNode extends Parent {
  type: 'annotation';
  data: {
    hName: 'annotation';
    hProperties: {
      id: string;
      status: 'open' | 'resolved';
      'data-annotation-id': string;
    };
  };
  attributes: {
    id: string;
    status: 'open' | 'resolved';
    resolvedAt?: string;
  };
  children: Array<BlockContent | PhrasingContent | CommentNode>;
}

/**
 * Comment node in MDAST
 */
export interface CommentNode extends Parent {
  type: 'comment';
  data: {
    hName: 'comment';
    hProperties: {
      by: string;
      time: string;
      'data-comment-by': string;
    };
  };
  attributes: {
    by: string;
    time: string;
  };
  children: Array<PhrasingContent>;
}

/**
 * Declaration to extend MDAST types
 */
declare module 'mdast' {
  interface RootContentMap {
    annotation: AnnotationNode;
    comment: CommentNode;
  }
  
  interface BlockContentMap {
    annotation: AnnotationNode;
  }
}
