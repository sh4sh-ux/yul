import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { AnswerRecord, AppBackup, MissionProgressWithProfile, Profile } from './types'

interface YuliDB extends DBSchema {
  profiles: { key: string; value: Profile }
  answers: { key: string; value: AnswerRecord; indexes: { 'by-profile': string } }
  progress: { key: string; value: MissionProgressWithProfile; indexes: { 'by-profile': string } }
  meta: { key: string; value: unknown }
}

let database: Promise<IDBPDatabase<YuliDB>> | null = null

const db = () => {
  if (!database) {
    database = openDB<YuliDB>('yuli-learning', 1, {
      upgrade(store) {
        store.createObjectStore('profiles', { keyPath: 'id' })
        const answers = store.createObjectStore('answers', { keyPath: 'id' })
        answers.createIndex('by-profile', 'profileId')
        const progress = store.createObjectStore('progress', { keyPath: 'key' as never })
        progress.createIndex('by-profile', 'profileId')
        store.createObjectStore('meta')
      },
    })
  }
  return database
}

const now = () => new Date().toISOString()

export function defaultProfiles(): Profile[] {
  const createdAt = now()
  return [
    { id: 'gayul', name: '가율', avatar: '🌿', year: null, language: 'ko', difficulty: 'auto', unitDifficulties: {}, xp: 0, createdAt, updatedAt: createdAt },
    { id: 'hayul', name: '하율', avatar: '🚀', year: null, language: 'ko', difficulty: 'auto', unitDifficulties: {}, xp: 0, createdAt, updatedAt: createdAt },
  ]
}

export async function initialiseProfiles(): Promise<Profile[]> {
  const store = await db()
  let profiles = await store.getAll('profiles')
  if (profiles.length === 0) {
    const transaction = store.transaction('profiles', 'readwrite')
    await Promise.all([...defaultProfiles().map((profile) => transaction.store.put(profile)), transaction.done])
    profiles = await store.getAll('profiles')
  }
  return profiles.sort((a, b) => a.id.localeCompare(b.id))
}

export async function saveProfile(profile: Profile): Promise<void> {
  await (await db()).put('profiles', { ...profile, updatedAt: now() })
}

export async function getProfiles(): Promise<Profile[]> { return (await db()).getAll('profiles') }
export async function getAnswers(profileId: string): Promise<AnswerRecord[]> { return (await db()).getAllFromIndex('answers', 'by-profile', profileId) }
export async function saveAnswer(answer: AnswerRecord): Promise<void> { await (await db()).put('answers', answer) }

export async function getProgress(profileId: string): Promise<MissionProgressWithProfile[]> {
  return (await db()).getAllFromIndex('progress', 'by-profile', profileId)
}

export async function saveProgress(progress: MissionProgressWithProfile): Promise<void> {
  await (await db()).put('progress', { ...progress, key: `${progress.profileId}:${progress.missionId}` } as MissionProgressWithProfile)
}

export async function setSelectedProfile(profileId: string | null): Promise<void> { await (await db()).put('meta', profileId, 'selectedProfile') }
export async function getSelectedProfile(): Promise<string | null> { return ((await (await db()).get('meta', 'selectedProfile')) as string | null) ?? null }

export async function createBackup(): Promise<AppBackup> {
  const store = await db()
  return {
    schema: 'yuli-backup', version: 1, exportedAt: now(),
    profiles: await store.getAll('profiles'), answers: await store.getAll('answers'), progress: await store.getAll('progress'),
  }
}

const isProfile = (value: unknown): value is Profile => {
  if (!value || typeof value !== 'object') return false
  const item = value as Record<string, unknown>
  return (item.id === 'gayul' || item.id === 'hayul') && typeof item.name === 'string' && typeof item.avatar === 'string'
    && (item.year === null || (typeof item.year === 'number' && item.year >= 1 && item.year <= 8))
    && (item.language === 'ko' || item.language === 'en')
    && ['easy', 'medium', 'challenge', 'auto'].includes(String(item.difficulty)) && typeof item.xp === 'number'
}

export function validateBackup(value: unknown): value is AppBackup {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<AppBackup>
  if (item.schema !== 'yuli-backup' || item.version !== 1 || !Array.isArray(item.profiles) || !Array.isArray(item.answers) || !Array.isArray(item.progress)) return false
  if (item.profiles.length !== 2 || !item.profiles.every(isProfile) || new Set(item.profiles.map((profile) => profile.id)).size !== 2) return false
  return item.answers.every((answer) => answer && typeof answer.id === 'string' && ['gayul', 'hayul'].includes(answer.profileId)
    && typeof answer.correct === 'boolean' && typeof answer.hintsUsed === 'number')
    && item.progress.every((progress) => progress && ['gayul', 'hayul'].includes(progress.profileId) && typeof progress.completed === 'boolean')
}

export async function restoreBackup(value: unknown): Promise<void> {
  if (!validateBackup(value)) throw new Error('Invalid YULI backup')
  const store = await db()
  const transaction = store.transaction(['profiles', 'answers', 'progress'], 'readwrite')
  await Promise.all([
    transaction.objectStore('profiles').clear(), transaction.objectStore('answers').clear(), transaction.objectStore('progress').clear(),
  ])
  for (const profile of value.profiles) await transaction.objectStore('profiles').put(profile)
  for (const answer of value.answers) await transaction.objectStore('answers').put(answer)
  for (const progress of value.progress) await transaction.objectStore('progress').put({ ...progress, key: `${progress.profileId}:${progress.missionId}` } as MissionProgressWithProfile)
  await transaction.done
}

export async function resetDatabaseConnectionForTests(): Promise<void> {
  if (database) (await database).close()
  database = null
}
