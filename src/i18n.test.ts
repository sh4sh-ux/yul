import { describe, expect, it } from 'vitest'
import { messages, t } from './i18n'

describe('translations', () => {
  it('has the same complete set of keys in both languages', () => {
    expect(Object.keys(messages.ko).sort()).toEqual(Object.keys(messages.en).sort())
  })
  it('returns only the selected language string', () => {
    expect(t('ko', 'home')).toBe('홈')
    expect(t('en', 'home')).toBe('Home')
  })
})
