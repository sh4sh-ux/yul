import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import { mathLevels, migrateProfile } from './mathLevels'
import { migrateProfileNames } from './profileNames'
import type { AnswerRecord, AppBackup, MissionProgressWithProfile, Profile } from './types'

interface YuliDB extends DBSchema {
  profiles: { key: string; value: Profile }
  answers: { key: string; value: AnswerRecord; indexes: { 'by-profile': string } }
  progress: { key: string; value: MissionProgressWithProfile; indexes: { 'by-profile': string } }
  meta: { key: string; value: unknown }
}

let database: Promise<IDBPDatabase<YuliDB>> | null = null
export type LearningResetTarget = Profile['id'] | 'all'

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
    { id: 'gayul', name: '가율', names: { ko: '가율', en: 'Helena' }, avatar: '🌿', year: null, language: 'ko', difficulty: 'advanced', mathLevel: 'advanced', adaptiveDifficulty: true, unitDifficulties: {}, xp: 0, createdAt, updatedAt: createdAt },
    { id: 'hayul', name: '하율', names: { ko: '하율', en: 'Luna' }, avatar: '🚀', year: null, language: 'ko', difficulty: 'advanced', mathLevel: 'advanced', adaptiveDifficulty: true, unitDifficulties: {}, xp: 0, createdAt, updatedAt: createdAt },
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
  const migrated = profiles.map((profile) => migrateProfileNames(migrateProfile(profile)) as Profile)
  const transaction = store.transaction('profiles', 'readwrite')
  await Promise.all([...migrated.map((profile) => transaction.store.put(profile)), transaction.done])
  return migrated.sort((a, b) => a.id.localeCompare(b.id))
}

export async function saveProfile(profile: Profile): Promise<void> {
  await (await db()).put('profiles', { ...migrateProfileNames(profile), updatedAt: now() })
}

export async function getProfiles(): Promise<Profile[]> { return (await (await db()).getAll('profiles')).map((profile) => migrateProfileNames(migrateProfile(profile)) as Profile) }
export async function getAnswers(profileId: string): Promise<AnswerRecord[]> {
  const answers = await (await db()).getAllFromIndex('answers', 'by-profile', profileId)
  return answers.sort((a, b) => a.answeredAt.localeCompare(b.answeredAt))
}
export async function saveAnswer(answer: AnswerRecord): Promise<void> { await (await db()).put('answers', answer) }

export async function saveAnswerAndProgress(answer: AnswerRecord, progress: MissionProgressWithProfile): Promise<void> {
  const store = await db()
  const transaction = store.transaction(['answers', 'progress'], 'readwrite')
  await Promise.all([
    transaction.objectStore('answers').put(answer),
    transaction.objectStore('progress').put({ ...progress, key: `${progress.profileId}:${progress.missionId}` } as MissionProgressWithProfile),
  ])
  await transaction.done
}

/**
 * Marks a mission complete and grants its one-time reward in the same
 * transaction. A replay can update UI state without ever granting XP twice.
 */
export async function completeMissionWithReward(progress: MissionProgressWithProfile, reward: number): Promise<{
  progress: MissionProgressWithProfile
  profile: Profile
  xpEarned: number
}> {
  const store = await db()
  const transaction = store.transaction(['profiles', 'progress'], 'readwrite')
  const profiles = transaction.objectStore('profiles')
  const missionProgress = transaction.objectStore('progress')
  let profileWrite: ReturnType<typeof profiles.put> | undefined
  try {
    const profile = await profiles.get(progress.profileId)
    if (!profile) throw new Error(`Profile not found: ${progress.profileId}`)
    const key = `${progress.profileId}:${progress.missionId}`
    const existing = await missionProgress.get(key)
    const isFirstCompletion = !existing?.completed
    const completedProgress = {
      ...progress,
      completed: true,
      score: isFirstCompletion ? progress.score : existing.score,
      total: isFirstCompletion ? progress.total : existing.total,
      key,
    } as MissionProgressWithProfile
    const updatedProfile = isFirstCompletion
      ? { ...profile, xp: profile.xp + reward, updatedAt: now() }
      : profile

    // Start the profile write first so any later structured-clone/storage error
    // also proves that IndexedDB rolls the reward back with the progress write.
    profileWrite = profiles.put(updatedProfile)
    const progressWrite = missionProgress.put(completedProgress)
    await Promise.all([profileWrite, progressWrite])
    await transaction.done
    return { progress: completedProgress, profile: updatedProfile, xpEarned: isFirstCompletion ? reward : 0 }
  } catch (error) {
    try { transaction.abort() } catch { /* Transaction may already be aborted. */ }
    if (profileWrite) await Promise.allSettled([profileWrite])
    try { await transaction.done } catch { /* Preserve the original failure. */ }
    throw error
  }
}

export async function getProgress(profileId: string): Promise<MissionProgressWithProfile[]> {
  return (await db()).getAllFromIndex('progress', 'by-profile', profileId)
}

export async function saveProgress(progress: MissionProgressWithProfile): Promise<void> {
  await (await db()).put('progress', { ...progress, key: `${progress.profileId}:${progress.missionId}` } as MissionProgressWithProfile)
}

/**
 * Removes learning evidence and rewards while preserving identity and every
 * learner-controlled setting. Profile updates and record deletion share one
 * transaction so a failed reset cannot leave a partial result.
 */
export async function resetLearningRecords(target: LearningResetTarget): Promise<Profile[]> {
  const store = await db()
  const transaction = store.transaction(['profiles', 'answers', 'progress'], 'readwrite')
  const profilesStore = transaction.objectStore('profiles')
  const answersStore = transaction.objectStore('answers')
  const progressStore = transaction.objectStore('progress')
  try {
    const profiles = await profilesStore.getAll()
    const profileIds: Profile['id'][] = target === 'all' ? ['gayul', 'hayul'] : [target]
    const updated = profiles.map((profile) => {
      if (!profileIds.includes(profile.id)) return profile
      const { diagnostic: _diagnostic, ...preserved } = profile
      return { ...preserved, xp: 0, updatedAt: now() } as Profile
    })

    const writes: Promise<unknown>[] = updated
      .filter((profile) => profileIds.includes(profile.id))
      .map((profile) => profilesStore.put(profile))
    if (target === 'all') {
      writes.push(answersStore.clear(), progressStore.clear())
    } else {
      const [answerKeys, progressKeys] = await Promise.all([
        answersStore.index('by-profile').getAllKeys(target),
        progressStore.index('by-profile').getAllKeys(target),
      ])
      writes.push(...answerKeys.map((key) => answersStore.delete(key)), ...progressKeys.map((key) => progressStore.delete(key)))
    }
    await Promise.all(writes)
    await transaction.done
    return updated.sort((a, b) => a.id.localeCompare(b.id))
  } catch (error) {
    try { transaction.abort() } catch { /* Transaction may already be aborted. */ }
    try { await transaction.done } catch { /* Preserve the original failure. */ }
    throw error
  }
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
  const unitDifficulties = item.unitDifficulties
  const validDifficulties = ['easy', 'medium', 'challenge', 'auto', ...mathLevels]
  const validMissionIds = ['pizza', 'shopping', 'travel', 'nature', 'creator']
  const validUnits = unitDifficulties !== null && typeof unitDifficulties === 'object' && !Array.isArray(unitDifficulties)
    && Object.entries(unitDifficulties).every(([missionId, difficulty]) => validMissionIds.includes(missionId) && validDifficulties.includes(String(difficulty)))
  const diagnostic = item.diagnostic as Record<string, unknown> | undefined
  const names = item.names as Record<string, unknown> | undefined
  const validNames = names === undefined || (names !== null && typeof names === 'object' && !Array.isArray(names)
    && typeof names.ko === 'string' && names.ko.trim().length > 0 && typeof names.en === 'string' && names.en.trim().length > 0)
  const validDiagnostic = diagnostic === undefined || (typeof diagnostic === 'object' && diagnostic !== null
    && typeof diagnostic.completedAt === 'string' && typeof diagnostic.score === 'number' && Number.isInteger(diagnostic.score)
    && diagnostic.score >= 0 && diagnostic.score <= 10 && diagnostic.total === 10
    && mathLevels.includes(diagnostic.recommendedLevel as Profile['mathLevel']) && typeof diagnostic.applied === 'boolean')
  return (item.id === 'gayul' || item.id === 'hayul') && typeof item.name === 'string' && item.name.length > 0 && typeof item.avatar === 'string'
    && (item.year === null || (typeof item.year === 'number' && Number.isInteger(item.year) && item.year >= 1 && item.year <= 8))
    && (item.language === 'ko' || item.language === 'en')
    && validDifficulties.includes(String(item.difficulty)) && validUnits
    && (item.mathLevel === undefined || mathLevels.includes(item.mathLevel as Profile['mathLevel']))
    && (item.adaptiveDifficulty === undefined || typeof item.adaptiveDifficulty === 'boolean')
    && validDiagnostic && validNames
    && typeof item.xp === 'number' && Number.isFinite(item.xp) && item.xp >= 0
    && typeof item.createdAt === 'string' && typeof item.updatedAt === 'string'
}

export function validateBackup(value: unknown): value is AppBackup {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<AppBackup>
  if (item.schema !== 'yuli-backup' || item.version !== 1 || !Array.isArray(item.profiles) || !Array.isArray(item.answers) || !Array.isArray(item.progress)) return false
  if (item.profiles.length !== 2 || !item.profiles.every(isProfile) || new Set(item.profiles.map((profile) => profile.id)).size !== 2) return false
  return item.answers.every((answer) => answer && typeof answer.id === 'string' && ['gayul', 'hayul'].includes(answer.profileId)
    && typeof answer.correct === 'boolean' && typeof answer.hintsUsed === 'number'
    && (answer.objectiveId === undefined || typeof answer.objectiveId === 'string')
    && (answer.supportAttempt === undefined || typeof answer.supportAttempt === 'boolean'))
    && item.progress.every((progress) => {
      if (!progress || !['gayul', 'hayul'].includes(progress.profileId) || typeof progress.completed !== 'boolean') return false
      if (progress.missionState === undefined) return true
      const state = progress.missionState
      if (!state || typeof state !== 'object' || Array.isArray(state)) return false
      const validHint = state.hintLevel === undefined || (Number.isInteger(state.hintLevel) && state.hintLevel >= 0 && state.hintLevel <= 2)
      const validCart = state.cart === undefined || (state.cart !== null && typeof state.cart === 'object' && !Array.isArray(state.cart)
        && Object.values(state.cart).every((quantity) => Number.isInteger(quantity) && quantity >= 0 && quantity <= 9))
      const validAttempts = state.attemptIds === undefined || (Array.isArray(state.attemptIds)
        && state.attemptIds.every((id) => typeof id === 'string' && id.length > 0) && new Set(state.attemptIds).size === state.attemptIds.length)
      const validQuestions = state.questionIds === undefined || (Array.isArray(state.questionIds) && state.questionIds.length === 3
        && state.questionIds.every((id) => typeof id === 'string' && id.startsWith('shopping-v12-')) && new Set(state.questionIds).size === state.questionIds.length)
      const validLearningLevel = state.learningLevel === undefined || mathLevels.includes(state.learningLevel)
      const validSupport = state.supportAttempt === undefined || typeof state.supportAttempt === 'boolean'
      const validRun = state.runActive === undefined || typeof state.runActive === 'boolean'
      const validPayment = state.paymentComplete === undefined || typeof state.paymentComplete === 'boolean'
      return validHint && validCart && validAttempts && validQuestions && validLearningLevel && validSupport && validRun && validPayment
    })
}

export async function restoreBackup(value: unknown): Promise<void> {
  if (!validateBackup(value)) throw new Error('Invalid YULI backup')
  const store = await db()
  const transaction = store.transaction(['profiles', 'answers', 'progress'], 'readwrite')
  await Promise.all([
    transaction.objectStore('profiles').clear(), transaction.objectStore('answers').clear(), transaction.objectStore('progress').clear(),
  ])
  for (const profile of value.profiles) await transaction.objectStore('profiles').put(migrateProfileNames(migrateProfile(profile)) as Profile)
  for (const answer of value.answers) await transaction.objectStore('answers').put(answer)
  for (const progress of value.progress) await transaction.objectStore('progress').put({ ...progress, key: `${progress.profileId}:${progress.missionId}` } as MissionProgressWithProfile)
  await transaction.done
}

export async function resetDatabaseConnectionForTests(): Promise<void> {
  if (database) (await database).close()
  database = null
}
