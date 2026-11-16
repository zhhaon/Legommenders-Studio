import { afterEach, describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import i18next, { message, registerMessages, normalizeLocale, setLocale, text, tr } from './index';
import { categoryLabel, componentText, issueText, paramLabel } from './display';
import { NodeCard } from '@/nodes/NodeCard';
import { LanguageSelect } from '@/components/LanguageSelect';
import type { ComponentSpec } from '@/types/catalog';
import type { ValidationIssue } from '@/types/api';
import en from './locales/en.json';
import zh from './locales/zh-CN.json';

afterEach(async () => { await setLocale('en'); });

describe('Studio internationalization', () => {
  it('matches supported browser locales and falls back to English', () => {
    expect(normalizeLocale('en-US')).toBe('en');
    expect(normalizeLocale('en')).toBe('en');
    expect(normalizeLocale('zh-CN')).toBe('zh-CN');
    expect(normalizeLocale('zh-Hans')).toBe('zh-CN');
    expect(normalizeLocale('zh-TW')).toBe('en');
    expect(normalizeLocale('fr')).toBe('en');
  });
  it('keeps interpolation contracts identical between languages', () => {
    for (const [key, value] of Object.entries(zh)) {
      expect(key in en, key).toBe(true);
      const placeholders = (s: string) => [...s.matchAll(/\{\{([^}]+)\}\}/g)].map(m => m[1]).sort();
      expect(placeholders(value), key).toEqual(placeholders((en as Record<string, string>)[key]));
    }
  });
  it('renders Chinese parameter labels without their configuration names', async () => {
    await setLocale('zh-CN');
    expect(paramLabel('hidden_size')).toBe('隐藏维度');
    expect(paramLabel('num_attention_heads')).toBe('注意力头数');
    expect(paramLabel('external_model_id')).toBe('模型仓库');
    expect(paramLabel('new_parameter')).toBe('new parameter');
    expect(categoryLabel('user_encoder')).toBe('用户编码器');
  });
  it('preserves proper names, custom labels and original component metadata', async () => {
    const spec = { id: 'dataset.mind', name: 'MIND (small)', description: 'Original' } as ComponentSpec;
    const before = JSON.stringify(spec);
    await setLocale('zh-CN');
    expect(componentText(spec)).toBe('MIND (small)');
    const html = renderToStaticMarkup(createElement(NodeCard, { title: 'My custom CNN', category: 'item_encoder', color: '#00f', icon: null }));
    expect(html).toContain('My custom CNN');
    expect(html).toContain('物品编码器');
    expect(JSON.stringify(spec)).toBe(before);
  });
  it('re-renders existing validation messages and event strings after a switch', async () => {
    const key = Object.keys(en).find(k => k.startsWith('validation.port_type_mismatch.message.'))!;
    const issue = { message: 'Original English', reason: '', fix: '', translations: { message: { key, params: { p0: 'item.cnn', p1: 'ItemEmbedding', p2: 'user.gru', p3: 'Dataset', p4: 'history' } } } } as unknown as ValidationIssue;
    const event = message('canvas.negativeCandidate', { count: 3 });
    expect(text(event)).toBe('Negative Candidate 3');
    await setLocale('zh-CN');
    expect(issueText(issue)).toContain('端口不兼容');
    expect(issueText(issue)).toContain('item.cnn');
    expect(text(event)).toBe('负候选项 3');
    expect(issue.message).toBe('Original English');
  });
  it('translates existing API diagnostics in toasts without modifying response strings', async () => {
    const key = Object.keys(en).find(k => k.startsWith('validation.empty_graph.message.'))!;
    const issue = { message: 'The model canvas is empty.', translations: { message: { key, params: {} } } };
    const before = JSON.stringify(issue);
    registerMessages({ validation: { errors: [issue] } });
    await setLocale('zh-CN');
    expect(text(issue.message)).toBe('当前模型画布为空。');
    expect(JSON.stringify(issue)).toBe(before);
  });
  it('handles a missing translation and an unsupported selection safely', async () => {
    await setLocale('zh-CN');
    expect(tr('future.key', {}, 'English fallback')).toBe('English fallback');
    await setLocale('unsupported');
    expect(i18next.resolvedLanguage).toBe('zh-CN');
    expect(renderToStaticMarkup(createElement(LanguageSelect))).toContain('简体中文');
  });
});

