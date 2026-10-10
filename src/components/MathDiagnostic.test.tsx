import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { defaultProfiles } from '../storage'
import { MathDiagnostic } from './MathDiagnostic'

describe('MathDiagnostic', () => {
  it('runs all 10 questions and returns a recommendation without forcing it', async () => {
    const user = userEvent.setup()
    const onFinish = vi.fn()
    render(<MathDiagnostic profile={{ ...defaultProfiles()[0], year: 7 }} onFinish={onFinish} onClose={vi.fn()} />)
    for (let index = 0; index < 10; index += 1) {
      await user.click(screen.getAllByRole('button').find((button) => button.classList.contains('choice-chip'))!)
      await user.click(screen.getByRole('button', { name: index === 9 ? '다음' : '다음' }))
    }
    expect(screen.getByText(/추천:/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '현재 레벨 유지' }))
    expect(onFinish).toHaveBeenCalledWith(expect.any(Number), expect.stringMatching(/foundation|core|advanced|expert|master/), false)
  })
})
