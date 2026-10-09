import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defaultProfiles, getAnswers, getProgress, resetDatabaseConnectionForTests, saveProgress } from '../storage'
import { PizzaMission } from './PizzaMission'

const clearDatabase = async () => {
  await resetDatabaseConnectionForTests()
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase('yuli-learning')
    request.onsuccess = () => resolve(); request.onerror = () => reject(request.error); request.onblocked = () => resolve()
  })
  await resetDatabaseConnectionForTests()
}

const selectSlices = async (user: ReturnType<typeof userEvent.setup>, count: number) => {
  const slices = screen.getAllByRole('button', { name: /피자 조각 \d/ })
  for (const slice of slices.slice(0, count)) await user.click(slice)
}

describe('PizzaMission', () => {
  beforeEach(clearDatabase)
  afterEach(clearDatabase)

  it('checks a visually selected three-quarter pizza and advances', async () => {
    const user = userEvent.setup()
    const profile = { ...defaultProfiles()[0], year: 5 as const, difficulty: 'medium' as const }
    render(<PizzaMission profile={profile} history={[]} initialStep={0} initialScore={0} initialTotal={3} wasCompleted={false} onExit={vi.fn()} onComplete={vi.fn()} onDataChanged={vi.fn()} />)
    await selectSlices(user, 3)
    await user.click(screen.getByRole('button', { name: '정답 확인' }))
    expect(await screen.findByText('정확해요!')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /다음 문제/ }))
    expect(screen.getByRole('heading', { name: '주문을 한 판에 합쳐서 준비해 주세요.' })).toBeInTheDocument()
  })

  it('preserves per-profile completion and score when replaying', async () => {
    const profile = { ...defaultProfiles()[0], year: 5 as const, difficulty: 'medium' as const }
    await saveProgress({ profileId: 'gayul', missionId: 'pizza', completed: true, currentStep: 3, score: 2, total: 3, updatedAt: '2026-01-01T00:00:00.000Z' })
    await saveProgress({ profileId: 'hayul', missionId: 'pizza', completed: false, currentStep: 1, score: 0, total: 3, updatedAt: '2026-01-01T00:00:00.000Z' })
    render(<PizzaMission profile={profile} history={[]} initialStep={0} initialScore={2} initialTotal={3} wasCompleted onExit={vi.fn()} onComplete={vi.fn()} onDataChanged={vi.fn()} />)
    await waitFor(async () => {
      expect((await getProgress('gayul'))[0]).toMatchObject({ completed: true, score: 2, total: 3 })
    })
    expect((await getProgress('hayul'))[0]).toMatchObject({ completed: false, currentStep: 1 })
  })

  it('does not award replay XP or add a phantom final attempt', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()
    const profile = { ...defaultProfiles()[0], year: 5 as const, difficulty: 'medium' as const, xp: 30 }
    render(<PizzaMission profile={profile} history={[]} initialStep={0} initialScore={3} initialTotal={3} wasCompleted onExit={vi.fn()} onComplete={onComplete} onDataChanged={vi.fn()} />)

    await selectSlices(user, 3)
    await user.click(screen.getByRole('button', { name: '정답 확인' })); await user.click(await screen.findByRole('button', { name: /다음 문제/ }))
    await selectSlices(user, 3); await user.click(screen.getByRole('button', { name: '정답 확인' })); await user.click(await screen.findByRole('button', { name: /다음 문제/ }))
    await selectSlices(user, 4); await user.click(screen.getByRole('button', { name: '정답 확인' })); await user.click(await screen.findByRole('button', { name: /미션 완료/ }))

    expect(onComplete).toHaveBeenCalledWith(expect.any(Array), false)
    expect(profile.xp).toBe(30)
    await waitFor(async () => expect((await getProgress('gayul'))[0]).toMatchObject({ completed: true, score: 3, total: 3 }))
  })

  it('records the exact challenge question variant for review', async () => {
    const user = userEvent.setup()
    const profile = { ...defaultProfiles()[0], year: 8 as const, difficulty: 'challenge' as const }
    render(<PizzaMission profile={profile} history={[]} initialStep={2} initialScore={0} initialTotal={3} wasCompleted={false} onExit={vi.fn()} onComplete={vi.fn()} onDataChanged={vi.fn()} />)
    await selectSlices(user, 5)
    await user.click(screen.getByRole('button', { name: '정답 확인' }))
    await waitFor(async () => expect((await getAnswers('gayul'))[0]?.questionId).toBe('pizza-v11-challenge-2-3-plus-1-6'))
  })

  it('shows one language and reveals translated help only on request', async () => {
    const user = userEvent.setup()
    const profile = { ...defaultProfiles()[0], year: 5 as const, language: 'en' as const, difficulty: 'medium' as const }
    render(<PizzaMission profile={profile} history={[]} initialStep={0} initialScore={0} initialTotal={3} wasCompleted={false} onExit={vi.fn()} onComplete={vi.fn()} onDataChanged={vi.fn()} />)
    expect(screen.getByRole('heading', { name: 'Select 3 of 4 pizza slices to make 3/4.' })).toBeInTheDocument()
    expect(screen.queryByText('피자 4조각 중 3조각을 골라 3/4을 만들어 보세요.')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Translation help/ }))
    expect(screen.getByText('피자 4조각 중 3조각을 골라 3/4을 만들어 보세요.')).toBeInTheDocument()
  })

  it('shows supportive feedback and progressive hints after a wrong answer', async () => {
    const user = userEvent.setup()
    const profile = { ...defaultProfiles()[0], year: 5 as const, difficulty: 'medium' as const }
    render(<PizzaMission profile={profile} history={[]} initialStep={0} initialScore={0} initialTotal={3} wasCompleted={false} onExit={vi.fn()} onComplete={vi.fn()} onDataChanged={vi.fn()} />)
    await selectSlices(user, 1)
    await user.click(screen.getByRole('button', { name: '정답 확인' }))
    expect(await screen.findByText('괜찮아요, 다시 살펴봐요.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '다시 시도' }))
    await user.click(screen.getByRole('button', { name: /힌트/ }))
    expect(screen.getByText(/아래 숫자 4는 전체 조각 수/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /다음 힌트/ }))
    expect(screen.getByText(/위 숫자 3만큼/)).toBeInTheDocument()
  })

  it('restores the saved stage after remounting', () => {
    const profile = { ...defaultProfiles()[0], year: 5 as const, difficulty: 'medium' as const }
    render(<PizzaMission profile={profile} history={[]} initialStep={1} initialScore={0} initialTotal={3} wasCompleted={false} onExit={vi.fn()} onComplete={vi.fn()} onDataChanged={vi.fn()} />)
    expect(screen.getByText('2단계 · 해결')).toBeInTheDocument()
    expect(screen.getByText('1/4 + 2/4 = ?')).toBeInTheDocument()
  })

  it('stores only one answer when the check action is triggered twice', async () => {
    const user = userEvent.setup()
    const profile = { ...defaultProfiles()[0], year: 5 as const, difficulty: 'medium' as const }
    render(<PizzaMission profile={profile} history={[]} initialStep={0} initialScore={0} initialTotal={3} wasCompleted={false} onExit={vi.fn()} onComplete={vi.fn()} onDataChanged={vi.fn()} />)
    await selectSlices(user, 3)
    await user.dblClick(screen.getByRole('button', { name: '정답 확인' }))
    await waitFor(async () => expect(await getAnswers('gayul')).toHaveLength(1))
  })
})
