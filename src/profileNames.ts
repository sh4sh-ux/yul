import type { Language, Profile } from './types'

const defaultNames: Record<Profile['id'], Record<Language, string>> = {
  gayul: { ko: '가율', en: 'Helena' },
  hayul: { ko: '하율', en: 'Luna' },
}

export function profileNames(profile: Pick<Profile, 'id' | 'name' | 'names' | 'language'>): Record<Language, string> {
  const legacyName = profile.name.trim()
  if (!profile.names) {
    if (profile.language === 'en') {
      return {
        ko: defaultNames[profile.id].ko,
        en: legacyName && legacyName !== defaultNames[profile.id].ko ? legacyName : defaultNames[profile.id].en,
      }
    }
    return { ko: legacyName || defaultNames[profile.id].ko, en: defaultNames[profile.id].en }
  }
  return {
    // `name` remains the canonical Korean field so legacy callers that only
    // update it continue to work after language-specific names are introduced.
    ko: profile.name.trim() || profile.names?.ko?.trim() || defaultNames[profile.id].ko,
    en: profile.names?.en?.trim() || defaultNames[profile.id].en,
  }
}

export function profileDisplayName(profile: Pick<Profile, 'id' | 'name' | 'names' | 'language'>, language: Language): string {
  return profileNames(profile)[language]
}

export function migrateProfileNames<T extends Pick<Profile, 'id' | 'name' | 'language'> & Partial<Pick<Profile, 'names'>>>(profile: T): T & { name: string; names: Record<Language, string> } {
  const names = profileNames(profile)
  return { ...profile, name: names.ko, names }
}
