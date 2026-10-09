import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { defaultProfiles } from '../storage'
import { PizzaMission } from './PizzaMission'

describe('PizzaMission', () => {
  it('checks a visually selected three-quarter pizza and advances', async () => {
    const user = userEvent.setup()
    const profile = { ...defaultProfiles()[0], year: 5 as const, difficulty: 'medium' as const }
    render(<PizzaMission profile={profile} history={[]} initialStep={0} wasCompleted={false} onExit={vi.fn()} onComplete={vi.fn()} onDataChanged={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: '1' }))
    await user.click(screen.getByRole('button', { name: '2' }))
    await user.click(screen.getByRole('button', { name: '3' }))
    await user.click(screen.getByRole('button', { name: '정답 확인' }))
    expect(await screen.findByText('정확해요!')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /다음 문제/ }))
    expect(screen.getByRole('heading', { name: '1/4 피자와 2/4 피자를 합치면 얼마일까요?' })).toBeInTheDocument()
  })
})
