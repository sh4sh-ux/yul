import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { defaultProfiles } from '../storage'
import { ProfilePicker } from './ProfilePicker'

describe('ProfilePicker', () => {
  it('renders Korean only when Korean is selected', () => {
    render(<ProfilePicker profiles={defaultProfiles()} language="ko" onLanguage={vi.fn()} onSelect={vi.fn()} onEdit={vi.fn()} />)
    expect(screen.getByRole('heading', { name: '누가 탐험하나요?' })).toBeInTheDocument()
    expect(screen.queryByText('Who is exploring?')).not.toBeInTheDocument()
    expect(screen.getByText('가율')).toBeInTheDocument()
    expect(screen.getByText('하율')).toBeInTheDocument()
    expect(screen.queryByText('Helena')).not.toBeInTheDocument()
  })
  it('renders English only when English is selected', () => {
    render(<ProfilePicker profiles={defaultProfiles()} language="en" onLanguage={vi.fn()} onSelect={vi.fn()} onEdit={vi.fn()} />)
    expect(screen.getByRole('heading', { name: 'Who is exploring?' })).toBeInTheDocument()
    expect(screen.queryByText('누가 탐험하나요?')).not.toBeInTheDocument()
    expect(screen.getByText('Helena')).toBeInTheDocument()
    expect(screen.getByText('Luna')).toBeInTheDocument()
    expect(screen.queryByText('가율')).not.toBeInTheDocument()
  })
  it('changes both profile names immediately with the language selector', async () => {
    const user = userEvent.setup()
    function PickerHarness() {
      const [language, setLanguage] = useState<'ko' | 'en'>('ko')
      return <ProfilePicker profiles={defaultProfiles()} language={language} onLanguage={setLanguage} onSelect={vi.fn()} onEdit={vi.fn()} />
    }
    render(<PickerHarness />)
    expect(screen.getByText('가율')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'English' }))
    expect(screen.getByText('Helena')).toBeInTheDocument()
    expect(screen.getByText('Luna')).toBeInTheDocument()
    expect(screen.queryByText('가율')).not.toBeInTheDocument()
  })
})
