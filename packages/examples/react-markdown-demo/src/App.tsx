import React, { useState, useRef, useCallback, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { parse, type Annotation } from 'comment-md-core';
import { remarkCommentMd } from 'comment-md-remark-plugin';
import {
  CommentProvider,
  CommentSidebar,
  SelectionHandler,
  ThemeProvider,
  I18nProvider,
  defaultLightTheme,
  type Locale,
  useComments,
} from 'comment-md-react-ui';
import { sampleMarkdownChinese, sampleMarkdownEnglish } from './sampleContent';

// Light theme - Clean and minimal
const lightTheme = {
  ...defaultLightTheme,
  typography: {
    ...defaultLightTheme.typography,
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    fontFamilyMono: "'JetBrains Mono', 'Fira Code', monospace",
    fontFamilySerif: "'Source Serif 4', Georgia, serif",
  },
};

// Dark theme - Dark Slate Design
const darkTheme = {
  ...defaultLightTheme,
  colors: {
    ...defaultLightTheme.colors,
    bgPrimary: '#0f172a',
    bgSecondary: '#1e293b',
    bgTertiary: '#1a2234',
    bgElevated: '#243044',
    
    borderSubtle: 'rgba(148, 163, 184, 0.1)',
    borderDefault: 'rgba(148, 163, 184, 0.2)',
    borderStrong: 'rgba(148, 163, 184, 0.3)',
    
    textPrimary: '#f1f5f9',
    textSecondary: '#cbd5e1',
    textTertiary: '#94a3b8',
    textMuted: '#64748b',
    
    accentOpen: '#fbbf24',
    accentOpenLight: 'rgba(251, 191, 36, 0.15)',
    accentOpenDark: '#f59e0b',
    
    accentResolved: '#34d399',
    accentResolvedLight: 'rgba(52, 211, 153, 0.15)',
    
    accentPrimary: '#a78bfa',
    accentPrimaryLight: 'rgba(167, 139, 250, 0.15)',
    accentPrimaryDark: '#8b5cf6',
    
    accentAi: '#22d3ee',
    accentAiLight: 'rgba(34, 211, 238, 0.15)',
    
    accentDanger: '#fb7185',
    accentDangerLight: 'rgba(251, 113, 133, 0.15)',
  },
  typography: {
    ...defaultLightTheme.typography,
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    fontFamilyMono: "'JetBrains Mono', 'Fira Code', monospace",
    fontFamilySerif: "'Source Serif 4', Georgia, serif",
  },
  annotationHighlight: {
    ...defaultLightTheme.annotationHighlight,
    backgroundOpacity: 0.12,
    borderWidth: '0 0 2px 0',
    borderStyle: 'solid' as const,
    padding: '2px 4px',
    margin: '0 -4px',
    activeRingWidth: '2px',
    activeRingOpacity: 0.25,
  },
  shadow: {
    ...defaultLightTheme.shadow,
    sm: '0 2px 8px rgba(0, 0, 0, 0.2)',
    md: '0 8px 24px rgba(0, 0, 0, 0.3)',
    lg: '0 16px 48px rgba(0, 0, 0, 0.4)',
    xl: '0 24px 64px rgba(0, 0, 0, 0.5)',
  },
};

/**
 * Component to handle click events on annotated elements
 */
function AnnotationClickHandler({ containerRef }: { containerRef: React.RefObject<HTMLDivElement> }) {
  const { activeAnnotationId, setActiveAnnotation } = useComments();
  
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Find the closest element with data-annotation-id
      const annotatedElement = target.closest('[data-annotation-id]') as HTMLElement;
      
      if (annotatedElement) {
        const annotationId = annotatedElement.getAttribute('data-annotation-id');
        if (annotationId) {
          // Toggle annotation: if already active, deactivate; otherwise activate
          setActiveAnnotation(activeAnnotationId === annotationId ? null : annotationId);
        }
      }
    };
    
    container.addEventListener('click', handleClick);
    
    return () => {
      container.removeEventListener('click', handleClick);
    };
  }, [containerRef, activeAnnotationId, setActiveAnnotation]);
  
  // Update active class on elements
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    // Remove active class from all elements
    const allAnnotated = container.querySelectorAll('[data-annotation-id]');
    allAnnotated.forEach(el => {
      el.classList.remove('active');
    });
    
    // Add active class to the active annotation
    if (activeAnnotationId) {
      const activeElements = container.querySelectorAll(`[data-annotation-id="${activeAnnotationId}"]`);
      activeElements.forEach(el => {
        el.classList.add('active');
      });
    }
  }, [containerRef, activeAnnotationId]);
  
  return null;
}

function App() {
  const [locale, setLocale] = useState<Locale>('zh-CN');
  const [isDarkMode, setIsDarkMode] = useState(false); // 默认亮色主题
  const sampleMarkdown = locale === 'zh-CN' ? sampleMarkdownChinese : sampleMarkdownEnglish;
  const currentTheme = isDarkMode ? darkTheme : lightTheme;
  
  // Parse the markdown to extract annotations
  const [markdownSource, setMarkdownSource] = useState(sampleMarkdown);
  const [annotations, setAnnotations] = useState<Annotation[]>(() => {
    const result = parse(sampleMarkdown);
    return result.annotations;
  });
  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Handle annotations change from CommentProvider
  const handleAnnotationsChange = useCallback((newAnnotations: Annotation[]) => {
    console.log('Annotations updated:', newAnnotations);
    setAnnotations(newAnnotations);
  }, []);

  const handleCreateAnnotation = useCallback((annotation: {
    id: string;
    content: string;
    comment: { by: string; content: string };
  }) => {
    // Create annotation markup to insert into markdown source
    const annotationMarkup = `<annotation id="${annotation.id}" status="open">${annotation.content}<comment by="${annotation.comment.by}" time="${new Date().toISOString()}">${annotation.comment.content}</comment></annotation>`;
    
    const currentSource = markdownSource;
    const selectedText = annotation.content;
    const textIndex = currentSource.indexOf(selectedText);
    
    if (textIndex !== -1) {
      const updatedMarkdown = 
        currentSource.substring(0, textIndex) +
        annotationMarkup +
        currentSource.substring(textIndex + selectedText.length);
      
      setMarkdownSource(updatedMarkdown);
      const newParseResult = parse(updatedMarkdown);
      setAnnotations(newParseResult.annotations);
      
      setTimeout(() => {
        setActiveAnnotationId(annotation.id);
      }, 100);
      
      console.log('New annotation created:', annotation);
    } else {
      const newAnnotation: Annotation = {
        id: annotation.id,
        status: 'open',
        content: annotation.content,
        contentHash: '',
        position: {
          start: { line: 0, column: 0, offset: 0 },
          end: { line: 0, column: 0, offset: 0 },
        },
        comments: [
          {
            by: annotation.comment.by,
            time: new Date().toISOString(),
            content: annotation.comment.content,
          },
        ],
      };
      
      setAnnotations(prev => [...prev, newAnnotation]);
      
      setTimeout(() => {
        setActiveAnnotationId(annotation.id);
      }, 100);
      
      console.log('New annotation created (fallback):', annotation);
    }
  }, [markdownSource]);

  const handleLocaleChange = (newLocale: Locale) => {
    setLocale(newLocale);
    const newMarkdown = newLocale === 'zh-CN' ? sampleMarkdownChinese : sampleMarkdownEnglish;
    setMarkdownSource(newMarkdown);
    const newParseResult = parse(newMarkdown);
    setAnnotations(newParseResult.annotations);
    setActiveAnnotationId(null);
  };

  const handleActiveAnnotationChange = useCallback((id: string | null) => {
    setActiveAnnotationId(id);
  }, []);

  return (
    <I18nProvider locale={locale}>
      <ThemeProvider theme={currentTheme}>
        <CommentProvider
          annotations={annotations}
          onAnnotationsChange={handleAnnotationsChange}
          onActiveAnnotationChange={handleActiveAnnotationChange}
          currentUser="demo-user"
          activeAnnotationId={activeAnnotationId}
        >
          <div className="app-container" data-theme={isDarkMode ? 'dark' : 'light'}>
            {/* Main content area */}
            <div className="content-area">
              {/* Toolbar: Language + Theme switcher */}
              <div className="toolbar">
                <div className="language-switcher">
                  <button
                    className={locale === 'zh-CN' ? 'active' : ''}
                    onClick={() => handleLocaleChange('zh-CN')}
                  >
                    中文
                  </button>
                  <button
                    className={locale === 'en' ? 'active' : ''}
                    onClick={() => handleLocaleChange('en')}
                  >
                    English
                  </button>
                  <button
                    className={locale === 'ja' ? 'active' : ''}
                    onClick={() => handleLocaleChange('ja')}
                  >
                    日本語
                  </button>
                </div>
                
                {/* Theme switcher */}
                <div className="theme-switcher">
                  <button
                    className={isDarkMode ? 'active' : ''}
                    onClick={() => setIsDarkMode(true)}
                    title="深色主题"
                  >
                    🌙
                  </button>
                  <button
                    className={!isDarkMode ? 'active' : ''}
                    onClick={() => setIsDarkMode(false)}
                    title="浅色主题"
                  >
                    ☀️
                  </button>
                </div>
              </div>
              
              <div className="markdown-content" ref={contentRef}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath, remarkCommentMd]}
                  rehypePlugins={[rehypeKatex]}
                >
                  {markdownSource}
                </ReactMarkdown>
              </div>
              
              {/* Click handler for annotated elements */}
              <AnnotationClickHandler containerRef={contentRef} />
            </div>

            {/* Sidebar */}
            <CommentSidebar currentUser="demo-user" showAnnotationsList />
            
            {/* Selection Handler */}
            <SelectionHandler
              containerRef={contentRef}
              currentUser="demo-user"
              onCreateAnnotation={handleCreateAnnotation}
            />
          </div>
        </CommentProvider>
      </ThemeProvider>
    </I18nProvider>
  );
}

export default App;
