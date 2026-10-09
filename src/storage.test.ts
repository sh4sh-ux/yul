import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createBackup, getAnswers, getProfiles, initialiseProfiles, resetDatabaseConnectionForTests, restoreBackup, saveAnswer, saveProfile, validateBackup } from './storage'

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
  it('exports and restores a validated backup', async () => {
    await initialiseProfiles()
    const backup = await createBackup()
    expect(validateBackup(backup)).toBe(true)
    await restoreBackup(backup)
    expect(await getProfiles()).toHaveLength(2)
  })
  it('rejects malformed backups before changing data', async () => {
    await initialiseProfiles()
    const before = await getProfiles()
    await expect(restoreBackup({ schema: 'wrong' })).rejects.toThrow()
    expect(await getProfiles()).toEqual(before)
  })
})
