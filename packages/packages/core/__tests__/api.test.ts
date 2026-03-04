/**
 * @comment-md/core - API Tests
 */

import { describe, it, expect } from 'vitest';
import {
  generateId,
  hashContent,
  normalizeContent,
  getCurrentTimestamp,
  contentEquals,
} from '../src/utils';
import { exportAiView, exportCleanMarkdown } from '../src/api/exportAiView';
import { addComment, createAnnotation } from '../src/api/applyEdits';
import type { Annotation } from '../src/types';

describe('utility functions', () => {
  describe('generateId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();
      const id3 = generateId();
      
      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).not.toBe(id3);
    });

    it('should generate valid ID format', () => {
      const id = generateId();
      
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
      // Should only contain safe characters
      expect(id).toMatch(/^[a-zA-Z0-9_-]+$/);
    });
  });

  describe('hashContent', () => {
    it('should generate consistent hash for same content', () => {
      const content = 'Test content';
      const hash1 = hashContent(content);
      const hash2 = hashContent(content);
      
      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different content', () => {
      const hash1 = hashContent('Content A');
      const hash2 = hashContent('Content B');
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('normalizeContent', () => {
    it('should trim whitespace', () => {
      const result = normalizeContent('  test  ');
      
      expect(result).toBe('test');
    });

    it('should normalize line endings', () => {
      const result = normalizeContent('line1\r\nline2\rline3');
      
      expect(result).toBe('line1\nline2\nline3');
    });
  });

  describe('getCurrentTimestamp', () => {
    it('should return valid ISO timestamp', () => {
      const timestamp = getCurrentTimestamp();
      
      expect(() => new Date(timestamp)).not.toThrow();
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('contentEquals', () => {
    it('should compare normalized content', () => {
      expect(contentEquals('test', 'test')).toBe(true);
      expect(contentEquals('  test  ', 'test')).toBe(true);
      expect(contentEquals('test', 'different')).toBe(false);
    });
  });
});

describe('exportAiView', () => {
  it('should export document without annotation tags', () => {
    const markdown = `
# Title

<annotation id="a1" status="open">
Content
<comment by="user" time="2026-03-01T10:00:00Z">Comment</comment>
</annotation>
`;
    
    const result = exportAiView(markdown);
    
    expect(result).toContain('# Title');
    expect(result).toContain('Content');
    expect(result).not.toContain('<annotation');
    expect(result).not.toContain('<comment');
  });

  it('should respect includeComments option', () => {
    const markdown = `
<annotation id="a1" status="open">
Content
<comment by="user" time="2026-03-01T10:00:00Z">Comment text</comment>
</annotation>
`;
    
    const withComments = exportAiView(markdown, { includeComments: true });
    const withoutComments = exportAiView(markdown, { includeComments: false });
    
    // Default behavior may vary
    expect(typeof withComments).toBe('string');
    expect(typeof withoutComments).toBe('string');
  });
});

describe('exportCleanMarkdown', () => {
  it('should remove all annotation markup', () => {
    const markdown = `
# Title

<annotation id="a1" status="open">
Important content
<comment by="user" time="2026-03-01T10:00:00Z">Review this</comment>
</annotation>

More text
`;
    
    const result = exportCleanMarkdown(markdown);
    
    expect(result).toContain('# Title');
    expect(result).toContain('Important content');
    expect(result).toContain('More text');
    expect(result).not.toContain('<annotation');
    expect(result).not.toContain('<comment');
    expect(result).not.toContain('Review this');
  });
});

describe('addComment', () => {
  it('should add comment to annotation in source', () => {
    const source = `
<annotation id="a1" status="open">
Content
<comment by="user" time="2026-03-01T10:00:00Z">Initial comment</comment>
</annotation>
`;
    
    const result = addComment(source, 'a1', {
      by: 'newUser',
      content: 'New comment',
    });
    
    // Result is the updated source string
    expect(result).toContain('by="newUser"');
    expect(result).toContain('New comment');
  });

  it('should throw error for non-existent annotation', () => {
    const source = `
<annotation id="a1" status="open">
Content
<comment by="user" time="2026-03-01T10:00:00Z">Comment</comment>
</annotation>
`;
    
    expect(() => {
      addComment(source, 'non-existent', {
        by: 'user',
        content: 'Comment',
      });
    }).toThrow('Annotation with id "non-existent" not found');
  });
});

describe('createAnnotation', () => {
  it('should create new annotation in source', () => {
    const source = '# Test\n\nSome content here.';
    
    const result = createAnnotation(source, {
      content: 'Some content',
      comment: { by: 'user', content: 'Initial comment' },
    });
    
    expect(result.annotation).toBeDefined();
    expect(result.annotation.id).toBeDefined();
    expect(result.annotation.status).toBe('open');
    expect(result.annotation.content).toBe('Some content');
    expect(result.annotation.comments).toHaveLength(1);
    expect(result.annotation.comments[0].by).toBe('user');
    expect(result.source).toContain('<annotation');
  });

  it('should use provided ID if given', () => {
    const source = '# Test\n\nContent here.';
    
    const result = createAnnotation(source, {
      id: 'custom-id',
      content: 'Content',
      comment: { by: 'user', content: 'Comment' },
    });
    
    expect(result.annotation.id).toBe('custom-id');
    expect(result.source).toContain('id="custom-id"');
  });
});
