import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildShoppingQuestions, shoppingLocalise } from '../shoppingProblems'
import { defaultProfiles, getAnswers, getProgress, resetDatabaseConnectionForTests, saveProgress } from '../storage'
import type { Language, MathLevel } from '../types'
import { ShoppingMission } from './ShoppingMission'

const clearDatabase = async () => {
  await resetDatabaseConnectionForTests()
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase('yuli-learning')
    request.onsuccess = () => resolve(); request.onerror = () => reject(request.error); request.onblocked = () => resolve()
  })
  await resetDatabaseConnectionForTests()
}

const profileFor = (level: MathLevel = 'foundation', language: Language = 'ko', year = 5) => ({
  ...defaultProfiles()[0], year, language, difficulty: level, mathLevel: level, adaptiveDifficulty: false,
})

const mission = (overrides: Partial<React.ComponentProps<typeof ShoppingMission>> = {}) => ({
  profile: profileFor(), history: [], initialStep: 0, initialScore: 0, initialTotal: 3, wasCompleted: false,
  onExit: vi.fn(), onComplete: vi.fn(), onDataChanged: vi.fn(), ...overrides,
})

const add = async (user: ReturnType<typeof userEvent.setup>, name: RegExp, count = 1) => {
  const button = screen.getByRole('button', { name })
  for (let index = 0; index < count; index += 1) await user.click(button)
}

describe('ShoppingMission', () => {
  beforeEach(clearDatabase)
  afterEach(clearDatabase)

  it('adds and removes products with live integer-cent totals', async () => {
    const user = userEvent.setup()
    render(<ShoppingMission {...mission()} />)
    await add(user, /사과 추가/, 2)
    await add(user, /우유 추가/)
    expect(screen.getAllByText(/NZ\$5\.70/).length).toBeGreaterThan(0)
    await user.click(screen.getByRole('button', { name: /사과 빼기/ }))
    expect(screen.getAllByText(/NZ\$4\.45/).length).toBeGreaterThan(0)
  })

  it('applies a percentage discount, issues a receipt and stores the answer', async () => {
    const user = userEvent.setup()
    const profile = profileFor('core')
    render(<ShoppingMission {...mission({ profile, initialStep: 1 })} />)
    await add(user, /우유 추가/, 2)
    expect(screen.getByText('−NZ$2.00')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '계산대에서 결제' }))
    expect(await screen.findByText('결제 성공!')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'YULI 영수증' })).toBeInTheDocument()
    await waitFor(async () => expect((await getAnswers('gayul'))[0]).toMatchObject({ missionId: 'shopping', correct: true, objectiveId: 'percent-discount' }))
  })

  it('explains an over-budget trolley and allows editing before retry', async () => {
    const user = userEvent.setup()
    render(<ShoppingMission {...mission()} />)
    await add(user, /우유 추가/, 3)
    await user.click(screen.getByRole('button', { name: '계산대에서 결제' }))
    expect(await screen.findByText('예산을 초과했어요.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '장바구니 고치기' }))
    expect(screen.getByRole('button', { name: /우유 빼기/ })).toBeEnabled()
  })

  it.each([
    ['foundation', 'ko'], ['core', 'ko'], ['advanced', 'ko'], ['expert', 'ko'], ['master', 'ko'],
    ['foundation', 'en'], ['core', 'en'], ['advanced', 'en'], ['expert', 'en'], ['master', 'en'],
  ] as Array<[MathLevel, Language]>)('shows progressive %s guidance in %s', async (level, language) => {
    const user = userEvent.setup()
    const profile = profileFor(level, language)
    const question = buildShoppingQuestions(profile, [])[0]
    render(<ShoppingMission {...mission({ profile })} />)
    expect(screen.getByRole('heading', { name: shoppingLocalise(question.prompt, language) })).toBeInTheDocument()
    expect(screen.queryByText(shoppingLocalise(question.prompt, language === 'ko' ? 'en' : 'ko'))).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: language === 'ko' ? /힌트/ : /Hint/ }))
    expect(screen.getByText(shoppingLocalise(question.hints[0], language))).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: language === 'ko' ? /다음 힌트/ : /Next hint/ }))
    expect(screen.getByText(shoppingLocalise(question.hints[1], language))).toBeInTheDocument()
  })

  it('reveals the other language only when translation help is requested', async () => {
    const user = userEvent.setup()
    const profile = profileFor('foundation', 'en')
    const question = buildShoppingQuestions(profile, [])[0]
    render(<ShoppingMission {...mission({ profile })} />)
    expect(screen.queryByText(question.prompt.ko)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Translation help/ }))
    expect(screen.getByText(question.prompt.ko)).toBeInTheDocument()
  })

  it('restores the cart and hint state after reload and keeps profiles separate', async () => {
    await saveProgress({ profileId: 'hayul', missionId: 'shopping', completed: false, currentStep: 2, score: 0, total: 3, updatedAt: '2026-01-01T00:00:00.000Z', missionState: { cart: { banana: 2 }, hintLevel: 1 } })
    const { unmount } = render(<ShoppingMission {...mission({ initialCart: { apple: 2, milk: 1 }, initialHintLevel: 1 })} />)
    const appleCard = screen.getByRole('button', { name: /사과 추가/ }).closest('article')
    expect(within(appleCard as HTMLElement).getByText('2')).toBeInTheDocument()
    expect(screen.getByText('필요한 물건을 하나씩 먼저 담으세요.')).toBeInTheDocument()
    await waitFor(async () => expect((await getProgress('gayul'))[0]?.missionState?.cart).toEqual({ apple: 2, milk: 1 }))
    expect((await getProgress('hayul'))[0]).toMatchObject({ currentStep: 2, missionState: { cart: { banana: 2 }, hintLevel: 1 } })
    unmount()
    const saved = (await getProgress('gayul'))[0]
    render(<ShoppingMission {...mission({ initialStep: saved.currentStep, initialCart: saved.missionState?.cart, initialHintLevel: saved.missionState?.hintLevel })} />)
    const restoredCard = screen.getByRole('button', { name: /사과 추가/ }).closest('article')
    expect(within(restoredCard as HTMLElement).getByText('2')).toBeInTheDocument()
  })

  it('preserves completion and reports zero new reward eligibility on replay', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()
    render(<ShoppingMission {...mission({ initialStep: 2, initialScore: 3, wasCompleted: true, onComplete })} />)
    await add(user, /빵 추가/)
    await add(user, /치즈 500g 추가/)
    await add(user, /사과 추가/, 2)
    await user.click(screen.getByRole('button', { name: '계산대에서 결제' }))
    await user.click(await screen.findByRole('button', { name: /미션 완료/ }))
    expect(onComplete).toHaveBeenCalledWith(expect.any(Array), false)
    await waitFor(async () => expect((await getProgress('gayul'))[0]).toMatchObject({ missionId: 'shopping', completed: true }))
  })
})
