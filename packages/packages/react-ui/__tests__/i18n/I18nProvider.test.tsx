/**
 * @comment-md/react-ui - I18nProvider Tests
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { 
  I18nProvider, 
  useI18n, 
  enStrings,
  zhCNStrings,
  jaStrings,
  locales,
} from '../../src/i18n/I18nProvider';

describe('I18nProvider', () => {
  describe('rendering', () => {
    it('should render children', () => {
      render(
        <I18nProvider>
          <div data-testid="child">Child content</div>
        </I18nProvider>
      );
      
      expect(screen.getByTestId('child')).toBeInTheDocument();
    });
  });
});

describe('useI18n hook', () => {
  describe('default locale', () => {
    it('should default to English', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <I18nProvider>{children}</I18nProvider>
      );
      
      const { result } = renderHook(() => useI18n(), { wrapper });
      
      expect(result.current.locale).toBe('en');
    });

    it('should return English strings by default', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <I18nProvider>{children}</I18nProvider>
      );
      
      const { result } = renderHook(() => useI18n(), { wrapper });
      
      expect(result.current.strings).toEqual(enStrings);
    });
  });

  describe('locale selection', () => {
    it('should use Chinese locale when specified', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <I18nProvider locale="zh-CN">{children}</I18nProvider>
      );
      
      const { result } = renderHook(() => useI18n(), { wrapper });
      
      expect(result.current.locale).toBe('zh-CN');
      expect(result.current.strings).toEqual(zhCNStrings);
    });

    it('should use Japanese locale when specified', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <I18nProvider locale="ja">{children}</I18nProvider>
      );
      
      const { result } = renderHook(() => useI18n(), { wrapper });
      
      expect(result.current.locale).toBe('ja');
      expect(result.current.strings).toEqual(jaStrings);
    });
  });

  describe('t() function', () => {
    it('should return translated string', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <I18nProvider locale="en">{children}</I18nProvider>
      );
      
      const { result } = renderHook(() => useI18n(), { wrapper });
      
      expect(result.current.t('comments')).toBe('Comments');
      expect(result.current.t('cancel')).toBe('Cancel');
    });

    it('should return Chinese translations', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <I18nProvider locale="zh-CN">{children}</I18nProvider>
      );
      
      const { result } = renderHook(() => useI18n(), { wrapper });
      
      expect(result.current.t('comments')).toBe('评论');
      expect(result.current.t('cancel')).toBe('取消');
    });

    it('should interpolate parameters', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <I18nProvider locale="en">{children}</I18nProvider>
      );
      
      const { result } = renderHook(() => useI18n(), { wrapper });
      
      const translated = result.current.t('minutesAgo', { count: 5 });
      expect(translated).toBe('5m ago');
    });

    it('should interpolate Chinese parameters', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <I18nProvider locale="zh-CN">{children}</I18nProvider>
      );
      
      const { result } = renderHook(() => useI18n(), { wrapper });
      
      const translated = result.current.t('minutesAgo', { count: 5 });
      expect(translated).toBe('5分钟前');
    });
  });

  describe('setLocale', () => {
    it('should change locale dynamically', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <I18nProvider locale="en">{children}</I18nProvider>
      );
      
      const { result } = renderHook(() => useI18n(), { wrapper });
      
      expect(result.current.locale).toBe('en');
      
      act(() => {
        result.current.setLocale('zh-CN');
      });
      
      expect(result.current.locale).toBe('zh-CN');
      expect(result.current.t('comments')).toBe('评论');
    });
  });

  describe('custom strings', () => {
    it('should override specific strings', () => {
      const customStrings = {
        comments: 'Custom Comments',
      };
      
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <I18nProvider locale="en" customStrings={customStrings}>{children}</I18nProvider>
      );
      
      const { result } = renderHook(() => useI18n(), { wrapper });
      
      expect(result.current.t('comments')).toBe('Custom Comments');
      // Other strings should remain default
      expect(result.current.t('cancel')).toBe('Cancel');
    });
  });

  describe('fallback without provider', () => {
    it('should return English defaults without provider', () => {
      const { result } = renderHook(() => useI18n());
      
      expect(result.current.locale).toBe('en');
      expect(result.current.t('comments')).toBe('Comments');
    });
  });
});

describe('locales export', () => {
  it('should export all locales', () => {
    expect(locales.en).toBeDefined();
    expect(locales['zh-CN']).toBeDefined();
    expect(locales.ja).toBeDefined();
  });
});

describe('string completeness', () => {
  const requiredKeys = [
    'comments',
    'comment',
    'cancel',
    'delete',
    'confirm',
    'sidebarTitle',
    'statusOpen',
    'statusResolved',
    'resolve',
    'reopen',
    'addComment',
    'commentPlaceholder',
    'justNow',
    'minutesAgo',
    'hoursAgo',
    'daysAgo',
    'aiLabel',
  ];

  it('should have all required keys in English', () => {
    for (const key of requiredKeys) {
      expect(enStrings[key as keyof typeof enStrings]).toBeDefined();
    }
  });

  it('should have all required keys in Chinese', () => {
    for (const key of requiredKeys) {
      expect(zhCNStrings[key as keyof typeof zhCNStrings]).toBeDefined();
    }
  });

  it('should have all required keys in Japanese', () => {
    for (const key of requiredKeys) {
      expect(jaStrings[key as keyof typeof jaStrings]).toBeDefined();
    }
  });
});
