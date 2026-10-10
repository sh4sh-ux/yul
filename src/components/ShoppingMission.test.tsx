import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildShoppingQuestions, shoppingLocalise } from '../shoppingProblems'
import { completeMissionWithReward, defaultProfiles, getAnswers, getProfiles, getProgress, initialiseProfiles, resetDatabaseConnectionForTests, saveAnswer, saveProfile, saveProgress } from '../storage'
import type { AnswerRecord, Language, MathLevel } from '../types'
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
  profile: profileFor(), history: [], initialStep: 0, initialScore: 0, initialTotal: 3, initialAttemptIds: [], wasCompleted: false,
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
    await waitFor(async () => expect((await getAnswers('gayul'))[0]).toMatchObject({ missionId: 'shopping', correct: true, objectiveId: 'percent-discount', supportAttempt: false }))
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

  it('marks only post-error guided attempts as supported', async () => {
    const user = userEvent.setup()
    render(<ShoppingMission {...mission()} />)
    await add(user, /사과 추가/)
    await user.click(screen.getByRole('button', { name: '계산대에서 결제' }))
    await user.click(await screen.findByRole('button', { name: '장바구니 고치기' }))
    expect(screen.getByText('힌트를 활용한 지원형 재도전')).toBeInTheDocument()
    await add(user, /사과 추가/)
    await add(user, /우유 추가/)
    await user.click(screen.getByRole('button', { name: '계산대에서 결제' }))
    expect(await screen.findByText('결제 성공!')).toBeInTheDocument()
    await waitFor(async () => expect(await getAnswers('gayul')).toMatchObject([
      { correct: false, supportAttempt: false, hintsUsed: 0 },
      { correct: true, supportAttempt: true, hintsUsed: 1 },
    ]))
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

  it.each([
    ['ko', 'NZ$0.90 / 개', 'NZ$4.25 / L'],
    ['en', 'NZ$0.90 / egg', 'NZ$4.25 / L'],
  ] as const)('renders item and litre unit prices with explicit metadata in %s', (language, eggPrice, juicePrice) => {
    const profile = profileFor('advanced', language, 7)
    render(<ShoppingMission {...mission({ profile, initialStep: 2 })} />)
    expect(screen.getByText(eggPrice)).toBeInTheDocument()
    expect(screen.getByText(juicePrice)).toBeInTheDocument()
    expect(screen.getByText('NZ$1.00 / 100g')).toBeInTheDocument()
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

  it('restores a successful payment and advances without storing the same answer twice', async () => {
    const user = userEvent.setup()
    const first = render(<ShoppingMission {...mission()} />)
    await add(user, /사과 추가/, 2)
    await add(user, /우유 추가/)
    await user.click(screen.getByRole('button', { name: '계산대에서 결제' }))
    expect(await screen.findByText('결제 성공!')).toBeInTheDocument()
    await waitFor(async () => expect((await getProgress('gayul'))[0]).toMatchObject({
      currentStep: 0, score: 1, total: 1, missionState: { paymentComplete: true, learningLevel: 'foundation', runActive: true },
    }))
    first.unmount()

    const saved = (await getProgress('gayul'))[0]
    const history = await getAnswers('gayul')
    render(<ShoppingMission {...mission({
      profile: profileFor('master'), history, initialStep: saved.currentStep, initialScore: saved.score, initialTotal: saved.total,
      initialCart: saved.missionState?.cart, initialHintLevel: saved.missionState?.hintLevel,
      initialAttemptIds: saved.missionState?.attemptIds, initialSupportAttempt: saved.missionState?.supportAttempt,
      initialQuestionIds: saved.missionState?.questionIds, initialLearningLevel: saved.missionState?.learningLevel,
      initialPaymentComplete: saved.missionState?.paymentComplete,
    })} />)

    expect(screen.getByRole('heading', { name: shoppingLocalise(buildShoppingQuestions(profileFor(), [])[0].prompt, 'ko') })).toBeInTheDocument()
    expect(screen.getByText('결제 성공!')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'YULI 영수증' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '계산대에서 결제' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /다음 쇼핑/ }))
    expect(screen.getByRole('heading', { name: shoppingLocalise(buildShoppingQuestions(profileFor(), [])[1].prompt, 'ko') })).toBeInTheDocument()
    await waitFor(async () => expect((await getProgress('gayul'))[0]).toMatchObject({
      currentStep: 1, score: 1, total: 1, missionState: { paymentComplete: false, runActive: true },
    }))
    expect(await getAnswers('gayul')).toHaveLength(1)
  })

  it('recovers active-run attempts from legacy progress without attempt IDs', async () => {
    const questionId = buildShoppingQuestions(profileFor(), [])[0].id
    const history: AnswerRecord[] = [
      { id: 'older-session', profileId: 'gayul', missionId: 'shopping', questionId, correct: true, hintsUsed: 0, answeredAt: '2026-01-01T00:00:00.000Z', answer: '[]' },
      { id: 'legacy-current-1', profileId: 'gayul', missionId: 'shopping', questionId, correct: false, hintsUsed: 1, answeredAt: '2026-02-01T00:00:00.000Z', answer: '[]' },
      { id: 'legacy-current-2', profileId: 'gayul', missionId: 'shopping', questionId, correct: true, hintsUsed: 0, answeredAt: '2026-02-02T00:00:00.000Z', answer: '[]' },
      { id: 'after-progress', profileId: 'gayul', missionId: 'shopping', questionId, correct: true, hintsUsed: 0, answeredAt: '2026-03-01T00:00:00.000Z', answer: '[]' },
    ]
    render(<ShoppingMission {...mission({
      history, initialStep: 1, initialScore: 1, initialTotal: 2,
      initialAttemptIds: undefined,
      initialProgressUpdatedAt: '2026-02-03T00:00:00.000Z',
    })} />)

    await waitFor(async () => expect((await getProgress('gayul'))[0]).toMatchObject({
      currentStep: 1, score: 1, total: 2,
      missionState: { attemptIds: ['legacy-current-1', 'legacy-current-2'] },
    }))
  })

  it('restarts safely when legacy attempts cannot be reconstructed without deleting records or XP', async () => {
    const [gayul, hayul] = await initialiseProfiles()
    await saveProfile({ ...gayul, xp: 80 })
    await saveProfile(hayul)
    const questionId = buildShoppingQuestions(profileFor(), [])[0].id
    const history: AnswerRecord[] = [
      { id: 'uncertain-1', profileId: 'gayul', missionId: 'shopping', questionId, correct: false, hintsUsed: 1, answeredAt: '2026-02-01T00:00:00.000Z', answer: '[]' },
      { id: 'uncertain-2', profileId: 'gayul', missionId: 'shopping', questionId, correct: false, hintsUsed: 2, answeredAt: '2026-02-02T00:00:00.000Z', answer: '[]' },
    ]
    for (const answer of history) await saveAnswer(answer)
    render(<ShoppingMission {...mission({
      history, initialStep: 1, initialScore: 2, initialTotal: 2,
      initialAttemptIds: undefined,
      initialCart: { banana: 3 }, initialPaymentComplete: true,
      initialProgressUpdatedAt: '2026-02-03T00:00:00.000Z',
    })} />)

    expect(screen.getByText('1/3')).toBeInTheDocument()
    expect(screen.queryByText('결제 성공!')).not.toBeInTheDocument()
    await waitFor(async () => expect((await getProgress('gayul'))[0]).toMatchObject({ currentStep: 0, score: 0, total: 0 }))
    expect((await getAnswers('gayul')).map((answer) => answer.id)).toEqual(['uncertain-1', 'uncertain-2'])
    expect((await getProfiles()).find((profile) => profile.id === 'gayul')?.xp).toBe(80)
    expect((await getProfiles()).find((profile) => profile.id === 'hayul')?.xp).toBe(0)
  })

  it('restores only the active run attempts and reports exact final aggregates', async () => {
    const user = userEvent.setup()
    const first = render(<ShoppingMission {...mission()} />)
    await add(user, /사과 추가/)
    await user.click(screen.getByRole('button', { name: '계산대에서 결제' }))
    await user.click(await screen.findByRole('button', { name: '장바구니 고치기' }))
    await add(user, /사과 추가/)
    await add(user, /우유 추가/)
    await user.click(screen.getByRole('button', { name: '계산대에서 결제' }))
    await user.click(await screen.findByRole('button', { name: /다음 쇼핑/ }))
    await waitFor(async () => expect((await getProgress('gayul'))[0]).toMatchObject({
      currentStep: 1, score: 1, total: 2, missionState: { runActive: true, supportAttempt: false },
    }))
    first.unmount()

    const progress = (await getProgress('gayul'))[0]
    const currentRun = await getAnswers('gayul')
    const oldSession = { ...currentRun[0], id: 'old-session-answer', correct: true, hintsUsed: 2, supportAttempt: false }
    await initialiseProfiles()
    const onComplete = vi.fn(async (runAttempts: Array<{ correct: boolean }>) => {
      await completeMissionWithReward({
        profileId: 'gayul', missionId: 'shopping', completed: true, currentStep: 3,
        score: runAttempts.filter((attempt) => attempt.correct).length, total: runAttempts.length,
        updatedAt: new Date().toISOString(), missionState: { runActive: false, attemptIds: [] },
      }, 40)
    })
    render(<ShoppingMission {...mission({
      history: [oldSession, ...currentRun], initialStep: progress.currentStep, initialScore: progress.score,
      initialTotal: progress.total, initialCart: progress.missionState?.cart, initialHintLevel: progress.missionState?.hintLevel,
      initialAttemptIds: progress.missionState?.attemptIds, initialSupportAttempt: progress.missionState?.supportAttempt, onComplete,
    })} />)
    await add(user, /바나나 추가/, 3)
    await user.click(screen.getByRole('button', { name: '계산대에서 결제' }))
    await user.click(await screen.findByRole('button', { name: /다음 쇼핑/ }))
    await add(user, /빵 추가/)
    await add(user, /치즈 500g 추가/)
    await add(user, /사과 추가/, 2)
    await user.click(screen.getByRole('button', { name: '계산대에서 결제' }))
    await user.click(await screen.findByRole('button', { name: /미션 완료/ }))

    const completedAttempts = onComplete.mock.calls[0][0] as Array<{ id: string; correct: boolean; hintsUsed: number }>
    expect(completedAttempts).toHaveLength(4)
    expect(completedAttempts.some((attempt) => attempt.id === oldSession.id)).toBe(false)
    expect(completedAttempts.filter((attempt) => attempt.correct)).toHaveLength(3)
    expect(completedAttempts.reduce((sum, attempt) => sum + attempt.hintsUsed, 0)).toBe(1)
    await waitFor(async () => expect((await getProgress('gayul'))[0]).toMatchObject({
      completed: true, score: 3, total: 4, missionState: { runActive: false, attemptIds: [] },
    }))
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
