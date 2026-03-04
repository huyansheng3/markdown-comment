/**
 * @comment-md/react-ui - Theme System
 * 
 * Provides customizable theming for all components
 */

import React, { createContext, useContext, type ReactNode } from 'react';

/**
 * Color palette for the theme
 */
export interface ThemeColors {
  // Background colors
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;
  bgElevated: string;
  
  // Border colors
  borderSubtle: string;
  borderDefault: string;
  borderStrong: string;
  
  // Text colors
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textMuted: string;
  
  // Accent colors - Open status
  accentOpen: string;
  accentOpenLight: string;
  accentOpenDark: string;
  
  // Accent colors - Resolved status
  accentResolved: string;
  accentResolvedLight: string;
  
  // Accent colors - Primary action
  accentPrimary: string;
  accentPrimaryLight: string;
  accentPrimaryDark: string;
  
  // Accent colors - AI
  accentAi: string;
  accentAiLight: string;
  
  // Accent colors - Danger
  accentDanger: string;
  accentDangerLight: string;
}

/**
 * Annotation highlight style configuration
 */
export interface AnnotationHighlightStyle {
  // Border style
  borderWidth: string;
  borderStyle: 'solid' | 'dashed' | 'dotted';
  borderRadius: string;
  
  // Background opacity (0-1)
  backgroundOpacity: number;
  
  // Active state
  activeRingWidth: string;
  activeRingOpacity: number;
  
  // Badge style
  badgeSize: string;
  badgeFontSize: string;
  showBadge: boolean;
  
  // Padding
  padding: string;
  margin: string;
}

/**
 * Sidebar style configuration
 */
export interface SidebarStyle {
  width: number | string;
  headerHeight: string;
  borderRadius: string;
}

/**
 * Typography configuration
 */
export interface ThemeTypography {
  fontFamily: string;
  fontFamilyMono: string;
  fontFamilySerif: string;
  fontSize: {
    xs: string;
    sm: string;
    base: string;
    lg: string;
    xl: string;
  };
  fontWeight: {
    normal: number;
    medium: number;
    semibold: number;
    bold: number;
  };
  lineHeight: {
    tight: number;
    normal: number;
    relaxed: number;
  };
}

/**
 * Spacing scale
 */
export interface ThemeSpacing {
  1: string;
  2: string;
  3: string;
  4: string;
  5: string;
  6: string;
  8: string;
  10: string;
  12: string;
}

/**
 * Border radius scale
 */
export interface ThemeRadius {
  none: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  full: string;
}

/**
 * Shadow scale
 */
export interface ThemeShadow {
  none: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
}

/**
 * Transition configuration
 */
export interface ThemeTransition {
  fast: string;
  base: string;
  slow: string;
}

/**
 * Complete theme configuration
 */
export interface CommentMdTheme {
  colors: ThemeColors;
  typography: ThemeTypography;
  spacing: ThemeSpacing;
  radius: ThemeRadius;
  shadow: ThemeShadow;
  transition: ThemeTransition;
  
  // Component-specific styles
  annotationHighlight: AnnotationHighlightStyle;
  sidebar: SidebarStyle;
}

/**
 * Default light theme
 */
export const defaultLightTheme: CommentMdTheme = {
  colors: {
    bgPrimary: '#fafaf9',
    bgSecondary: '#f5f5f4',
    bgTertiary: '#ffffff',
    bgElevated: '#ffffff',
    
    borderSubtle: '#e7e5e4',
    borderDefault: '#d6d3d1',
    borderStrong: '#a8a29e',
    
    textPrimary: '#1c1917',
    textSecondary: '#57534e',
    textTertiary: '#78716c',
    textMuted: '#a8a29e',
    
    accentOpen: '#f59e0b',
    accentOpenLight: '#fef3c7',
    accentOpenDark: '#d97706',
    
    accentResolved: '#10b981',
    accentResolvedLight: '#d1fae5',
    
    accentPrimary: '#3b82f6',
    accentPrimaryLight: '#dbeafe',
    accentPrimaryDark: '#2563eb',
    
    accentAi: '#6366f1',
    accentAiLight: '#e0e7ff',
    
    accentDanger: '#f43f5e',
    accentDangerLight: '#ffe4e6',
  },
  
  typography: {
    fontFamily: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    fontFamilyMono: "'IBM Plex Mono', 'Fira Code', monospace",
    fontFamilySerif: "'IBM Plex Serif', Georgia, serif",
    fontSize: {
      xs: '11px',
      sm: '12px',
      base: '14px',
      lg: '16px',
      xl: '18px',
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },
  },
  
  spacing: {
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    5: '20px',
    6: '24px',
    8: '32px',
    10: '40px',
    12: '48px',
  },
  
  radius: {
    none: '0',
    sm: '4px',
    md: '6px',
    lg: '8px',
    xl: '12px',
    full: '9999px',
  },
  
  shadow: {
    none: 'none',
    sm: '0 1px 2px rgba(0, 0, 0, 0.04)',
    md: '0 4px 12px rgba(0, 0, 0, 0.06)',
    lg: '0 8px 24px rgba(0, 0, 0, 0.08)',
    xl: '0 16px 48px rgba(0, 0, 0, 0.12)',
  },
  
  transition: {
    fast: '120ms ease',
    base: '200ms ease',
    slow: '300ms ease',
  },
  
  // Annotation highlight - subtle style
  annotationHighlight: {
    borderWidth: '2px',
    borderStyle: 'solid',
    borderRadius: '4px',
    backgroundOpacity: 0.08,
    activeRingWidth: '2px',
    activeRingOpacity: 0.3,
    badgeSize: '18px',
    badgeFontSize: '10px',
    showBadge: true,
    padding: '2px 4px',
    margin: '0 -4px',
  },
  
  sidebar: {
    width: 360,
    headerHeight: '52px',
    borderRadius: '0',
  },
};

/**
 * Minimal/subtle highlight style preset
 */
export const subtleHighlightStyle: AnnotationHighlightStyle = {
  borderWidth: '0',
  borderStyle: 'solid',
  borderRadius: '2px',
  backgroundOpacity: 0.06,
  activeRingWidth: '1px',
  activeRingOpacity: 0.2,
  badgeSize: '16px',
  badgeFontSize: '9px',
  showBadge: true,
  padding: '1px 2px',
  margin: '0 -2px',
};

/**
 * Underline-only highlight style preset
 */
export const underlineHighlightStyle: AnnotationHighlightStyle = {
  borderWidth: '0 0 2px 0',
  borderStyle: 'dashed',
  borderRadius: '0',
  backgroundOpacity: 0,
  activeRingWidth: '0',
  activeRingOpacity: 0,
  badgeSize: '14px',
  badgeFontSize: '9px',
  showBadge: false,
  padding: '0',
  margin: '0',
};

/**
 * Theme context
 */
const ThemeContext = createContext<CommentMdTheme>(defaultLightTheme);

/**
 * Props for ThemeProvider
 */
export interface ThemeProviderProps {
  /** Theme configuration (will be merged with default) */
  theme?: Partial<CommentMdTheme>;
  /** Children */
  children: ReactNode;
}

/**
 * Deep merge helper
 */
function deepMerge<T extends object>(target: T, source: Partial<T>): T {
  const result = { ...target };
  
  for (const key in source) {
    if (source[key] !== undefined) {
      if (
        typeof source[key] === 'object' &&
        source[key] !== null &&
        !Array.isArray(source[key]) &&
        typeof target[key] === 'object' &&
        target[key] !== null
      ) {
        (result as any)[key] = deepMerge(target[key] as object, source[key] as object);
      } else {
        (result as any)[key] = source[key];
      }
    }
  }
  
  return result;
}

/**
 * ThemeProvider component
 * 
 * Provides theme configuration to all child components
 */
export function ThemeProvider({ theme, children }: ThemeProviderProps) {
  const mergedTheme = theme ? deepMerge(defaultLightTheme, theme) : defaultLightTheme;
  
  return (
    <ThemeContext.Provider value={mergedTheme}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook to access theme
 */
export function useTheme(): CommentMdTheme {
  return useContext(ThemeContext);
}

export default ThemeProvider;
