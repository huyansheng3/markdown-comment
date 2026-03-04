/**
 * @comment-md/core - Type Definitions
 */

/**
 * Position information for source location tracking
 */
export interface Position {
  line: number;
  column: number;
  offset?: number;
}

/**
 * Range in the source document
 */
export interface Range {
  start: Position;
  end: Position;
}

/**
 * A single comment within an annotation thread
 */
export interface Comment {
  /** Comment author (username or 'ai') */
  by: string;
  /** ISO 8601 timestamp */
  time: string;
  /** Comment content (supports Markdown) */
  content: string;
}

/**
 * Annotation status
 */
export type AnnotationStatus = 'open' | 'resolved';

/**
 * An annotation block containing comments on a piece of content
 */
export interface Annotation {
  /** Unique identifier for the annotation */
  id: string;
  /** Current status */
  status: AnnotationStatus;
  /** The original content being commented on */
  content: string;
  /** Hash of the content for change detection */
  contentHash: string;
  /** List of comments in the thread */
  comments: Comment[];
  /** Position in the source document */
  position: Range;
  /** Timestamp when resolved (if applicable) */
  resolvedAt?: string;
}

/**
 * Diagnostic message from parsing
 */
export interface Diagnostic {
  /** Severity level */
  severity: 'error' | 'warning' | 'info';
  /** Human-readable message */
  message: string;
  /** Position in source */
  position?: Range;
}

/**
 * Result of parsing a document
 */
export interface ParseResult {
  /** Clean markdown without annotation markup */
  cleanMarkdown: string;
  /** Original source preserved */
  source: string;
  /** Extracted annotations */
  annotations: Annotation[];
  /** Any parsing issues */
  diagnostics: Diagnostic[];
}

/**
 * Options for the parse function
 */
export interface ParseOptions {
  /** Include resolved annotations (default: true) */
  includeResolved?: boolean;
  /** Calculate content hashes (default: true) */
  calculateHashes?: boolean;
}

/**
 * Options for exporting AI view
 */
export interface ExportAiViewOptions {
  /** Include only open annotations (default: true) */
  openOnly?: boolean;
  /** Include annotation metadata as comments (default: false) */
  includeMetadata?: boolean;
}

/**
 * Action for resolving a thread
 */
export type ResolveAction = 'delete' | 'archive';

/**
 * Options for resolving a thread
 */
export interface ResolveOptions {
  /** Action to take */
  action: ResolveAction;
  /** Resolution message (optional) */
  message?: string;
  /** Resolver identity */
  resolvedBy?: string;
}

/**
 * Result of applying edits
 */
export interface ApplyEditsResult {
  /** Updated source with annotations */
  source: string;
  /** Annotations that were auto-resolved due to content changes */
  autoResolved: string[];
  /** Annotations that remain open */
  stillOpen: string[];
}

/**
 * Serialization options
 */
export interface SerializeOptions {
  /** Include resolved annotations */
  includeResolved?: boolean;
  /** Archive section title (default: '## Archived Comments') */
  archiveSectionTitle?: string;
}
