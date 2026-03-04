/**
 * @comment-md/remark-plugin - Plugin Tests
 */

import { describe, it, expect } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { remarkCommentMd } from '../src/plugin';
import type { Root, Parent } from 'mdast';
import type { AnnotationNode } from '../src/mdast-annotation';

/**
 * Helper to parse markdown and apply the plugin
 */
async function parseMarkdown(markdown: string, options = {}): Promise<Root> {
  const processor = unified()
    .use(remarkParse)
    .use(remarkCommentMd, options);
  
  return processor.runSync(processor.parse(markdown)) as Root;
}

/**
 * Find annotation nodes in the tree
 */
function findAnnotationNodes(tree: Root): AnnotationNode[] {
  const annotations: AnnotationNode[] = [];
  
  function walk(node: any) {
    if (node.type === 'annotation') {
      annotations.push(node as AnnotationNode);
    }
    if (node.children) {
      for (const child of node.children) {
        walk(child);
      }
    }
  }
  
  walk(tree);
  return annotations;
}

describe('remarkCommentMd plugin', () => {
  describe('basic transformation', () => {
    it('should parse markdown without annotations', async () => {
      const tree = await parseMarkdown('# Hello World\n\nThis is a test.');
      
      expect(tree.type).toBe('root');
      expect(tree.children.length).toBeGreaterThan(0);
      
      const annotations = findAnnotationNodes(tree);
      expect(annotations).toHaveLength(0);
    });

    it('should transform single-line annotation', async () => {
      const markdown = `
<annotation id="a1" status="open">

Content here

</annotation>
`;
      const tree = await parseMarkdown(markdown);
      const annotations = findAnnotationNodes(tree);
      
      expect(annotations).toHaveLength(1);
      expect(annotations[0].attributes.id).toBe('a1');
      expect(annotations[0].attributes.status).toBe('open');
    });

    it('should transform annotation with status', async () => {
      const markdown = `
<annotation id="a1" status="resolved">

Resolved content

</annotation>
`;
      const tree = await parseMarkdown(markdown);
      const annotations = findAnnotationNodes(tree);
      
      expect(annotations[0].attributes.status).toBe('resolved');
    });
  });

  describe('comment filtering', () => {
    it('should filter out comment tags from annotation children', async () => {
      const markdown = `
<annotation id="a1" status="open">

Main content

<comment by="user" time="2026-03-01T10:00:00Z">
This is a comment
</comment>

</annotation>
`;
      const tree = await parseMarkdown(markdown);
      const annotations = findAnnotationNodes(tree);
      
      expect(annotations).toHaveLength(1);
      
      // Check that comment tags are not in the children
      const hasCommentHtml = annotations[0].children.some(
        (child: any) => child.type === 'html' && child.value?.includes('<comment')
      );
      expect(hasCommentHtml).toBe(false);
    });

    it('should keep main content but remove comments', async () => {
      const markdown = `
<annotation id="a1" status="open">

This is the main content

<comment by="user" time="2026-03-01T10:00:00Z">Comment text</comment>

</annotation>
`;
      const tree = await parseMarkdown(markdown);
      const annotations = findAnnotationNodes(tree);
      
      // Should have the main content
      const hasParagraph = annotations[0].children.some(
        (child: any) => child.type === 'paragraph'
      );
      expect(hasParagraph).toBe(true);
    });
  });

  describe('multiple annotations', () => {
    it('should handle multiple annotations', async () => {
      const markdown = `
<annotation id="a1" status="open">

First annotation

</annotation>

Regular content

<annotation id="a2" status="resolved">

Second annotation

</annotation>
`;
      const tree = await parseMarkdown(markdown);
      const annotations = findAnnotationNodes(tree);
      
      expect(annotations).toHaveLength(2);
      expect(annotations[0].attributes.id).toBe('a1');
      expect(annotations[1].attributes.id).toBe('a2');
    });
  });

  describe('includeResolved option', () => {
    it('should include resolved annotations by default', async () => {
      const markdown = `
<annotation id="a1" status="resolved">

Resolved content

</annotation>
`;
      const tree = await parseMarkdown(markdown);
      const annotations = findAnnotationNodes(tree);
      
      expect(annotations).toHaveLength(1);
    });

    it('should exclude resolved annotations when includeResolved is false', async () => {
      const markdown = `
<annotation id="a1" status="open">

Open content

</annotation>

<annotation id="a2" status="resolved">

Resolved content

</annotation>
`;
      const tree = await parseMarkdown(markdown, { includeResolved: false });
      const annotations = findAnnotationNodes(tree);
      
      expect(annotations).toHaveLength(1);
      expect(annotations[0].attributes.id).toBe('a1');
    });
  });

  describe('node attributes', () => {
    it('should set hName and hProperties correctly', async () => {
      const markdown = `
<annotation id="test-id" status="open">

Content

</annotation>
`;
      const tree = await parseMarkdown(markdown);
      const annotations = findAnnotationNodes(tree);
      
      expect(annotations[0].data?.hName).toBe('annotation');
      expect(annotations[0].data?.hProperties?.id).toBe('test-id');
      expect(annotations[0].data?.hProperties?.status).toBe('open');
      expect(annotations[0].data?.hProperties?.['data-annotation-id']).toBe('test-id');
    });
  });

  describe('nested content', () => {
    it('should preserve list content inside annotation', async () => {
      const markdown = `
<annotation id="a1" status="open">

- Item 1
- Item 2
- Item 3

</annotation>
`;
      const tree = await parseMarkdown(markdown);
      const annotations = findAnnotationNodes(tree);
      
      expect(annotations).toHaveLength(1);
      
      const hasList = annotations[0].children.some(
        (child: any) => child.type === 'list'
      );
      expect(hasList).toBe(true);
    });

    it('should preserve code block inside annotation', async () => {
      const markdown = `
<annotation id="a1" status="open">

\`\`\`javascript
const x = 1;
\`\`\`

</annotation>
`;
      const tree = await parseMarkdown(markdown);
      const annotations = findAnnotationNodes(tree);
      
      expect(annotations).toHaveLength(1);
      
      const hasCode = annotations[0].children.some(
        (child: any) => child.type === 'code'
      );
      expect(hasCode).toBe(true);
    });

    it('should preserve heading inside annotation', async () => {
      const markdown = `
<annotation id="a1" status="open">

## Subheading

Content

</annotation>
`;
      const tree = await parseMarkdown(markdown);
      const annotations = findAnnotationNodes(tree);
      
      const hasHeading = annotations[0].children.some(
        (child: any) => child.type === 'heading'
      );
      expect(hasHeading).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle empty annotation', async () => {
      const markdown = `
<annotation id="empty" status="open">

</annotation>
`;
      const tree = await parseMarkdown(markdown);
      const annotations = findAnnotationNodes(tree);
      
      expect(annotations).toHaveLength(1);
      expect(annotations[0].attributes.id).toBe('empty');
    });

    it('should handle annotation with only whitespace', async () => {
      const markdown = `
<annotation id="ws" status="open">


   

</annotation>
`;
      const tree = await parseMarkdown(markdown);
      const annotations = findAnnotationNodes(tree);
      
      expect(annotations).toHaveLength(1);
    });
  });
});
