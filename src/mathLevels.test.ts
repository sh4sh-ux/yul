import { describe, expect, it } from 'vitest'
import { adjustedMathLevel, normaliseMathLevel } from './mathLevels'
import type { AnswerRecord } from './types'

const records = (correct: boolean, supportAttempt = false): AnswerRecord[] => Array.from({ length: 8 }, (_, index) => ({ id: String(index), profileId: 'gayul', missionId: 'pizza', questionId: String(index), correct, hintsUsed: correct ? 0 : 2, supportAttempt, answeredAt: new Date(index).toISOString(), answer: '' }))

describe('math level migration and adjustment', () => {
  it('maps legacy settings without losing intent', () => {
    expect(normaliseMathLevel('easy')).toBe('foundation')
    expect(normaliseMathLevel('medium')).toBe('core')
    expect(normaliseMathLevel('challenge')).toBe('advanced')
    expect(normaliseMathLevel('auto')).toBe('advanced')
  })
  it('never lowers from ordinary wrong answers without supported retries', () => expect(adjustedMathLevel('advanced', records(true).slice(0, 4).concat(records(false).slice(0, 4)))).toBe('advanced'))
  it('requires supported failures before lowering', () => {
    expect(adjustedMathLevel('advanced', records(false))).toBe('advanced')
    expect(adjustedMathLevel('advanced', records(false, true))).toBe('core')
  })
})
