import { useState } from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { InteractivePizza, pizzaSlicePath } from './InteractivePizza'

function Harness({ denominator = 4 }: { denominator?: number }) {
  const [selected, setSelected] = useState<Set<number>>(new Set())
  return <><InteractivePizza denominator={denominator} selected={selected} sliceLabel="slice" onToggle={(index) => setSelected((current) => {
    const next = new Set(current); if (next.has(index)) next.delete(index); else next.add(index); return next
  })} /><output>{selected.size}/{denominator}</output></>
}

describe('InteractivePizza', () => {
  it('creates one equal-angle SVG wedge for every denominator slice', () => {
    render(<Harness denominator={8} />)
    expect(within(screen.getByRole('group')).getAllByRole('button')).toHaveLength(8)
    expect(pizzaSlicePath(0, 4)).toContain('A 91 91')
  })

  it('selects and deselects a slice with live fraction output', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const first = screen.getByRole('button', { name: 'slice 1' })
    await user.click(first)
    expect(first).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('1/4')).toBeInTheDocument()
    await user.click(first)
    expect(first).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByText('0/4')).toBeInTheDocument()
  })

  it('supports keyboard selection with Space and Enter', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const first = screen.getByRole('button', { name: 'slice 1' })
    first.focus(); await user.keyboard(' ')
    expect(first).toHaveAttribute('aria-pressed', 'true')
    await user.keyboard('{Enter}')
    expect(first).toHaveAttribute('aria-pressed', 'false')
  })
})
