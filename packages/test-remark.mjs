import { remarkCommentMd } from './packages/remark-plugin/dist/index.mjs';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';

const md = `
<annotation id="demo-4" status="open">

相关链接：[官方文档](https://example.com) | [GitHub](https://github.com)

<comment by="reviewer" time="2026-03-01T09:15:00Z">
测试评论
</comment>

</annotation>
`;

console.log('输入 Markdown:');
console.log(md);
console.log('\n---\n');

const processor = unified()
  .use(remarkParse)
  .use(remarkCommentMd);

const tree = processor.parse(md);
const transformedTree = await processor.run(tree);

console.log('转换后的 AST:');
console.log(JSON.stringify(transformedTree, null, 2));
