/**
 * @comment-md/react-ui
 * 
 * React components for rendering and managing comment-md annotations
 * 
 * @example Basic usage
 * ```tsx
 * import {
 *   CommentProvider,
 *   CommentSidebar,
 *   AnnotationHighlight,
 *   SelectionHandler,
 *   ThemeProvider,
 *   I18nProvider,
 * } from '@comment-md/react-ui';
 * 
 * function App() {
 *   return (
 *     <I18nProvider locale="zh-CN">
 *       <ThemeProvider theme={customTheme}>
 *         <CommentProvider annotations={annotations}>
 *           <div ref={contentRef}>
 *             <ReactMarkdown>{markdown}</ReactMarkdown>
 *           </div>
 *           <CommentSidebar />
 *           <SelectionHandler containerRef={contentRef} />
 *         </CommentProvider>
 *       </ThemeProvider>
 *     </I18nProvider>
 *   );
 * }
 * ```
 */

// Context
export { CommentProvider, useComments } from './context/CommentContext';
export type { CommentContextValue, CommentProviderProps } from './context/CommentContext';

// Theme
export { ThemeProvider, useTheme, defaultLightTheme, subtleHighlightStyle, underlineHighlightStyle } from './theme/ThemeProvider';
export type {
  CommentMdTheme,
  ThemeColors,
  ThemeTypography,
  ThemeSpacing,
  ThemeRadius,
  ThemeShadow,
  ThemeTransition,
  AnnotationHighlightStyle,
  SidebarStyle,
  ThemeProviderProps,
} from './theme/ThemeProvider';

// I18n
export { I18nProvider, useI18n, enStrings, zhCNStrings, jaStrings, locales } from './i18n/I18nProvider';
export type { I18nStrings, I18nContextValue, I18nProviderProps, Locale } from './i18n/I18nProvider';

// Components
export { AnnotationHighlight } from './components/AnnotationHighlight';
export type { AnnotationHighlightProps } from './components/AnnotationHighlight';

export { CommentSidebar } from './components/CommentSidebar';
export type { CommentSidebarProps } from './components/CommentSidebar';

export { CommentThread } from './components/CommentThread';
export type { CommentThreadProps } from './components/CommentThread';

export { CommentInput } from './components/CommentInput';
export type { CommentInputProps } from './components/CommentInput';

export { SelectionHandler } from './components/SelectionHandler';
export type { SelectionHandlerProps } from './components/SelectionHandler';
