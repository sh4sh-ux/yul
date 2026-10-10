import { describe, expect, it } from 'vitest'
import { buildPizzaQuestions, localise, resolvePizzaDifficulty } from './pizzaProblems'
import { defaultProfiles } from './storage'
import type { AnswerRecord, MathLevel, Profile } from './types'

const profileFor = (year: number, level: MathLevel, adaptiveDifficulty = false): Profile => ({ ...defaultProfiles()[0], year, mathLevel: level, difficulty: level, adaptiveDifficulty, unitDifficulties: {} })
const recent = (results: Array<{ correct: boolean; supportAttempt?: boolean }>): AnswerRecord[] => results.map((result, index) => ({
  id: `answer-${index}`, profileId: 'gayul', missionId: 'pizza', questionId: `q-${index}`, correct: result.correct,
  supportAttempt: result.supportAttempt, hintsUsed: result.correct ? 0 : 2, answeredAt: `2026-01-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`, answer: '1/2',
}))

describe('five-level pizza problem bank', () => {
  it('defaults new learners to Advanced Level 3', () => {
    const profile = { ...defaultProfiles()[0], year: 5 }
    expect(resolvePizzaDifficulty(profile, [])).toBe('advanced')
    expect(buildPizzaQuestions(profile, [])[0].equation).toContain('75%')
  })
  it('provides all five levels with collision-safe IDs and exact targets', () => {
    for (const level of ['foundation', 'core', 'advanced', 'expert', 'master'] as MathLevel[]) {
      const questions = buildPizzaQuestions(profileFor(5, level), [])
      expect(questions).toHaveLength(3)
      expect(new Set(questions.map((question) => question.id)).size).toBe(3)
      expect(questions.every((question) => question.id.startsWith(`pizza-v12-y5-${level}-`))).toBe(true)
      expect(questions.every((question) => Number.isInteger(question.target.numerator) && question.target.denominator === question.denominator)).toBe(true)
    }
  })
  it('uses structurally different Year 5 and Year 7 Advanced pathways', () => {
    const year5 = buildPizzaQuestions(profileFor(5, 'advanced'), [])
    const year7 = buildPizzaQuestions(profileFor(7, 'advanced'), [])
    expect(year5.map((question) => question.objectiveId)).toEqual(['fraction-decimal-percent', 'two-step-word-problem', 'multiplicative-fraction'])
    expect(year7.map((question) => question.objectiveId)).toEqual(['ratio-percent', 'compound-percent', 'nested-percent'])
  })
  it('marks Master as extension rather than core curriculum', () => {
    expect(buildPizzaQuestions(profileFor(7, 'master'), []).every((question) => question.curriculumBand === 'extension')).toBe(true)
    expect(buildPizzaQuestions(profileFor(7, 'expert'), []).every((question) => question.curriculumBand === 'core')).toBe(true)
  })
  it('keeps calculated results out of Expert and Master order tickets', () => {
    for (const level of ['expert', 'master'] as MathLevel[]) {
      for (const question of buildPizzaQuestions(profileFor(7, level), [])) {
        expect(question.equation).toContain('?')
        expect(question.support.equation).toContain('?')
      }
    }
  })
  it('provides validated intermediate working for every Master task', () => {
    for (const year of [5, 7]) {
      const questions = buildPizzaQuestions(profileFor(year, 'master'), [])
      expect(questions.every((question) => question.workingSteps?.length === 2)).toBe(true)
      for (const question of questions) for (const step of question.workingSteps ?? []) {
        expect(step.prompt.ko).toBeTruthy()
        expect(step.prompt.en).toBeTruthy()
        expect(step.acceptedAnswers.length).toBeGreaterThan(0)
      }
    }
  })
  it('does not lower after ordinary misses and requires failed supported retries', () => {
    const adaptive = profileFor(7, 'advanced', true)
    expect(resolvePizzaDifficulty(adaptive, recent([{ correct: false }]))).toBe('advanced')
    expect(resolvePizzaDifficulty(adaptive, recent(Array.from({ length: 8 }, (_, index) => ({ correct: index < 2, supportAttempt: index >= 6 }))))).toBe('core')
  })
  it('moves up only after sustained strong evidence', () => {
    expect(resolvePizzaDifficulty(profileFor(5, 'advanced', true), recent(Array.from({ length: 8 }, () => ({ correct: true }))))).toBe('expert')
  })
  it('keeps one language visible at a time', () => {
    expect(localise(buildPizzaQuestions(profileFor(5, 'advanced'), [])[0].prompt, 'en')).toBe('Show the pizza amount equal to 75%.')
  })
  it.each([5, 7])('provides self-contained bilingual support data for every level in Year %s', (year) => {
    for (const level of ['foundation', 'core', 'advanced', 'expert', 'master'] as MathLevel[]) {
      for (const question of buildPizzaQuestions(profileFor(year, level), [])) {
        const answer = `${question.support.target.numerator}/${question.support.target.denominator}`
        expect(question.support.hints).toHaveLength(2)
        for (const language of ['ko', 'en'] as const) {
          expect(localise(question.support.prompt, language)).not.toBe(localise(question.prompt, language))
          expect(localise(question.support.hints[0], language)).toContain(question.support.equation)
          expect(localise(question.support.hints[1], language)).toContain(String(question.support.denominator))
          expect(localise(question.support.hints[1], language)).toContain(String(question.support.target.numerator))
          expect(localise(question.support.explanation, language)).toContain(answer)
          expect(localise(question.support.alternateExplanation, language)).toContain(answer)
        }
      }
    }
  })
})
