import { describe, expect, it } from 'vitest'
import styles from './styles.css?inline'

describe('shopping brand colours', () => {
  it('defines the mint token used by selected products and the trolley badge', () => {
    expect(styles).toMatch(/--mint:\s*#[0-9a-f]{6}/i)
    expect(styles).toContain('.product-card.selected')
    expect(styles).toContain('border-color: var(--mint)')
    expect(styles).toContain('.cart-panel h2 small')
    expect(styles).toContain('background: var(--mint)')
  })
})
