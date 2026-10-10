import { render, screen, waitFor } from '@testing-library/react'
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

const playFoundationShopping = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(await screen.findByRole('button', { name: /쇼핑 챌린지/ }))
  await user.click(screen.getByRole('button', { name: /장보러 가기/ }))
  const add = async (name: RegExp, count = 1) => {
    const button = screen.getByRole('button', { name })
    for (let index = 0; index < count; index += 1) await user.click(button)
  }
  await add(/사과 추가/, 2); await add(/우유 추가/)
  await user.click(screen.getByRole('button', { name: '계산대에서 결제' })); await user.click(await screen.findByRole('button', { name: /다음 쇼핑/ }))
  await add(/바나나 추가/, 3)
  await user.click(screen.getByRole('button', { name: '계산대에서 결제' })); await user.click(await screen.findByRole('button', { name: /다음 쇼핑/ }))
  await add(/빵 추가/); await add(/치즈 500g 추가/); await add(/사과 추가/, 2)
  await user.click(screen.getByRole('button', { name: '계산대에서 결제' })); await user.click(await screen.findByRole('button', { name: /미션 완료/ }))
}

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
    expect(screen.getByRole('button', { name: /쇼핑 챌린지/ })).toBeInTheDocument()
  })

  it('updates the selected learner name throughout the app when language changes', async () => {
    const user = userEvent.setup()
    const [gayul, hayul] = defaultProfiles()
    await saveProfile({ ...gayul, year: 5 })
    await saveProfile(hayul)
    await setSelectedProfile('gayul')
    render(<App />)

    expect(await screen.findByText('안녕, 가율!')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '설정' }))
    expect(screen.getAllByText('가율').length).toBeGreaterThan(0)
    await user.click(screen.getByRole('button', { name: 'English' }))
    await waitFor(() => expect(screen.getAllByText('Helena').length).toBeGreaterThan(0))
    expect(screen.queryByText('가율')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Growth/ }))
    expect(screen.getByRole('heading', { name: 'Helena' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Home/ }))
    expect(screen.getByText('Kia ora, Helena!')).toBeInTheDocument()
  })

  it('preserves completion and XP after a completed mission is replayed', async () => {
    const user = userEvent.setup()
    const [gayulDefault, hayul] = defaultProfiles()
    const gayul = { ...gayulDefault, year: 5 as const, difficulty: 'foundation' as const, mathLevel: 'foundation' as const, adaptiveDifficulty: false, xp: 30 }
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
    await selectSlices(3); await user.click(screen.getByRole('button', { name: '정답 확인' })); await user.click(await screen.findByRole('button', { name: /미션 완료/ }))

    expect(await screen.findByRole('heading', { name: '레스토랑 미션 완료!' })).toBeInTheDocument()
    expect(screen.getByText('+0')).toBeInTheDocument()
    expect((await getProfiles()).find((profile) => profile.id === 'gayul')?.xp).toBe(30)
    expect((await getProgress('gayul'))[0]).toMatchObject({ completed: true, score: 3, total: 3 })
  })

  it('keeps Shopping Challenge XP unchanged when a completed mission is replayed', async () => {
    const user = userEvent.setup()
    const [gayulDefault, hayul] = defaultProfiles()
    const gayul = { ...gayulDefault, year: 5 as const, difficulty: 'foundation' as const, mathLevel: 'foundation' as const, adaptiveDifficulty: false, xp: 40 }
    await saveProfile(gayul)
    await saveProfile(hayul)
    await saveProgress({ profileId: 'gayul', missionId: 'shopping', completed: true, currentStep: 3, score: 3, total: 3, updatedAt: '2026-01-01T00:00:00.000Z' })
    await setSelectedProfile('gayul')
    render(<App />)
    await playFoundationShopping(user)

    expect(await screen.findByRole('heading', { name: '쇼핑 미션 완료!' })).toBeInTheDocument()
    expect(screen.getByText('+0')).toBeInTheDocument()
    expect((await getProfiles()).find((profile) => profile.id === 'gayul')?.xp).toBe(40)
    expect((await getProgress('gayul')).find((item) => item.missionId === 'shopping')).toMatchObject({ completed: true })
  })

  it('awards Shopping Challenge XP only on the first completion', async () => {
    const user = userEvent.setup()
    const [gayulDefault, hayul] = defaultProfiles()
    const gayul = { ...gayulDefault, year: 5 as const, difficulty: 'foundation' as const, mathLevel: 'foundation' as const, adaptiveDifficulty: false }
    await saveProfile(gayul)
    await saveProfile(hayul)
    await setSelectedProfile('gayul')
    render(<App />)
    await playFoundationShopping(user)

    expect(await screen.findByRole('heading', { name: '쇼핑 미션 완료!' })).toBeInTheDocument()
    expect(screen.getByText('+40')).toBeInTheDocument()
    expect((await getProfiles()).find((profile) => profile.id === 'gayul')?.xp).toBe(40)
    expect((await getProfiles()).find((profile) => profile.id === 'hayul')?.xp).toBe(0)
  })

  it('resumes the active shopping run at the saved stage after an app reload', async () => {
    const user = userEvent.setup()
    const [gayulDefault, hayul] = defaultProfiles()
    const gayul = { ...gayulDefault, year: 5 as const, difficulty: 'foundation' as const, mathLevel: 'foundation' as const, adaptiveDifficulty: false }
    await saveProfile(gayul)
    await saveProfile(hayul)
    await setSelectedProfile('gayul')
    const first = render(<App />)
    await user.click(await screen.findByRole('button', { name: /쇼핑 챌린지/ }))
    await user.click(screen.getByRole('button', { name: /장보러 가기/ }))
    const add = async (name: RegExp, count = 1) => {
      const button = screen.getByRole('button', { name })
      for (let index = 0; index < count; index += 1) await user.click(button)
    }
    await add(/사과 추가/, 2); await add(/우유 추가/)
    await user.click(screen.getByRole('button', { name: '계산대에서 결제' }))
    await user.click(await screen.findByRole('button', { name: /다음 쇼핑/ }))
    await waitFor(async () => expect((await getProgress('gayul')).find((item) => item.missionId === 'shopping')).toMatchObject({
      currentStep: 1, score: 1, total: 1, missionState: { runActive: true, attemptIds: [expect.any(String)] },
    }))
    first.unmount()

    render(<App />)
    const shopping = await screen.findByRole('button', { name: /쇼핑 챌린지/ })
    expect(shopping).toHaveTextContent('이어서 하기')
    await user.click(shopping)
    await user.click(screen.getByRole('button', { name: /장보러 가기/ }))
    expect(await screen.findByRole('heading', { name: '바나나 3개를 사고 계산대로 가세요.' })).toBeInTheDocument()
  })
})
