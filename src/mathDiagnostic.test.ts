import { describe, expect, it } from 'vitest'
import { checkDiagnosticAnswer, diagnosticQuestions, scoreDiagnostic } from './mathDiagnostic'

describe('math level diagnostic', () => {
  it('uses 10 questions and different Year 5 and Year 7 structures', () => {
    const year5 = diagnosticQuestions(5)
    const year7 = diagnosticQuestions(7)
    expect(year5).toHaveLength(10)
    expect(year7).toHaveLength(10)
    expect(year5.map((item) => item.id)).not.toEqual(year7.map((item) => item.id))
  })
  it('checks equivalent rational values exactly', () => {
    const question = diagnosticQuestions(5).find((item) => item.id === 'd-equivalent')!
    expect(checkDiagnosticAnswer(question, 1)).toBe(true)
    expect(checkDiagnosticAnswer(question, 0)).toBe(false)
  })
  it('recommends the bottom and top levels from evidence', () => {
    const questions = diagnosticQuestions(5)
    const correct = questions.map((question) => question.options.findIndex((option) => option.value.numerator * question.answer.denominator === question.answer.numerator * option.value.denominator))
    const wrong = correct.map((index) => (index + 1) % 3)
    expect(scoreDiagnostic(questions, wrong).recommendedLevel).toBe('foundation')
    expect(scoreDiagnostic(questions, correct).recommendedLevel).toBe('master')
  })
})
