/**
 * @comment-md/react-ui - ThemeProvider Tests
 */

import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { 
  ThemeProvider, 
  useTheme, 
  defaultLightTheme,
  subtleHighlightStyle,
  underlineHighlightStyle,
} from '../../src/theme/ThemeProvider';

describe('ThemeProvider', () => {
  describe('rendering', () => {
    it('should render children', () => {
      render(
        <ThemeProvider>
          <div data-testid="child">Child content</div>
        </ThemeProvider>
      );
      
      expect(screen.getByTestId('child')).toBeInTheDocument();
    });
  });
});

describe('useTheme hook', () => {
  describe('default theme', () => {
    it('should return default light theme', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      );
      
      const { result } = renderHook(() => useTheme(), { wrapper });
      
      expect(result.current).toEqual(defaultLightTheme);
    });

    it('should have colors defined', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      );
      
      const { result } = renderHook(() => useTheme(), { wrapper });
      
      expect(result.current.colors.bgPrimary).toBeDefined();
      expect(result.current.colors.textPrimary).toBeDefined();
      expect(result.current.colors.accentOpen).toBeDefined();
      expect(result.current.colors.accentResolved).toBeDefined();
    });

    it('should have typography defined', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      );
      
      const { result } = renderHook(() => useTheme(), { wrapper });
      
      expect(result.current.typography.fontFamily).toBeDefined();
      expect(result.current.typography.fontSize.base).toBeDefined();
      expect(result.current.typography.fontWeight.normal).toBeDefined();
    });

    it('should have annotationHighlight defined', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      );
      
      const { result } = renderHook(() => useTheme(), { wrapper });
      
      expect(result.current.annotationHighlight).toBeDefined();
      expect(result.current.annotationHighlight.backgroundOpacity).toBeDefined();
      expect(result.current.annotationHighlight.borderWidth).toBeDefined();
    });
  });

  describe('custom theme', () => {
    it('should merge custom theme with default', () => {
      const customTheme = {
        colors: {
          accentOpen: '#ff0000',
        },
      };
      
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider theme={customTheme as any}>{children}</ThemeProvider>
      );
      
      const { result } = renderHook(() => useTheme(), { wrapper });
      
      // Custom value should be applied
      expect(result.current.colors.accentOpen).toBe('#ff0000');
      // Other values should be from default
      expect(result.current.colors.bgPrimary).toBe(defaultLightTheme.colors.bgPrimary);
    });

    it('should merge nested properties', () => {
      const customTheme = {
        typography: {
          fontSize: {
            base: '16px',
          },
        },
      };
      
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider theme={customTheme as any}>{children}</ThemeProvider>
      );
      
      const { result } = renderHook(() => useTheme(), { wrapper });
      
      expect(result.current.typography.fontSize.base).toBe('16px');
      expect(result.current.typography.fontSize.sm).toBe(defaultLightTheme.typography.fontSize.sm);
    });

    it('should allow customizing annotationHighlight', () => {
      const customTheme = {
        annotationHighlight: {
          backgroundOpacity: 0.15,
          showBadge: false,
        },
      };
      
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider theme={customTheme as any}>{children}</ThemeProvider>
      );
      
      const { result } = renderHook(() => useTheme(), { wrapper });
      
      expect(result.current.annotationHighlight.backgroundOpacity).toBe(0.15);
      expect(result.current.annotationHighlight.showBadge).toBe(false);
    });
  });
});

describe('highlight style presets', () => {
  it('should have subtleHighlightStyle preset', () => {
    expect(subtleHighlightStyle).toBeDefined();
    expect(subtleHighlightStyle.backgroundOpacity).toBeLessThan(
      defaultLightTheme.annotationHighlight.backgroundOpacity
    );
  });

  it('should have underlineHighlightStyle preset', () => {
    expect(underlineHighlightStyle).toBeDefined();
    expect(underlineHighlightStyle.backgroundOpacity).toBe(0);
    expect(underlineHighlightStyle.borderWidth).toContain('0 0');
  });
});

describe('defaultLightTheme', () => {
  it('should have all required color properties', () => {
    const colors = defaultLightTheme.colors;
    
    expect(colors.bgPrimary).toBeDefined();
    expect(colors.bgSecondary).toBeDefined();
    expect(colors.bgTertiary).toBeDefined();
    expect(colors.borderSubtle).toBeDefined();
    expect(colors.borderDefault).toBeDefined();
    expect(colors.textPrimary).toBeDefined();
    expect(colors.textSecondary).toBeDefined();
    expect(colors.accentOpen).toBeDefined();
    expect(colors.accentOpenLight).toBeDefined();
    expect(colors.accentResolved).toBeDefined();
    expect(colors.accentPrimary).toBeDefined();
    expect(colors.accentAi).toBeDefined();
    expect(colors.accentDanger).toBeDefined();
  });

  it('should have all required spacing properties', () => {
    const spacing = defaultLightTheme.spacing;
    
    expect(spacing[1]).toBeDefined();
    expect(spacing[2]).toBeDefined();
    expect(spacing[3]).toBeDefined();
    expect(spacing[4]).toBeDefined();
    expect(spacing[6]).toBeDefined();
    expect(spacing[8]).toBeDefined();
  });

  it('should have all required transition properties', () => {
    const transition = defaultLightTheme.transition;
    
    expect(transition.fast).toBeDefined();
    expect(transition.base).toBeDefined();
    expect(transition.slow).toBeDefined();
  });
});
