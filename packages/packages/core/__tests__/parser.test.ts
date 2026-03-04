/**
 * @comment-md/core - Parser Tests
 */

import { describe, it, expect } from 'vitest';
import { parse } from '../src/parser';

describe('parse', () => {
  describe('basic parsing', () => {
    it('should parse empty document', () => {
      const result = parse('');
      
      expect(result.cleanMarkdown).toBe('');
      expect(result.annotations).toHaveLength(0);
      expect(result.diagnostics).toHaveLength(0);
    });

    it('should parse document without annotations', () => {
      const markdown = '# Hello World\n\nThis is a test.';
      const result = parse(markdown);
      
      expect(result.cleanMarkdown).toBe(markdown);
      expect(result.annotations).toHaveLength(0);
    });

    it('should parse single annotation', () => {
      const markdown = `
# Test

<annotation id="a1" status="open">

This is annotated content.

<comment by="user" time="2026-03-01T10:00:00Z">
This is a comment.
</comment>

</annotation>
`;
      const result = parse(markdown);
      
      expect(result.annotations).toHaveLength(1);
      expect(result.annotations[0].id).toBe('a1');
      expect(result.annotations[0].status).toBe('open');
      expect(result.annotations[0].comments).toHaveLength(1);
      expect(result.annotations[0].comments[0].by).toBe('user');
      expect(result.annotations[0].comments[0].content).toBe('This is a comment.');
    });

    it('should parse multiple annotations', () => {
      const markdown = `
<annotation id="a1" status="open">
Content 1
<comment by="user" time="2026-03-01T10:00:00Z">Comment 1</comment>
</annotation>

<annotation id="a2" status="resolved">
Content 2
<comment by="ai" time="2026-03-01T11:00:00Z">Comment 2</comment>
</annotation>
`;
      const result = parse(markdown);
      
      expect(result.annotations).toHaveLength(2);
      expect(result.annotations[0].id).toBe('a1');
      expect(result.annotations[0].status).toBe('open');
      expect(result.annotations[1].id).toBe('a2');
      expect(result.annotations[1].status).toBe('resolved');
    });
  });

  describe('comment parsing', () => {
    it('should parse multiple comments in single annotation', () => {
      const markdown = `
<annotation id="a1" status="open">
Content
<comment by="human" time="2026-03-01T10:00:00Z">First comment</comment>
<comment by="ai" time="2026-03-01T10:05:00Z">Second comment</comment>
<comment by="human" time="2026-03-01T10:10:00Z">Third comment</comment>
</annotation>
`;
      const result = parse(markdown);
      
      expect(result.annotations[0].comments).toHaveLength(3);
      expect(result.annotations[0].comments[0].by).toBe('human');
      expect(result.annotations[0].comments[1].by).toBe('ai');
      expect(result.annotations[0].comments[2].by).toBe('human');
    });

    it('should handle multiline comment content', () => {
      const markdown = `
<annotation id="a1" status="open">
Content
<comment by="user" time="2026-03-01T10:00:00Z">
Line 1
Line 2
Line 3
</comment>
</annotation>
`;
      const result = parse(markdown);
      
      expect(result.annotations[0].comments[0].content).toBe('Line 1\nLine 2\nLine 3');
    });
  });

  describe('status parsing', () => {
    it('should default status to "open"', () => {
      const markdown = `
<annotation id="a1">
Content
<comment by="user" time="2026-03-01T10:00:00Z">Comment</comment>
</annotation>
`;
      const result = parse(markdown);
      
      expect(result.annotations[0].status).toBe('open');
    });

    it('should parse resolved status', () => {
      const markdown = `
<annotation id="a1" status="resolved">
Content
<comment by="user" time="2026-03-01T10:00:00Z">Comment</comment>
</annotation>
`;
      const result = parse(markdown);
      
      expect(result.annotations[0].status).toBe('resolved');
    });
  });

  describe('clean markdown', () => {
    it('should remove annotation tags from clean markdown', () => {
      const markdown = `
# Title

<annotation id="a1" status="open">

Some content

<comment by="user" time="2026-03-01T10:00:00Z">Comment</comment>

</annotation>

More content
`;
      const result = parse(markdown);
      
      expect(result.cleanMarkdown).toContain('# Title');
      expect(result.cleanMarkdown).toContain('Some content');
      expect(result.cleanMarkdown).toContain('More content');
      expect(result.cleanMarkdown).not.toContain('<annotation');
      expect(result.cleanMarkdown).not.toContain('<comment');
    });
  });

  describe('content hash', () => {
    it('should generate content hash for annotations', () => {
      const markdown = `
<annotation id="a1" status="open">
Test content
<comment by="user" time="2026-03-01T10:00:00Z">Comment</comment>
</annotation>
`;
      const result = parse(markdown);
      
      expect(result.annotations[0].contentHash).toBeDefined();
      expect(result.annotations[0].contentHash.length).toBeGreaterThan(0);
    });

    it('should generate different hashes for different content', () => {
      const markdown1 = `
<annotation id="a1" status="open">
Content A
<comment by="user" time="2026-03-01T10:00:00Z">Comment</comment>
</annotation>
`;
      const markdown2 = `
<annotation id="a1" status="open">
Content B
<comment by="user" time="2026-03-01T10:00:00Z">Comment</comment>
</annotation>
`;
      const result1 = parse(markdown1);
      const result2 = parse(markdown2);
      
      expect(result1.annotations[0].contentHash).not.toBe(result2.annotations[0].contentHash);
    });
  });

  describe('position tracking', () => {
    it('should track annotation position', () => {
      const markdown = `Line 1
<annotation id="a1" status="open">
Content
<comment by="user" time="2026-03-01T10:00:00Z">Comment</comment>
</annotation>`;
      
      const result = parse(markdown);
      
      expect(result.annotations[0].position).toBeDefined();
      expect(result.annotations[0].position.start.line).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should handle annotation with no comments', () => {
      const markdown = `
<annotation id="a1" status="open">
Content without comments
</annotation>
`;
      const result = parse(markdown);
      
      expect(result.annotations).toHaveLength(1);
      expect(result.annotations[0].comments).toHaveLength(0);
      expect(result.annotations[0].content).toBe('Content without comments');
    });

    it('should handle special characters in content', () => {
      const markdown = `
<annotation id="a1" status="open">
Content with <code>HTML</code> and \`backticks\`
<comment by="user" time="2026-03-01T10:00:00Z">Comment with **bold**</comment>
</annotation>
`;
      const result = parse(markdown);
      
      expect(result.annotations[0].content).toContain('<code>HTML</code>');
      expect(result.annotations[0].comments[0].content).toContain('**bold**');
    });
  });
});
