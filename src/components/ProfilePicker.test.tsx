import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { defaultProfiles } from '../storage'
import { ProfilePicker } from './ProfilePicker'

describe('ProfilePicker', () => {
  it('renders Korean only when Korean is selected', () => {
    render(<ProfilePicker profiles={defaultProfiles()} language="ko" onLanguage={vi.fn()} onSelect={vi.fn()} onEdit={vi.fn()} />)
    expect(screen.getByRole('heading', { name: '누가 탐험하나요?' })).toBeInTheDocument()
    expect(screen.queryByText('Who is exploring?')).not.toBeInTheDocument()
  })
  it('renders English only when English is selected', () => {
    render(<ProfilePicker profiles={defaultProfiles()} language="en" onLanguage={vi.fn()} onSelect={vi.fn()} onEdit={vi.fn()} />)
    expect(screen.getByRole('heading', { name: 'Who is exploring?' })).toBeInTheDocument()
    expect(screen.queryByText('누가 탐험하나요?')).not.toBeInTheDocument()
  })
})
