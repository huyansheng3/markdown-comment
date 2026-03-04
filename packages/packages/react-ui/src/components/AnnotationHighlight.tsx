/**
 * @comment-md/react-ui - AnnotationHighlight Component
 * 
 * 简洁的评论高亮组件 - 易于集成到任何 React Markdown 渲染器
 * 
 * 设计原则：
 * 1. 不影响原有 Markdown 渲染样式
 * 2. 使用 CSS 类控制样式，便于外部自定义
 * 3. 根据内容类型自动选择合适的包裹元素（行内用 span，块级用 div）
 */

import React, { type ReactNode, type CSSProperties, useRef, useEffect, useState } from 'react';
import { useComments } from '../context/CommentContext';

/**
 * Props for AnnotationHighlight
 */
export interface AnnotationHighlightProps {
  /** Annotation ID */
  id: string;
  /** Annotation status */
  status: 'open' | 'resolved';
  /** Children (the annotated content) */
  children: ReactNode;
  /** Additional class name */
  className?: string;
  /** Additional styles */
  style?: CSSProperties;
  /** Click handler */
  onClick?: () => void;
}

/**
 * AnnotationHighlight component
 * 
 * 包裹被评论的内容，通过 CSS 类提供视觉高亮效果。
 * 自动检测内容类型，块级内容使用 div 包裹，行内内容使用 span 包裹。
 */
export function AnnotationHighlight({
  id,
  status,
  children,
  className = '',
  style = {},
  onClick,
}: AnnotationHighlightProps) {
  const { activeAnnotationId, setActiveAnnotation } = useComments();
  const isActive = activeAnnotationId === id;
  const containerRef = useRef<HTMLDivElement>(null);
  const [contentType, setContentType] = useState<'inline' | 'block'>('inline');
  
  // Detect content type after mount
  useEffect(() => {
    if (containerRef.current) {
      // Check if first significant child is a block element
      const firstBlock = containerRef.current.querySelector('pre, table, blockquote, ul, ol, div[class*="code"], .code-block');
      const hasBlock = firstBlock !== null;
      setContentType(hasBlock ? 'block' : 'inline');
    }
  }, [children]);
  
  const handleClick = (e: React.MouseEvent) => {
    // 点击链接时不阻止默认行为，但仍然激活 annotation
    const isLink = (e.target as HTMLElement).closest('a');
    if (isLink) {
      setActiveAnnotation(id);
      onClick?.();
      return;
    }
    
    // 其他可交互元素不触发
    if ((e.target as HTMLElement).closest('button, input, textarea')) {
      return;
    }
    
    // 切换激活状态
    setActiveAnnotation(isActive ? null : id);
    onClick?.();
  };
  
  // 构建 CSS 类名
  const classNames = [
    'comment-md-highlight',
    status,
    isActive ? 'active' : '',
    contentType === 'block' ? 'block-content' : 'inline-content',
    className,
  ].filter(Boolean).join(' ');
  
  // 根据内容类型选择包裹元素
  const Wrapper = contentType === 'block' ? 'div' : 'span';
  
  // 基础样式
  const baseStyle: CSSProperties = contentType === 'block' ? {
    // 块级内容的样式
    display: 'block',
    position: 'relative',
    ...style,
  } : {
    // 行内内容的样式
    ...style,
  };
  
  return (
    <Wrapper
      ref={containerRef as any}
      className={classNames}
      style={baseStyle}
      onClick={handleClick}
      data-annotation-id={id}
      data-annotation-status={status}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          setActiveAnnotation(isActive ? null : id);
          onClick?.();
        }
      }}
    >
      {children}
    </Wrapper>
  );
}

export default AnnotationHighlight;
