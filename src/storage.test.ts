import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createBackup, getAnswers, getProfiles, getProgress, initialiseProfiles, resetDatabaseConnectionForTests, restoreBackup, saveAnswer, saveProfile, saveProgress, validateBackup } from './storage'

const clearDatabase = async () => {
  await resetDatabaseConnectionForTests()
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase('yuli-learning')
    request.onsuccess = () => resolve(); request.onerror = () => reject(request.error); request.onblocked = () => resolve()
  })
  await resetDatabaseConnectionForTests()
}

describe('IndexedDB learning repository', () => {
  beforeEach(clearDatabase)
  afterEach(clearDatabase)

  it('creates two profiles with stable independent IDs', async () => {
    const profiles = await initialiseProfiles()
    expect(profiles.map((profile) => profile.id).sort()).toEqual(['gayul', 'hayul'])
  })
  it('keeps learning records with the stable ID after a name change', async () => {
    const profiles = await initialiseProfiles()
    await saveAnswer({ id: 'a1', profileId: 'gayul', missionId: 'pizza', questionId: 'slices', correct: true, hintsUsed: 0, answeredAt: new Date().toISOString(), answer: '3/4' })
    await saveProfile({ ...profiles.find((profile) => profile.id === 'gayul')!, name: '새 별명' })
    expect((await getProfiles()).find((profile) => profile.id === 'gayul')?.name).toBe('새 별명')
    expect(await getAnswers('gayul')).toHaveLength(1)
    expect(await getAnswers('hayul')).toHaveLength(0)
  })
  it('returns each profile answer history in chronological order', async () => {
    await initialiseProfiles()
    await saveAnswer({ id: 'a-first-key', profileId: 'gayul', missionId: 'pizza', questionId: 'newer', correct: true, hintsUsed: 0, answeredAt: '2026-01-03T00:00:00.000Z', answer: '3/4' })
    await saveAnswer({ id: 'z-last-key', profileId: 'gayul', missionId: 'pizza', questionId: 'older', correct: false, hintsUsed: 1, answeredAt: '2026-01-01T00:00:00.000Z', answer: '1/4' })
    await saveAnswer({ id: 'middle-key', profileId: 'hayul', missionId: 'pizza', questionId: 'other-profile', correct: true, hintsUsed: 0, answeredAt: '2025-01-01T00:00:00.000Z', answer: '3/4' })
    expect((await getAnswers('gayul')).map((answer) => answer.questionId)).toEqual(['older', 'newer'])
  })
  it('exports and restores a validated backup', async () => {
    await initialiseProfiles()
    const backup = await createBackup()
    expect(validateBackup(backup)).toBe(true)
    await restoreBackup(backup)
    expect(await getProfiles()).toHaveLength(2)
  })
  it('keeps shopping answers and resumable cart state in a version-1 backup', async () => {
    await initialiseProfiles()
    await saveAnswer({ id: 'shop-a1', profileId: 'gayul', missionId: 'shopping', questionId: 'shopping-v12-y5-foundation-fruit-count', correct: false, hintsUsed: 1, answeredAt: '2026-10-10T00:00:00.000Z', answer: '[["apple",1]]' })
    await saveProgress({ profileId: 'gayul', missionId: 'shopping', completed: false, currentStep: 1, score: 0, total: 3, updatedAt: '2026-10-10T00:00:00.000Z', missionState: { cart: { milk: 2 }, hintLevel: 1 } })
    const backup = await createBackup()
    expect(backup.version).toBe(1)
    expect(validateBackup(backup)).toBe(true)
    await restoreBackup(backup)
    expect((await getAnswers('gayul'))[0]).toMatchObject({ missionId: 'shopping', profileId: 'gayul' })
    expect((await getProgress('gayul'))[0]).toMatchObject({ missionId: 'shopping', missionState: { cart: { milk: 2 }, hintLevel: 1 } })
    expect(await getAnswers('hayul')).toHaveLength(0)
  })
  it('rejects malformed resumable shopping state before restore', async () => {
    await initialiseProfiles()
    const before = await getProfiles()
    const backup = await createBackup()
    const malformed = { ...backup, progress: [{ profileId: 'gayul', missionId: 'shopping', completed: false, currentStep: 0, score: 0, total: 3, updatedAt: '2026-10-10T00:00:00.000Z', missionState: { cart: { milk: -2 }, hintLevel: 7 } }] }
    expect(validateBackup(malformed)).toBe(false)
    await expect(restoreBackup(malformed)).rejects.toThrow()
    expect(await getProfiles()).toEqual(before)
  })
  it('migrates legacy v1 difficulty values while keeping backup schema and data', async () => {
    await initialiseProfiles()
    const backup = await createBackup()
    const legacy = {
      ...backup,
      profiles: backup.profiles.map((profile, index) => {
        const { mathLevel: _mathLevel, adaptiveDifficulty: _adaptiveDifficulty, diagnostic: _diagnostic, ...oldProfile } = profile
        return { ...oldProfile, difficulty: index === 0 ? 'challenge' : 'auto' }
      }),
    }
    expect(validateBackup(legacy)).toBe(true)
    await restoreBackup(legacy)
    const profiles = await getProfiles()
    expect(profiles.find((profile) => profile.id === 'gayul')).toMatchObject({ mathLevel: 'advanced', adaptiveDifficulty: false, xp: 0 })
    expect(profiles.find((profile) => profile.id === 'hayul')).toMatchObject({ mathLevel: 'advanced', adaptiveDifficulty: true, xp: 0 })
    expect((await createBackup()).version).toBe(1)
  })
  it('round-trips diagnostic metadata without mixing profiles', async () => {
    const [gayul] = await initialiseProfiles()
    await saveProfile({ ...gayul, diagnostic: { completedAt: '2026-10-10T00:00:00.000Z', score: 8, total: 10, recommendedLevel: 'expert', applied: true }, mathLevel: 'expert' })
    const backup = await createBackup()
    await restoreBackup(backup)
    expect((await getProfiles()).find((profile) => profile.id === 'gayul')?.diagnostic?.recommendedLevel).toBe('expert')
    expect((await getProfiles()).find((profile) => profile.id === 'hayul')?.diagnostic).toBeUndefined()
  })
  it('rejects malformed backups before changing data', async () => {
    await initialiseProfiles()
    const before = await getProfiles()
    await expect(restoreBackup({ schema: 'wrong' })).rejects.toThrow()
    expect(await getProfiles()).toEqual(before)
  })
  it('rejects profiles missing required unit difficulty data before restore', async () => {
    await initialiseProfiles()
    const before = await getProfiles()
    const backup = await createBackup()
    const malformed = { ...backup, profiles: backup.profiles.map((profile, index) => index === 0 ? { ...profile, unitDifficulties: undefined } : profile) }
    expect(validateBackup(malformed)).toBe(false)
    await expect(restoreBackup(malformed)).rejects.toThrow()
    expect(await getProfiles()).toEqual(before)
  })
  it('rejects malformed diagnostic metadata without changing stored profiles', async () => {
    await initialiseProfiles()
    const before = await getProfiles()
    const backup = await createBackup()
    const malformed = { ...backup, profiles: backup.profiles.map((profile, index) => index === 0 ? { ...profile, diagnostic: { score: 99 } } : profile) }
    expect(validateBackup(malformed)).toBe(false)
    await expect(restoreBackup(malformed)).rejects.toThrow()
    expect(await getProfiles()).toEqual(before)
  })
})
