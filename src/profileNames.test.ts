import { describe, expect, it } from 'vitest'
import { migrateProfileNames, profileDisplayName } from './profileNames'

describe('language-specific profile names', () => {
  it('maps stable profile IDs to their default English names', () => {
    expect(profileDisplayName({ id: 'gayul', name: '가율', language: 'ko' }, 'en')).toBe('Helena')
    expect(profileDisplayName({ id: 'hayul', name: '하율', language: 'ko' }, 'en')).toBe('Luna')
  })
  it('migrates a customised legacy name as Korean while preserving the English default', () => {
    expect(migrateProfileNames({ id: 'gayul', name: '별이', language: 'ko' })).toMatchObject({
      id: 'gayul', name: '별이', names: { ko: '별이', en: 'Helena' },
    })
  })
  it('preserves a customised legacy name as English for an English profile', () => {
    expect(migrateProfileNames({ id: 'hayul', name: 'Moon', language: 'en' })).toMatchObject({
      id: 'hayul', name: '하율', names: { ko: '하율', en: 'Moon' }, language: 'en',
    })
  })
})
