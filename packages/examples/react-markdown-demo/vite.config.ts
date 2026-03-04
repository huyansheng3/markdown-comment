import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  
  // 优化依赖预构建
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-markdown',
      'remark-gfm',
      'remark-math',
      'rehype-katex',
      'katex',
    ],
    // 排除 workspace 包，让它们实时编译
    exclude: [
      '@comment-md/core',
      '@comment-md/react-ui', 
      '@comment-md/remark-plugin',
    ],
  },
  
  // 解析 workspace 包
  resolve: {
    alias: {
      '@comment-md/core': path.resolve(__dirname, '../../packages/core/src'),
      '@comment-md/react-ui': path.resolve(__dirname, '../../packages/react-ui/src'),
      '@comment-md/remark-plugin': path.resolve(__dirname, '../../packages/remark-plugin/src'),
    },
  },
  
  // 服务器配置
  server: {
    // 预热常用文件
    warmup: {
      clientFiles: [
        './src/App.tsx',
        './src/sampleContent.ts',
      ],
    },
  },
  
  // 构建优化
  build: {
    // 分割 vendor chunks
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'markdown-vendor': ['react-markdown', 'remark-gfm', 'remark-math', 'rehype-katex'],
          'katex': ['katex'],
        },
      },
    },
  },
});
