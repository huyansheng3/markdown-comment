import { describe, it, expect } from 'vitest';
import { parse, serialize } from '../src/parser';
import { hashContent, normalizeContent } from '../src/utils';

describe('parse', () => {
  it('should parse a simple annotation', () => {
    const source = `
# Test

<annotation id="c1" status="open">

This is annotated content.

<comment by="human" time="2026-02-28T14:00:00Z">
This needs work.
</comment>

</annotation>
`;

    const result = parse(source);

    expect(result.annotations).toHaveLength(1);
    expect(result.annotations[0].id).toBe('c1');
    expect(result.annotations[0].status).toBe('open');
    expect(result.annotations[0].content).toContain('This is annotated content');
    expect(result.annotations[0].comments).toHaveLength(1);
    expect(result.annotations[0].comments[0].by).toBe('human');
    expect(result.annotations[0].comments[0].content).toBe('This needs work.');
  });

  it('should extract clean markdown', () => {
    const source = `
# Test

<annotation id="c1" status="open">

Annotated content.

<comment by="human" time="2026-02-28T14:00:00Z">
Comment.
</comment>

</annotation>

Normal content.
`;

    const result = parse(source);

    expect(result.cleanMarkdown).toContain('# Test');
    expect(result.cleanMarkdown).toContain('Annotated content.');
    expect(result.cleanMarkdown).toContain('Normal content.');
    expect(result.cleanMarkdown).not.toContain('<annotation');
    expect(result.cleanMarkdown).not.toContain('<comment');
  });

  it('should parse multiple annotations', () => {
    const source = `
<annotation id="c1" status="open">
Content 1
<comment by="human" time="2026-02-28T14:00:00Z">Comment 1</comment>
</annotation>

<annotation id="c2" status="resolved">
Content 2
<comment by="ai" time="2026-02-28T14:05:00Z">Comment 2</comment>
</annotation>
`;

    const result = parse(source);

    expect(result.annotations).toHaveLength(2);
    expect(result.annotations[0].id).toBe('c1');
    expect(result.annotations[0].status).toBe('open');
    expect(result.annotations[1].id).toBe('c2');
    expect(result.annotations[1].status).toBe('resolved');
  });

  it('should parse multiple comments in a thread', () => {
    const source = `
<annotation id="c1" status="open">

Content

<comment by="human" time="2026-02-28T14:00:00Z">
First comment
</comment>

<comment by="ai" time="2026-02-28T14:05:00Z">
Reply from AI
</comment>

<comment by="human" time="2026-02-28T14:10:00Z">
Follow up
</comment>

</annotation>
`;

    const result = parse(source);

    expect(result.annotations[0].comments).toHaveLength(3);
    expect(result.annotations[0].comments[0].by).toBe('human');
    expect(result.annotations[0].comments[1].by).toBe('ai');
    expect(result.annotations[0].comments[2].by).toBe('human');
  });

  it('should calculate content hash', () => {
    const source = `
<annotation id="c1" status="open">
Test content
<comment by="human" time="2026-02-28T14:00:00Z">Comment</comment>
</annotation>
`;

    const result = parse(source, { calculateHashes: true });

    expect(result.annotations[0].contentHash).toBeTruthy();
    expect(result.annotations[0].contentHash).toMatch(/^[0-9a-f]+$/);
  });

  it('should detect duplicate IDs', () => {
    const source = `
<annotation id="c1" status="open">
Content 1
<comment by="human" time="2026-02-28T14:00:00Z">Comment</comment>
</annotation>

<annotation id="c1" status="open">
Content 2
<comment by="ai" time="2026-02-28T14:00:00Z">Comment</comment>
</annotation>
`;

    const result = parse(source);

    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0].severity).toBe('warning');
    expect(result.diagnostics[0].message).toContain('Duplicate');
  });
});

describe('utils', () => {
  describe('normalizeContent', () => {
    it('should normalize whitespace', () => {
      const input = '  hello   world  \n\n\n  test  ';
      const result = normalizeContent(input);
      expect(result).toBe('hello world\ntest');
    });

    it('should normalize line endings', () => {
      const input = 'line1\r\nline2\rline3\nline4';
      const result = normalizeContent(input);
      expect(result).toBe('line1\nline2\nline3\nline4');
    });
  });

  describe('hashContent', () => {
    it('should return consistent hash', () => {
      const content = 'test content';
      const hash1 = hashContent(content);
      const hash2 = hashContent(content);
      expect(hash1).toBe(hash2);
    });

    it('should be whitespace-insensitive', () => {
      const hash1 = hashContent('hello world');
      const hash2 = hashContent('hello   world');
      expect(hash1).toBe(hash2);
    });

    it('should differ for different content', () => {
      const hash1 = hashContent('content a');
      const hash2 = hashContent('content b');
      expect(hash1).not.toBe(hash2);
    });
  });
});
