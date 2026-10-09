import { describe, expect, it } from 'vitest'
import { addFractions, fractionsEqual, normaliseFraction, parseFraction, suggestedDifficulty } from './fractions'

describe('exact fraction maths', () => {
  it('normalises fractions without floating-point arithmetic', () => {
    expect(normaliseFraction({ numerator: 6, denominator: 8 })).toEqual({ numerator: 3, denominator: 4 })
  })
  it('adds unlike denominators exactly', () => {
    expect(addFractions({ numerator: 1, denominator: 2 }, { numerator: 1, denominator: 4 })).toEqual({ numerator: 3, denominator: 4 })
  })
  it('compares equivalent fractions', () => {
    expect(fractionsEqual({ numerator: 2, denominator: 4 }, { numerator: 1, denominator: 2 })).toBe(true)
  })
  it('parses valid answers and rejects invalid ones', () => {
    expect(parseFraction(' 3 / 4 ')).toEqual({ numerator: 3, denominator: 4 })
    expect(parseFraction('0.75')).toBeNull()
    expect(parseFraction('3/0')).toBeNull()
  })
})

describe('rule-based difficulty', () => {
  it('moves up after four correct answers with few hints', () => {
    expect(suggestedDifficulty([{ correct: true, hintsUsed: 0 }, { correct: true, hintsUsed: 0 }, { correct: false, hintsUsed: 0 }, { correct: true, hintsUsed: 0 }, { correct: true, hintsUsed: 1 }])).toBe('challenge')
  })
  it('provides easier work after two or fewer correct answers', () => {
    expect(suggestedDifficulty([{ correct: false, hintsUsed: 1 }, { correct: true, hintsUsed: 1 }, { correct: false, hintsUsed: 0 }, { correct: false, hintsUsed: 1 }, { correct: true, hintsUsed: 0 }])).toBe('easy')
  })
})
