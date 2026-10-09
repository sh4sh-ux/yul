import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { AnswerRecord } from '../types'
import { ReviewScreen } from './Screens'

describe('ReviewScreen', () => {
  it('reconstructs the exact v1.1 question from its collision-safe ID', () => {
    const answer: AnswerRecord = {
      id: 'review-1', profileId: 'gayul', missionId: 'pizza', questionId: 'pizza-v11-challenge-2-3-plus-1-6',
      correct: false, hintsUsed: 1, answeredAt: '2026-10-10T00:00:00.000Z', answer: '4/6',
    }
    render(<ReviewScreen language="ko" answers={[answer]} />)
    expect(screen.getByText('2/3와 1/6을 합친 양을 만들어 보세요.')).toBeInTheDocument()
  })
})
