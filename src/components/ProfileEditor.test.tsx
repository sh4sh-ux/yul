import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { defaultProfiles } from '../storage'
import { ProfileEditor } from './ProfileEditor'

describe('ProfileEditor', () => {
  it('edits Korean and English names independently while retaining the stable profile ID', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<ProfileEditor profile={{ ...defaultProfiles()[0], year: 5 }} language="ko" onSave={onSave} onCancel={vi.fn()} />)

    await user.clear(screen.getByLabelText('한국어 이름'))
    await user.type(screen.getByLabelText('한국어 이름'), '가율별')
    await user.clear(screen.getByLabelText('영어 이름'))
    await user.type(screen.getByLabelText('영어 이름'), 'Helen')
    await user.click(screen.getByRole('button', { name: '저장' }))

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      id: 'gayul', name: '가율별', names: { ko: '가율별', en: 'Helen' },
    }))
  })
})
