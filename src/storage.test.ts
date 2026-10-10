import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { completeMissionWithReward, createBackup, getAnswers, getProfiles, getProgress, initialiseProfiles, resetDatabaseConnectionForTests, resetLearningRecords, restoreBackup, saveAnswer, saveProfile, saveProgress, validateBackup } from './storage'

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
  it('migrates legacy names without changing profile IDs, XP or learning records', async () => {
    await initialiseProfiles()
    await saveAnswer({ id: 'legacy-name-answer', profileId: 'gayul', missionId: 'pizza', questionId: 'legacy', correct: true, hintsUsed: 0, answeredAt: '2026-01-01T00:00:00.000Z', answer: '1/2' })
    const backup = await createBackup()
    const legacy = {
      ...backup,
      profiles: backup.profiles.map(({ names: _names, ...profile }) => profile.id === 'gayul' ? { ...profile, name: '가율별', xp: 70 } : profile),
    }
    await restoreBackup(legacy)
    const gayul = (await getProfiles()).find((profile) => profile.id === 'gayul')
    expect(gayul).toMatchObject({ id: 'gayul', name: '가율별', names: { ko: '가율별', en: 'Helena' }, xp: 70 })
    expect((await getProfiles()).find((profile) => profile.id === 'hayul')).toMatchObject({ id: 'hayul', names: { ko: '하율', en: 'Luna' }, xp: 0 })
    expect(await getAnswers('gayul')).toMatchObject([{ id: 'legacy-name-answer', profileId: 'gayul' }])
    expect(await getAnswers('hayul')).toHaveLength(0)
  })
  it('preserves a customised legacy English name with its profile data', async () => {
    await initialiseProfiles()
    await saveAnswer({ id: 'luna-answer', profileId: 'hayul', missionId: 'shopping', questionId: 'legacy', correct: true, hintsUsed: 0, answeredAt: '2026-01-01T00:00:00.000Z', answer: '[]' })
    const backup = await createBackup()
    const legacy = {
      ...backup,
      profiles: backup.profiles.map(({ names: _names, ...profile }) => profile.id === 'hayul'
        ? { ...profile, language: 'en', name: 'Moon', year: 7, xp: 90 }
        : profile),
    }
    await restoreBackup(legacy)
    expect((await getProfiles()).find((profile) => profile.id === 'hayul')).toMatchObject({
      id: 'hayul', language: 'en', name: '하율', names: { ko: '하율', en: 'Moon' }, year: 7, xp: 90,
    })
    expect(await getAnswers('hayul')).toMatchObject([{ id: 'luna-answer', profileId: 'hayul' }])
    expect(await getAnswers('gayul')).toHaveLength(0)
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
    await saveProgress({ profileId: 'gayul', missionId: 'shopping', completed: false, currentStep: 1, score: 0, total: 1, updatedAt: '2026-10-10T00:00:00.000Z', missionState: { cart: { milk: 2 }, hintLevel: 1, attemptIds: ['shop-a1'], supportAttempt: true, runActive: true } })
    const backup = await createBackup()
    expect(backup.version).toBe(1)
    expect(validateBackup(backup)).toBe(true)
    await restoreBackup(backup)
    expect((await getAnswers('gayul'))[0]).toMatchObject({ missionId: 'shopping', profileId: 'gayul' })
    expect((await getProgress('gayul'))[0]).toMatchObject({ missionId: 'shopping', missionState: { cart: { milk: 2 }, hintLevel: 1, attemptIds: ['shop-a1'], supportAttempt: true, runActive: true } })
    expect(await getAnswers('hayul')).toHaveLength(0)
  })
  it('round-trips a pending successful payment while accepting older backups without it', async () => {
    await initialiseProfiles()
    const questionIds = ['shopping-v12-y5-core-breakfast', 'shopping-v12-y5-core-quarter-off', 'shopping-v12-y5-core-family-shop']
    await saveProgress({ profileId: 'gayul', missionId: 'shopping', completed: false, currentStep: 1, score: 1, total: 1, updatedAt: '2026-10-10T00:00:00.000Z', missionState: { cart: { milk: 2 }, attemptIds: ['paid-1'], questionIds, learningLevel: 'core', runActive: true, paymentComplete: true } })
    const backup = await createBackup()
    expect(validateBackup(backup)).toBe(true)
    await restoreBackup(backup)
    expect((await getProgress('gayul'))[0].missionState?.paymentComplete).toBe(true)
    expect((await getProgress('gayul'))[0].missionState?.questionIds).toEqual(questionIds)
    expect((await getProgress('gayul'))[0].missionState?.learningLevel).toBe('core')

    const legacy = { ...backup, progress: backup.progress.map(({ missionState, ...progress }) => ({ ...progress, missionState: missionState && { ...missionState, paymentComplete: undefined } })) }
    expect(validateBackup(legacy)).toBe(true)
  })
  it('atomically grants 40 XP only for the first shopping completion and keeps profiles independent', async () => {
    await initialiseProfiles()
    const completion = { profileId: 'gayul', missionId: 'shopping' as const, completed: true, currentStep: 3, score: 3, total: 4, updatedAt: '2026-10-10T00:00:00.000Z', missionState: { runActive: false } }
    const first = await completeMissionWithReward(completion, 40)
    const replay = await completeMissionWithReward({ ...completion, score: 1, total: 2 }, 40)

    expect(first.xpEarned).toBe(40)
    expect(replay.xpEarned).toBe(0)
    expect((await getProfiles()).find((profile) => profile.id === 'gayul')?.xp).toBe(40)
    expect((await getProfiles()).find((profile) => profile.id === 'hayul')?.xp).toBe(0)
    expect((await getProgress('gayul'))[0]).toMatchObject({ completed: true, score: 3, total: 4 })
  })
  it('rolls back XP and completion together when a completion write fails', async () => {
    await initialiseProfiles()
    const invalidState = { runActive: false, uncloneable: () => undefined }
    await expect(completeMissionWithReward({
      profileId: 'gayul', missionId: 'shopping', completed: true, currentStep: 3, score: 3, total: 3,
      updatedAt: '2026-10-10T00:00:00.000Z', missionState: invalidState,
    } as never, 40)).rejects.toThrow()

    expect((await getProfiles()).find((profile) => profile.id === 'gayul')?.xp).toBe(0)
    expect(await getProgress('gayul')).toHaveLength(0)
  })
  it('rejects malformed resumable shopping state before restore', async () => {
    await initialiseProfiles()
    const before = await getProfiles()
    const backup = await createBackup()
    const malformed = { ...backup, progress: [{ profileId: 'gayul', missionId: 'shopping', completed: false, currentStep: 0, score: 0, total: 3, updatedAt: '2026-10-10T00:00:00.000Z', missionState: { cart: { milk: -2 }, hintLevel: 7, attemptIds: ['duplicate', 'duplicate'], supportAttempt: 'yes', runActive: 1 } }] }
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
  it.each([
    ['gayul', 'hayul'],
    ['hayul', 'gayul'],
  ] as const)('resets only %s while preserving %s and learner settings', async (target, other) => {
    const profiles = await initialiseProfiles()
    for (const item of profiles) {
      const names = item.id === 'gayul' ? { ko: '가율별', en: 'Helen' } : { ko: '하율별', en: 'Moon' }
      await saveProfile({ ...item, name: names.ko, names, year: item.id === 'gayul' ? 5 : 7, language: item.id === 'gayul' ? 'ko' : 'en', mathLevel: item.id === 'gayul' ? 'expert' : 'core', difficulty: item.id === 'gayul' ? 'expert' : 'core', adaptiveDifficulty: true, unitDifficulties: { pizza: 'master', shopping: 'foundation' }, xp: item.id === 'gayul' ? 90 : 120, diagnostic: { completedAt: '2026-10-10T00:00:00.000Z', score: 8, total: 10, recommendedLevel: 'expert', applied: true } })
      await saveAnswer({ id: `${item.id}-answer`, profileId: item.id, missionId: 'pizza', questionId: 'question', correct: false, hintsUsed: 2, answeredAt: '2026-10-10T00:00:00.000Z', answer: '1/4' })
      await saveProgress({ profileId: item.id, missionId: 'shopping', completed: true, currentStep: 2, score: 1, total: 2, updatedAt: '2026-10-10T00:00:00.000Z', missionState: { cart: { milk: 2 }, runActive: true } })
    }

    await resetLearningRecords(target)
    await resetDatabaseConnectionForTests()
    const stored = await getProfiles()
    const resetProfile = stored.find((item) => item.id === target)!
    const untouchedProfile = stored.find((item) => item.id === other)!
    expect(resetProfile).toMatchObject({ id: target, xp: 0, adaptiveDifficulty: true, unitDifficulties: { pizza: 'master', shopping: 'foundation' } })
    expect(resetProfile.names).toEqual(target === 'gayul' ? { ko: '가율별', en: 'Helen' } : { ko: '하율별', en: 'Moon' })
    expect(resetProfile.diagnostic).toBeUndefined()
    expect(await getAnswers(target)).toHaveLength(0)
    expect(await getProgress(target)).toHaveLength(0)
    expect(untouchedProfile.xp).toBe(other === 'gayul' ? 90 : 120)
    expect(untouchedProfile.diagnostic).toBeDefined()
    expect(await getAnswers(other)).toHaveLength(1)
    expect(await getProgress(other)).toHaveLength(1)
  })
  it('resets all learning data while retaining both identities and manual configuration', async () => {
    const profiles = await initialiseProfiles()
    for (const item of profiles) {
      await saveProfile({ ...item, year: item.id === 'gayul' ? 5 : 7, language: item.id === 'gayul' ? 'ko' : 'en', mathLevel: 'master', difficulty: 'master', adaptiveDifficulty: false, unitDifficulties: { pizza: 'expert' }, xp: 70, diagnostic: { completedAt: '2026-10-10T00:00:00.000Z', score: 9, total: 10, recommendedLevel: 'master', applied: true } })
      await saveAnswer({ id: `${item.id}-all-answer`, profileId: item.id, missionId: 'shopping', questionId: 'question', correct: true, hintsUsed: 1, answeredAt: '2026-10-10T00:00:00.000Z', answer: '[]' })
      await saveProgress({ profileId: item.id, missionId: 'pizza', completed: true, currentStep: 3, score: 3, total: 3, updatedAt: '2026-10-10T00:00:00.000Z' })
    }

    await resetLearningRecords('all')
    const stored = await getProfiles()
    expect(stored.map((item) => item.id).sort()).toEqual(['gayul', 'hayul'])
    for (const item of stored) {
      expect(item).toMatchObject({ xp: 0, mathLevel: 'master', difficulty: 'master', adaptiveDifficulty: false, unitDifficulties: { pizza: 'expert' } })
      expect(item.diagnostic).toBeUndefined()
      expect(await getAnswers(item.id)).toHaveLength(0)
      expect(await getProgress(item.id)).toHaveLength(0)
    }
    expect(stored.find((item) => item.id === 'gayul')).toMatchObject({ name: '가율', names: { ko: '가율', en: 'Helena' }, avatar: '🌿', year: 5, language: 'ko' })
    expect(stored.find((item) => item.id === 'hayul')).toMatchObject({ name: '하율', names: { ko: '하율', en: 'Luna' }, avatar: '🚀', year: 7, language: 'en' })
    expect(validateBackup(await createBackup())).toBe(true)
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
