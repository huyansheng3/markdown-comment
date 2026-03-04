/**
 * @comment-md/react-ui - Comment Context
 * 
 * React Context for managing annotation and comment state
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import type { Annotation, Comment } from 'comment-md-core';

/**
 * Context value interface
 */
export interface CommentContextValue {
  /** All annotations in the document */
  annotations: Annotation[];
  /** Currently active/selected annotation ID */
  activeAnnotationId: string | null;
  /** Set the active annotation */
  setActiveAnnotation: (id: string | null) => void;
  /** Add a comment to an annotation */
  addComment: (annotationId: string, comment: Omit<Comment, 'time'>) => void;
  /** Resolve (close) an annotation thread */
  resolveThread: (annotationId: string) => void;
  /** Reopen a resolved annotation */
  reopenThread: (annotationId: string) => void;
  /** Delete an annotation */
  deleteThread: (annotationId: string) => void;
  /** Get annotation by ID */
  getAnnotation: (id: string) => Annotation | undefined;
  /** Check if an annotation is active */
  isActive: (id: string) => boolean;
  /** Callback when annotations change */
  onAnnotationsChange?: (annotations: Annotation[]) => void;
}

const CommentContext = createContext<CommentContextValue | null>(null);

/**
 * Props for CommentProvider
 */
export interface CommentProviderProps {
  /** Initial annotations */
  annotations?: Annotation[];
  /** Children */
  children: ReactNode;
  /** Callback when annotations change */
  onAnnotationsChange?: (annotations: Annotation[]) => void;
  /** Current user identity for new comments */
  currentUser?: string;
  /** Callback when active annotation changes */
  onActiveAnnotationChange?: (id: string | null) => void;
}

/**
 * Provider component for comment context
 */
export function CommentProvider({
  children,
  annotations: initialAnnotations = [],
  onAnnotationsChange,
  onActiveAnnotationChange,
  currentUser = 'user',
  activeAnnotationId: externalActiveId,
}: CommentProviderProps & { activeAnnotationId?: string | null }) {
  // Use internal state for annotations
  const [internalAnnotations, setInternalAnnotations] = useState<Annotation[]>(initialAnnotations);
  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(
    externalActiveId ?? null
  );
  
  // Track the previous initialAnnotations to detect external changes
  const prevInitialAnnotationsRef = React.useRef<Annotation[]>(initialAnnotations);
  // Track if we're in the middle of an internal update
  const isInternalUpdateRef = React.useRef(false);
  
  // Only sync from external when initialAnnotations reference actually changes
  // (e.g., locale change, initial load) not when we update internally
  React.useEffect(() => {
    // Skip if this is an internal update notification coming back
    if (isInternalUpdateRef.current) {
      isInternalUpdateRef.current = false;
      prevInitialAnnotationsRef.current = initialAnnotations;
      return;
    }
    // Compare by reference - if parent provides new array, sync it
    if (prevInitialAnnotationsRef.current !== initialAnnotations) {
      setInternalAnnotations(initialAnnotations);
      prevInitialAnnotationsRef.current = initialAnnotations;
    }
  }, [initialAnnotations]);

  // Sync active annotation when external prop changes
  React.useEffect(() => {
    if (externalActiveId !== undefined) {
      setActiveAnnotationId(externalActiveId);
    }
  }, [externalActiveId]);

  // Wrapper to notify parent of changes
  const updateAnnotations = useCallback(
    (updater: (prev: Annotation[]) => Annotation[]) => {
      setInternalAnnotations((prev) => {
        const next = updater(prev);
        // Mark as internal update to prevent re-sync
        isInternalUpdateRef.current = true;
        // Notify parent but don't expect it to control our state
        onAnnotationsChange?.(next);
        return next;
      });
    },
    [onAnnotationsChange]
  );

  const setActiveAnnotation = useCallback((id: string | null) => {
    setActiveAnnotationId(id);
    // Notify parent of active annotation change
    onActiveAnnotationChange?.(id);
  }, [onActiveAnnotationChange]);

  const addComment = useCallback(
    (annotationId: string, comment: Omit<Comment, 'time'>) => {
      updateAnnotations((prev) =>
        prev.map((ann) =>
          ann.id === annotationId
            ? {
                ...ann,
                comments: [
                  ...ann.comments,
                  {
                    ...comment,
                    time: new Date().toISOString(),
                  },
                ],
              }
            : ann
        )
      );
    },
    [updateAnnotations]
  );

  const resolveThread = useCallback(
    (annotationId: string) => {
      updateAnnotations((prev) =>
        prev.map((ann) =>
          ann.id === annotationId
            ? {
                ...ann,
                status: 'resolved' as const,
                resolvedAt: new Date().toISOString(),
              }
            : ann
        )
      );
    },
    [updateAnnotations]
  );

  const reopenThread = useCallback(
    (annotationId: string) => {
      updateAnnotations((prev) =>
        prev.map((ann) =>
          ann.id === annotationId
            ? {
                ...ann,
                status: 'open' as const,
                resolvedAt: undefined,
              }
            : ann
        )
      );
    },
    [updateAnnotations]
  );

  const deleteThread = useCallback(
    (annotationId: string) => {
      updateAnnotations((prev) => prev.filter((ann) => ann.id !== annotationId));
      if (activeAnnotationId === annotationId) {
        setActiveAnnotationId(null);
      }
    },
    [updateAnnotations, activeAnnotationId]
  );

  const getAnnotation = useCallback(
    (id: string) => internalAnnotations.find((ann) => ann.id === id),
    [internalAnnotations]
  );

  const isActive = useCallback(
    (id: string) => activeAnnotationId === id,
    [activeAnnotationId]
  );

  const value = useMemo<CommentContextValue>(
    () => ({
      annotations: internalAnnotations,
      activeAnnotationId,
      setActiveAnnotation,
      addComment,
      resolveThread,
      reopenThread,
      deleteThread,
      getAnnotation,
      isActive,
      onAnnotationsChange,
    }),
    [
      internalAnnotations,
      activeAnnotationId,
      setActiveAnnotation,
      addComment,
      resolveThread,
      reopenThread,
      deleteThread,
      getAnnotation,
      isActive,
      onAnnotationsChange,
    ]
  );

  return (
    <CommentContext.Provider value={value}>{children}</CommentContext.Provider>
  );
}

/**
 * Hook to access comment context
 */
export function useComments(): CommentContextValue {
  const context = useContext(CommentContext);
  if (!context) {
    throw new Error('useComments must be used within a CommentProvider');
  }
  return context;
}

/**
 * Hook to get a specific annotation
 */
export function useAnnotation(id: string): Annotation | undefined {
  const { getAnnotation } = useComments();
  return getAnnotation(id);
}

/**
 * Hook to check if an annotation is active
 */
export function useIsAnnotationActive(id: string): boolean {
  const { isActive } = useComments();
  return isActive(id);
}
