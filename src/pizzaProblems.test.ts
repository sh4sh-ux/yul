import { describe, expect, it } from 'vitest'
import { buildPizzaQuestions, localise, resolvePizzaDifficulty } from './pizzaProblems'
import { defaultProfiles } from './storage'
import type { AnswerRecord, Difficulty, Profile } from './types'

const profileFor = (year: number, difficulty: Difficulty): Profile => ({ ...defaultProfiles()[0], year, difficulty, unitDifficulties: { pizza: difficulty } })
const recent = (results: boolean[]): AnswerRecord[] => results.map((correct, index) => ({
  id: `answer-${index}`, profileId: 'gayul', missionId: 'pizza', questionId: `q-${index}`, correct,
  hintsUsed: 0, answeredAt: `2026-01-0${index + 1}T00:00:00.000Z`, answer: '1/2',
}))

describe('pizza mission personalisation', () => {
  it('provides foundational comparison work for an early-year easy learner', () => {
    const questions = buildPizzaQuestions(profileFor(2, 'easy'), [])
    expect(questions.map((question) => question.denominator)).toEqual([4, 4, 4])
    expect(questions[2].id).toBe('pizza-v11-challenge-compare-quarters')
  })

  it('provides eighths and unlike denominators for an older challenge learner', () => {
    const questions = buildPizzaQuestions(profileFor(8, 'challenge'), [])
    expect(questions.map((question) => question.denominator)).toEqual([8, 8, 6])
    expect(questions[2].target).toEqual({ numerator: 5, denominator: 6 })
  })

  it('retains rule-based automatic difficulty', () => {
    const automatic = profileFor(6, 'auto')
    expect(resolvePizzaDifficulty(automatic, recent([true, true, true, true, false]))).toBe('challenge')
    expect(resolvePizzaDifficulty(automatic, recent([false, false, true, false, true]))).toBe('easy')
  })

  it('uses unique v1.1 IDs and localises one language at a time', () => {
    const questions = buildPizzaQuestions(profileFor(5, 'medium'), [])
    expect(new Set(questions.map((question) => question.id)).size).toBe(3)
    expect(questions.every((question) => question.id.startsWith('pizza-v11-'))).toBe(true)
    expect(localise(questions[0].prompt, 'en')).toBe('Select 3 of 4 pizza slices to make 3/4.')
  })
})
