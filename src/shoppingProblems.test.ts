import { describe, expect, it } from 'vitest'
import { defaultProfiles } from './storage'
import { buildShoppingQuestions, calculateCart, shoppingReviewPrompt, validateShoppingCart } from './shoppingProblems'
import type { AnswerRecord, MathLevel, Profile } from './types'

const profileFor = (level: MathLevel, year: number): Profile => ({
  ...defaultProfiles()[0], year, difficulty: level, mathLevel: level, adaptiveDifficulty: false,
})

const solutionFor = (question: ReturnType<typeof buildShoppingQuestions>[number]) => {
  if (question.bestValueProductId) return { [question.bestValueProductId]: 1 }
  return Object.fromEntries(question.conditions.map((condition) => [condition.productId, condition.exact ?? condition.min ?? 0]))
}

describe('shopping problem bank', () => {
  it.each(['foundation', 'core', 'advanced', 'expert', 'master'] as MathLevel[])('provides three solvable, collision-safe %s stages for Year 5 and Year 7', (level) => {
    const year5 = buildShoppingQuestions(profileFor(level, 5), [])
    const year7 = buildShoppingQuestions(profileFor(level, 7), [])
    expect(year5).toHaveLength(3)
    expect(year7).toHaveLength(3)
    expect(year5.map((question) => question.id)).not.toEqual(year7.map((question) => question.id))
    expect(new Set([...year5, ...year7].map((question) => question.id)).size).toBe(6)
    for (const question of [...year5, ...year7]) {
      expect(validateShoppingCart(question, solutionFor(question))).toBe(true)
      expect(question.curriculumBand).toBe(level === 'master' ? 'extension' : 'core')
    }
  })

  it('calculates percentage discounts and change using integer cents', () => {
    const question = buildShoppingQuestions(profileFor('core', 5), [])[1]
    expect(calculateCart(question, { milk: 2 })).toEqual({ subtotalCents: 800, discountCents: 200, totalCents: 600, remainingCents: 100 })
    expect(validateShoppingCart(question, { milk: 2 })).toBe(true)
    expect(validateShoppingCart(question, { milk: 1 })).toBe(false)
  })

  it('checks unit value and every compound constraint rather than total alone', () => {
    const unitPrice = buildShoppingQuestions(profileFor('expert', 7), [])[1]
    expect(validateShoppingCart(unitPrice, { 'eggs-12': 1 })).toBe(true)
    expect(validateShoppingCart(unitPrice, { 'eggs-6': 1 })).toBe(false)

    const compound = buildShoppingQuestions(profileFor('master', 7), [])[2]
    const solution = solutionFor(compound)
    expect(validateShoppingCart(compound, solution)).toBe(true)
    expect(validateShoppingCart(compound, { ...solution, bread: 1 })).toBe(false)
    expect(validateShoppingCart(compound, { ...solution, 'cheese-250': 1 })).toBe(false)
  })

  it('keeps shopping adaptation independent from pizza answer history', () => {
    const profile = { ...profileFor('advanced', 5), adaptiveDifficulty: true }
    const pizzaHistory: AnswerRecord[] = Array.from({ length: 10 }, (_, index) => ({
      id: `pizza-${index}`, profileId: 'gayul', missionId: 'pizza', questionId: `q-${index}`, correct: true,
      hintsUsed: 0, answeredAt: new Date(index).toISOString(), answer: 'ok',
    }))
    expect(buildShoppingQuestions(profile, pizzaHistory)[0].level).toBe('advanced')
  })

  it('reconstructs Korean and English review prompts from stable IDs', () => {
    const question = buildShoppingQuestions(profileFor('advanced', 5), [])[2]
    expect(shoppingReviewPrompt(question.id, 'ko')).toBe(question.prompt.ko)
    expect(shoppingReviewPrompt(question.id, 'en')).toBe(question.prompt.en)
    expect(shoppingReviewPrompt('shopping-legacy-unknown', 'en')).toBeNull()
  })
})
