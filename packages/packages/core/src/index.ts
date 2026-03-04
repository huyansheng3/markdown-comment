/**
 * @comment-md/core
 * 
 * Core library for parsing and manipulating Markdown documents with annotations
 */

// Types
export type {
  Position,
  Range,
  Comment,
  AnnotationStatus,
  Annotation,
  Diagnostic,
  ParseResult,
  ParseOptions,
  ExportAiViewOptions,
  ResolveAction,
  ResolveOptions,
  ApplyEditsResult,
  SerializeOptions,
} from './types';

// Parser
export { parse, serialize } from './parser';

// APIs
export { exportAiView, exportCleanMarkdown } from './api/exportAiView';
export { resolveThread, resolveThreads, resolveAllThreads } from './api/resolveThread';
export { applyEdits, addComment, createAnnotation } from './api/applyEdits';

// Utilities
export {
  hashContent,
  normalizeContent,
  generateId,
  getCurrentTimestamp,
  contentEquals,
} from './utils';
