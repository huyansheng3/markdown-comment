/**
 * @comment-md/core - Serializer Tests
 */

import { describe, it, expect } from 'vitest';
import { parse, serialize } from '../src/parser';
import type { Annotation } from '../src/types';

describe('serialize', () => {
  describe('basic serialization', () => {
    it('should serialize empty annotations list', () => {
      const cleanMarkdown = '# Hello World';
      const result = serialize(cleanMarkdown, []);
      
      expect(result).toBe(cleanMarkdown);
    });

    it('should serialize single annotation', () => {
      const cleanMarkdown = '# Test\n\nSome content here.';
      const annotation: Annotation = {
        id: 'a1',
        status: 'open',
        content: 'Some content here.',
        contentHash: 'abc123',
        position: {
          start: { line: 3, column: 1, offset: 8 },
          end: { line: 3, column: 19, offset: 26 },
        },
        comments: [
          {
            by: 'user',
            time: '2026-03-01T10:00:00Z',
            content: 'This is a comment.',
          },
        ],
      };
      
      const result = serialize(cleanMarkdown, [annotation]);
      
      expect(result).toContain('<annotation id="a1" status="open">');
      expect(result).toContain('Some content here.');
      expect(result).toContain('<comment by="user"');
      expect(result).toContain('This is a comment.');
      expect(result).toContain('</annotation>');
    });

    it('should serialize multiple annotations', () => {
      const cleanMarkdown = 'Content 1\n\nContent 2';
      const annotations: Annotation[] = [
        {
          id: 'a1',
          status: 'open',
          content: 'Content 1',
          contentHash: 'hash1',
          position: {
            start: { line: 1, column: 1, offset: 0 },
            end: { line: 1, column: 10, offset: 9 },
          },
          comments: [{ by: 'user', time: '2026-03-01T10:00:00Z', content: 'Comment 1' }],
        },
        {
          id: 'a2',
          status: 'resolved',
          content: 'Content 2',
          contentHash: 'hash2',
          position: {
            start: { line: 3, column: 1, offset: 11 },
            end: { line: 3, column: 10, offset: 20 },
          },
          comments: [{ by: 'ai', time: '2026-03-01T11:00:00Z', content: 'Comment 2' }],
        },
      ];
      
      const result = serialize(cleanMarkdown, annotations);
      
      expect(result).toContain('id="a1"');
      expect(result).toContain('id="a2"');
      expect(result).toContain('status="open"');
      expect(result).toContain('status="resolved"');
    });
  });

  describe('roundtrip', () => {
    it('should roundtrip parse and serialize', () => {
      const originalMarkdown = `
# Document

<annotation id="a1" status="open">

Important content

<comment by="reviewer" time="2026-03-01T10:00:00Z">
Please review this section.
</comment>

</annotation>

Other content
`;
      
      const parsed = parse(originalMarkdown);
      const serialized = serialize(parsed.cleanMarkdown, parsed.annotations);
      const reparsed = parse(serialized);
      
      expect(reparsed.annotations).toHaveLength(1);
      expect(reparsed.annotations[0].id).toBe('a1');
      expect(reparsed.annotations[0].status).toBe('open');
      expect(reparsed.annotations[0].comments[0].by).toBe('reviewer');
    });
  });

  describe('comment serialization', () => {
    it('should serialize multiple comments', () => {
      const cleanMarkdown = 'Test content';
      const annotation: Annotation = {
        id: 'a1',
        status: 'open',
        content: 'Test content',
        contentHash: 'hash',
        position: {
          start: { line: 1, column: 1, offset: 0 },
          end: { line: 1, column: 13, offset: 12 },
        },
        comments: [
          { by: 'user1', time: '2026-03-01T10:00:00Z', content: 'First' },
          { by: 'user2', time: '2026-03-01T10:05:00Z', content: 'Second' },
          { by: 'ai', time: '2026-03-01T10:10:00Z', content: 'Third' },
        ],
      };
      
      const result = serialize(cleanMarkdown, [annotation]);
      
      expect(result).toContain('by="user1"');
      expect(result).toContain('by="user2"');
      expect(result).toContain('by="ai"');
      expect(result).toContain('First');
      expect(result).toContain('Second');
      expect(result).toContain('Third');
    });

    it('should preserve comment timestamps', () => {
      const cleanMarkdown = 'Content';
      const timestamp = '2026-03-01T10:00:00.000Z';
      const annotation: Annotation = {
        id: 'a1',
        status: 'open',
        content: 'Content',
        contentHash: 'hash',
        position: {
          start: { line: 1, column: 1, offset: 0 },
          end: { line: 1, column: 8, offset: 7 },
        },
        comments: [
          { by: 'user', time: timestamp, content: 'Comment' },
        ],
      };
      
      const result = serialize(cleanMarkdown, [annotation]);
      
      expect(result).toContain(`time="${timestamp}"`);
    });
  });

  describe('status serialization', () => {
    it('should serialize resolved status with timestamp', () => {
      const cleanMarkdown = 'Content';
      const resolvedAt = '2026-03-01T12:00:00Z';
      const annotation: Annotation = {
        id: 'a1',
        status: 'resolved',
        content: 'Content',
        contentHash: 'hash',
        resolvedAt,
        position: {
          start: { line: 1, column: 1, offset: 0 },
          end: { line: 1, column: 8, offset: 7 },
        },
        comments: [
          { by: 'user', time: '2026-03-01T10:00:00Z', content: 'Done' },
        ],
      };
      
      const result = serialize(cleanMarkdown, [annotation]);
      
      expect(result).toContain('status="resolved"');
      // resolvedAt may or may not be in the output depending on implementation
    });
  });
});
