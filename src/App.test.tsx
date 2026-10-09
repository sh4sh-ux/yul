import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { defaultProfiles, getProfiles, getProgress, resetDatabaseConnectionForTests, saveProfile, saveProgress, setSelectedProfile } from './storage'

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({ needRefresh: [false, vi.fn()], offlineReady: [false, vi.fn()], updateServiceWorker: vi.fn() }),
}))

beforeEach(async () => {
  await resetDatabaseConnectionForTests()
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase('yuli-learning')
    request.onsuccess = () => resolve(); request.onerror = () => reject(request.error)
  })
  await resetDatabaseConnectionForTests()
})

describe('YULI app flow', () => {
  it('requires a year on first use and opens a working home dashboard', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: /가율/ }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('뉴질랜드 학년'), '5')
    await user.click(screen.getByRole('button', { name: '저장' }))
    expect(await screen.findByRole('heading', { name: '오늘의 모험' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /피자 레스토랑/ })).toBeInTheDocument()
  })

  it('preserves completion and XP after a completed mission is replayed', async () => {
    const user = userEvent.setup()
    const [gayulDefault, hayul] = defaultProfiles()
    const gayul = { ...gayulDefault, year: 5 as const, difficulty: 'medium' as const, xp: 30 }
    await saveProfile(gayul)
    await saveProfile(hayul)
    await saveProgress({ profileId: 'gayul', missionId: 'pizza', completed: true, currentStep: 3, score: 3, total: 3, updatedAt: '2026-01-01T00:00:00.000Z' })
    await setSelectedProfile('gayul')
    render(<App />)

    await user.click(await screen.findByRole('button', { name: /피자 레스토랑/ }))
    await user.click(screen.getByRole('button', { name: /레스토랑 열기/ }))
    const selectSlices = async (count: number) => {
      const slices = screen.getAllByRole('button', { name: /피자 조각 \d/ })
      for (const slice of slices.slice(0, count)) await user.click(slice)
    }
    await selectSlices(3)
    await user.click(screen.getByRole('button', { name: '정답 확인' })); await user.click(await screen.findByRole('button', { name: /다음 문제/ }))
    await selectSlices(3); await user.click(screen.getByRole('button', { name: '정답 확인' })); await user.click(await screen.findByRole('button', { name: /다음 문제/ }))
    await selectSlices(4); await user.click(screen.getByRole('button', { name: '정답 확인' })); await user.click(await screen.findByRole('button', { name: /미션 완료/ }))

    expect(await screen.findByRole('heading', { name: '레스토랑 미션 완료!' })).toBeInTheDocument()
    expect(screen.getByText('+0')).toBeInTheDocument()
    expect((await getProfiles()).find((profile) => profile.id === 'gayul')?.xp).toBe(30)
    expect((await getProgress('gayul'))[0]).toMatchObject({ completed: true, score: 3, total: 3 })
  })
})
