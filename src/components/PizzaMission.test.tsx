import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildPizzaQuestions, localise } from '../pizzaProblems'
import { defaultProfiles, getAnswers, getProgress, resetDatabaseConnectionForTests, saveProgress } from '../storage'
import type { Language, MathLevel } from '../types'
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
  const slices = screen.getAllByRole('button', { name: /(피자 조각|pizza slice) \d/ })
  for (const slice of slices.slice(0, count)) await user.click(slice)
}
const completeMasterWorking = async (user: ReturnType<typeof userEvent.setup>) => {
  const input = screen.queryByLabelText('두 분수의 공통분모를 입력하세요.') ?? screen.queryByLabelText('Enter a common denominator for both fractions.')
  if (!input) return
  await user.type(input, '12')
  await user.click(screen.getByRole('button', { name: /이 단계 확인|Check this step/ }))
  const fraction = screen.getByLabelText(/통분한 뒤 계산한 분수|Enter the fraction after/)
  await user.type(fraction, '7/12')
  await user.click(screen.getByRole('button', { name: /이 단계 확인|Check this step/ }))
}
const foundationProfile = () => ({ ...defaultProfiles()[0], year: 5 as const, difficulty: 'foundation' as const, mathLevel: 'foundation' as const, adaptiveDifficulty: false })

describe('PizzaMission', () => {
  beforeEach(clearDatabase)
  afterEach(clearDatabase)

  it('checks a visually selected three-quarter pizza and advances', async () => {
    const user = userEvent.setup()
    const profile = foundationProfile()
    render(<PizzaMission profile={profile} history={[]} initialStep={0} initialScore={0} initialTotal={3} wasCompleted={false} onExit={vi.fn()} onComplete={vi.fn()} onDataChanged={vi.fn()} />)
    await selectSlices(user, 3)
    await user.click(screen.getByRole('button', { name: '정답 확인' }))
    expect(await screen.findByText('정확해요!')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /다음 문제/ }))
    expect(screen.getByRole('heading', { name: '두 접시의 주문을 한 판에 합치세요.' })).toBeInTheDocument()
  })

  it('preserves per-profile completion and score when replaying', async () => {
    const profile = foundationProfile()
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
    const profile = { ...foundationProfile(), xp: 30 }
    render(<PizzaMission profile={profile} history={[]} initialStep={0} initialScore={3} initialTotal={3} wasCompleted onExit={vi.fn()} onComplete={onComplete} onDataChanged={vi.fn()} />)

    await selectSlices(user, 3)
    await user.click(screen.getByRole('button', { name: '정답 확인' })); await user.click(await screen.findByRole('button', { name: /다음 문제/ }))
    await selectSlices(user, 3); await user.click(screen.getByRole('button', { name: '정답 확인' })); await user.click(await screen.findByRole('button', { name: /다음 문제/ }))
    await selectSlices(user, 3); await user.click(screen.getByRole('button', { name: '정답 확인' })); await user.click(await screen.findByRole('button', { name: /미션 완료/ }))

    expect(onComplete).toHaveBeenCalledWith(expect.any(Array), false)
    expect(profile.xp).toBe(30)
    await waitFor(async () => expect((await getProgress('gayul'))[0]).toMatchObject({ completed: true, score: 3, total: 3 }))
  })

  it('records the exact challenge question variant for review', async () => {
    const user = userEvent.setup()
    const profile = { ...defaultProfiles()[0], year: 8 as const, difficulty: 'advanced' as const, mathLevel: 'advanced' as const, adaptiveDifficulty: false }
    render(<PizzaMission profile={profile} history={[]} initialStep={2} initialScore={0} initialTotal={3} wasCompleted={false} onExit={vi.fn()} onComplete={vi.fn()} onDataChanged={vi.fn()} />)
    await selectSlices(user, 3)
    await user.click(screen.getByRole('button', { name: '정답 확인' }))
    await waitFor(async () => expect((await getAnswers('gayul'))[0]?.questionId).toBe('pizza-v12-y7-advanced-nested-percent'))
  })

  it('shows one language and reveals translated help only on request', async () => {
    const user = userEvent.setup()
    const profile = { ...foundationProfile(), language: 'en' as const }
    render(<PizzaMission profile={profile} history={[]} initialStep={0} initialScore={0} initialTotal={3} wasCompleted={false} onExit={vi.fn()} onComplete={vi.fn()} onDataChanged={vi.fn()} />)
    expect(screen.getByRole('heading', { name: 'Show 3/4 on the pizza.' })).toBeInTheDocument()
    expect(screen.queryByText('3/4을 피자로 나타내세요.')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Translation help/ }))
    expect(screen.getByText('3/4을 피자로 나타내세요.')).toBeInTheDocument()
  })

  it('does not expose a calculated answer before submission and explains it afterwards', async () => {
    const user = userEvent.setup()
    const profile = { ...defaultProfiles()[0], year: 5 as const, difficulty: 'expert' as const, mathLevel: 'expert' as const, adaptiveDifficulty: false }
    render(<PizzaMission profile={profile} history={[]} initialStep={0} initialScore={0} initialTotal={3} wasCompleted={false} onExit={vi.fn()} onComplete={vi.fn()} onDataChanged={vi.fn()} />)
    expect(screen.getByText('1/3 + 1/4 = ?')).toBeInTheDocument()
    expect(screen.queryByText('답은 7/12예요.')).not.toBeInTheDocument()
    await selectSlices(user, 7)
    await user.click(screen.getByRole('button', { name: '정답 확인' }))
    expect(await screen.findByText('답은 7/12예요.')).toBeInTheDocument()
  })

  it('validates Master working before unlocking the pizza visualisation', async () => {
    const user = userEvent.setup()
    const profile = { ...defaultProfiles()[0], year: 7 as const, difficulty: 'master' as const, mathLevel: 'master' as const, adaptiveDifficulty: false }
    render(<PizzaMission profile={profile} history={[]} initialStep={0} initialScore={0} initialTotal={3} wasCompleted={false} onExit={vi.fn()} onComplete={vi.fn()} onDataChanged={vi.fn()} />)
    expect(screen.getByText('5/6 - 1/4 = ?')).toBeInTheDocument()
    expect(screen.queryByText('답은 7/12예요.')).not.toBeInTheDocument()
    const firstSlice = screen.getAllByRole('button', { name: /피자 조각/ })[0]
    expect(firstSlice).toHaveAttribute('aria-disabled', 'true')

    await user.type(screen.getByLabelText('두 분수의 공통분모를 입력하세요.'), '10')
    await user.click(screen.getByRole('button', { name: '이 단계 확인' }))
    expect(screen.getByRole('alert')).toHaveTextContent('좋은 시도예요')
    await user.clear(screen.getByLabelText('두 분수의 공통분모를 입력하세요.'))
    await user.type(screen.getByLabelText('두 분수의 공통분모를 입력하세요.'), '12')
    await user.click(screen.getByRole('button', { name: '이 단계 확인' }))
    await user.type(screen.getByLabelText('통분한 뒤 계산한 분수를 입력하세요.'), '7/12')
    await user.click(screen.getByRole('button', { name: '이 단계 확인' }))
    expect(firstSlice).toHaveAttribute('aria-disabled', 'false')
    await selectSlices(user, 7)
    await user.click(screen.getByRole('button', { name: '정답 확인' }))
    expect(await screen.findByText('답은 7/12예요.')).toBeInTheDocument()
  })

  it('shows supportive feedback and progressive hints after a wrong answer', async () => {
    const user = userEvent.setup()
    const profile = foundationProfile()
    const question = buildPizzaQuestions(profile, [])[0]
    render(<PizzaMission profile={profile} history={[]} initialStep={0} initialScore={0} initialTotal={3} wasCompleted={false} onExit={vi.fn()} onComplete={vi.fn()} onDataChanged={vi.fn()} />)
    await selectSlices(user, 1)
    await user.click(screen.getByRole('button', { name: '정답 확인' }))
    expect(await screen.findByText('괜찮아요, 다시 살펴봐요.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '유사 문제로 연습' }))
    expect(screen.getByText('같은 생각을 다른 문제로 연습해요')).toBeInTheDocument()
    expect(screen.getByText(/지원 문제의 식 2\/4/)).toBeInTheDocument()
    await selectSlices(user, 1)
    await user.click(screen.getByRole('button', { name: '정답 확인' }))
    expect(await screen.findByText(localise(question.support.alternateExplanation, 'ko'))).toBeInTheDocument()
    expect(screen.queryByText(localise(question.alternateExplanation, 'ko'))).not.toBeInTheDocument()
    await waitFor(async () => expect((await getAnswers('gayul'))[1]).toMatchObject({ supportAttempt: true, objectiveId: 'part-whole' }))
    await user.click(screen.getByRole('button', { name: '다시 시도' }))
    await user.click(screen.getByRole('button', { name: /다음 힌트/ }))
    expect(screen.getByText(/4개의 같은 조각으로 보고 2조각/)).toBeInTheDocument()
  })

  it.each([
    ['foundation', 'ko'], ['core', 'ko'], ['advanced', 'ko'], ['expert', 'ko'], ['master', 'ko'],
    ['foundation', 'en'], ['core', 'en'], ['advanced', 'en'], ['expert', 'en'], ['master', 'en'],
  ] as Array<[MathLevel, Language]>)('uses the %s support hint and explanation in %s', async (level, language) => {
    const user = userEvent.setup()
    const profile = { ...defaultProfiles()[0], year: 5 as const, difficulty: level, mathLevel: level, adaptiveDifficulty: false, language }
    const baseQuestion = buildPizzaQuestions(profile, [])[0]
    render(<PizzaMission profile={profile} history={[]} initialStep={0} initialScore={0} initialTotal={3} wasCompleted={false} onExit={vi.fn()} onComplete={vi.fn()} onDataChanged={vi.fn()} />)
    await completeMasterWorking(user)

    await user.click(screen.getByRole('button', { name: language === 'ko' ? /힌트/ : /Hint/ }))
    expect(screen.getByText(localise(baseQuestion.hints[0], language))).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: language === 'ko' ? /다음 힌트/ : /Next hint/ }))
    expect(screen.getByText(localise(baseQuestion.hints[1], language))).toBeInTheDocument()
    await selectSlices(user, 1)
    await user.click(screen.getByRole('button', { name: language === 'ko' ? '정답 확인' : 'Check answer' }))
    await waitFor(async () => expect((await getAnswers('gayul'))[0]).toMatchObject({ hintsUsed: 2, supportAttempt: false }))
    await user.click(await screen.findByRole('button', { name: language === 'ko' ? '유사 문제로 연습' : 'Try a similar problem' }))

    expect(screen.getByText(localise(baseQuestion.support.hints[0], language))).toBeInTheDocument()
    expect(screen.queryByText(localise(baseQuestion.hints[0], language))).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: language === 'ko' ? /다음 힌트/ : /Next hint/ }))
    expect(screen.getByText(localise(baseQuestion.support.hints[1], language))).toBeInTheDocument()
    await selectSlices(user, baseQuestion.support.target.numerator)
    await user.click(screen.getByRole('button', { name: language === 'ko' ? '정답 확인' : 'Check answer' }))
    expect(await screen.findByText(localise(baseQuestion.support.explanation, language))).toBeInTheDocument()
    expect(screen.queryByText(localise(baseQuestion.explanation, language))).not.toBeInTheDocument()
  })

  it('clears support copy before the next generated stage', async () => {
    const user = userEvent.setup()
    const profile = foundationProfile()
    const questions = buildPizzaQuestions(profile, [])
    render(<PizzaMission profile={profile} history={[]} initialStep={0} initialScore={0} initialTotal={3} wasCompleted={false} onExit={vi.fn()} onComplete={vi.fn()} onDataChanged={vi.fn()} />)
    await selectSlices(user, 1)
    await user.click(screen.getByRole('button', { name: '정답 확인' }))
    await user.click(await screen.findByRole('button', { name: '유사 문제로 연습' }))
    await selectSlices(user, questions[0].support.target.numerator)
    await user.click(screen.getByRole('button', { name: '정답 확인' }))
    await user.click(await screen.findByRole('button', { name: /다음 문제/ }))
    await user.click(screen.getByRole('button', { name: /힌트/ }))
    expect(screen.getByText(localise(questions[1].hints[0], 'ko'))).toBeInTheDocument()
    expect(screen.queryByText(localise(questions[0].support.hints[0], 'ko'))).not.toBeInTheDocument()
  })

  it('restores the saved stage after remounting', () => {
    const profile = foundationProfile()
    render(<PizzaMission profile={profile} history={[]} initialStep={1} initialScore={0} initialTotal={3} wasCompleted={false} onExit={vi.fn()} onComplete={vi.fn()} onDataChanged={vi.fn()} />)
    expect(screen.getByText('2단계 · 해결')).toBeInTheDocument()
    expect(screen.getByText('1/4 + 2/4 = ?')).toBeInTheDocument()
  })

  it('stores only one answer when the check action is triggered twice', async () => {
    const user = userEvent.setup()
    const profile = foundationProfile()
    render(<PizzaMission profile={profile} history={[]} initialStep={0} initialScore={0} initialTotal={3} wasCompleted={false} onExit={vi.fn()} onComplete={vi.fn()} onDataChanged={vi.fn()} />)
    await selectSlices(user, 3)
    await user.dblClick(screen.getByRole('button', { name: '정답 확인' }))
    await waitFor(async () => expect(await getAnswers('gayul')).toHaveLength(1))
  })
})
