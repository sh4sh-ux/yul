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

describe('PizzaMission', () => {
  beforeEach(clearDatabase)
  afterEach(clearDatabase)

  it('checks a visually selected three-quarter pizza and advances', async () => {
    const user = userEvent.setup()
    const profile = { ...defaultProfiles()[0], year: 5 as const, difficulty: 'medium' as const }
    render(<PizzaMission profile={profile} history={[]} initialStep={0} initialScore={0} initialTotal={3} wasCompleted={false} onExit={vi.fn()} onComplete={vi.fn()} onDataChanged={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: '1' }))
    await user.click(screen.getByRole('button', { name: '2' }))
    await user.click(screen.getByRole('button', { name: '3' }))
    await user.click(screen.getByRole('button', { name: '정답 확인' }))
    expect(await screen.findByText('정확해요!')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /다음 문제/ }))
    expect(screen.getByRole('heading', { name: '1/4 피자와 2/4 피자를 합치면 얼마일까요?' })).toBeInTheDocument()
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

    await user.click(screen.getByRole('button', { name: '1' })); await user.click(screen.getByRole('button', { name: '2' })); await user.click(screen.getByRole('button', { name: '3' }))
    await user.click(screen.getByRole('button', { name: '정답 확인' })); await user.click(await screen.findByRole('button', { name: /다음 문제/ }))
    await user.click(screen.getByRole('button', { name: '3/4' })); await user.click(screen.getByRole('button', { name: '정답 확인' })); await user.click(await screen.findByRole('button', { name: /다음 문제/ }))
    await user.click(screen.getByRole('button', { name: '3/4' })); await user.click(screen.getByRole('button', { name: '정답 확인' })); await user.click(await screen.findByRole('button', { name: /다음 문제/ }))

    expect(onComplete).toHaveBeenCalledWith(expect.any(Array), false)
    expect(profile.xp).toBe(30)
    await waitFor(async () => expect((await getProgress('gayul'))[0]).toMatchObject({ completed: true, score: 3, total: 3 }))
  })

  it('records the exact challenge question variant for review', async () => {
    const user = userEvent.setup()
    const profile = { ...defaultProfiles()[0], year: 8 as const, difficulty: 'challenge' as const }
    render(<PizzaMission profile={profile} history={[]} initialStep={2} initialScore={0} initialTotal={3} wasCompleted={false} onExit={vi.fn()} onComplete={vi.fn()} onDataChanged={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: '5/6' }))
    await user.click(screen.getByRole('button', { name: '정답 확인' }))
    await waitFor(async () => expect((await getAnswers('gayul'))[0]?.questionId).toBe('unlike-denominator-challenge'))
  })
})
