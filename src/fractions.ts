export interface Fraction { numerator: number; denominator: number }

const gcd = (a: number, b: number): number => b === 0 ? Math.abs(a) : gcd(b, a % b)

export function normaliseFraction(value: Fraction): Fraction {
  if (!Number.isInteger(value.numerator) || !Number.isInteger(value.denominator) || value.denominator === 0) {
    throw new Error('Invalid fraction')
  }
  const sign = value.denominator < 0 ? -1 : 1
  const divisor = gcd(value.numerator, value.denominator)
  return { numerator: sign * value.numerator / divisor, denominator: Math.abs(value.denominator) / divisor }
}

export function addFractions(a: Fraction, b: Fraction): Fraction {
  return normaliseFraction({
    numerator: a.numerator * b.denominator + b.numerator * a.denominator,
    denominator: a.denominator * b.denominator,
  })
}

export function fractionsEqual(a: Fraction, b: Fraction): boolean {
  return a.numerator * b.denominator === b.numerator * a.denominator
}

export function parseFraction(value: string): Fraction | null {
  const match = value.trim().match(/^(-?\d+)\s*\/\s*(-?\d+)$/)
  if (!match) return null
  try { return normaliseFraction({ numerator: Number(match[1]), denominator: Number(match[2]) }) } catch { return null }
}

export function suggestedDifficulty(recent: Array<{ correct: boolean; hintsUsed: number }>): 'easy' | 'medium' | 'challenge' {
  const five = recent.slice(-5)
  if (five.length < 5) return 'medium'
  const correct = five.filter((answer) => answer.correct).length
  const hints = five.reduce((sum, answer) => sum + answer.hintsUsed, 0)
  if (correct >= 4 && hints <= 1) return 'challenge'
  if (correct <= 2) return 'easy'
  return 'medium'
}
