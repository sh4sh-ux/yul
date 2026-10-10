export interface Fraction { numerator: number; denominator: number }
export interface Rational { numerator: bigint; denominator: bigint }

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

const bigintGcd = (a: bigint, b: bigint): bigint => b === 0n ? (a < 0n ? -a : a) : bigintGcd(b, a % b)

const normaliseRational = (numerator: bigint, denominator: bigint): Rational | null => {
  if (denominator === 0n) return null
  const sign = denominator < 0n ? -1n : 1n
  const divisor = bigintGcd(numerator, denominator)
  return { numerator: sign * numerator / divisor, denominator: sign * denominator / divisor }
}

/** Parses one integer, fraction, finite decimal or percentage without floats. */
export function parseRational(value: string): Rational | null {
  const compact = value.trim().replace(/\s+/g, '').replace(',', '.')
  if (compact.length === 0 || compact.length > 64) return null
  const fraction = compact.match(/^([+-]?\d+)\/([+-]?\d+)$/)
  if (fraction) {
    try { return normaliseRational(BigInt(fraction[1]), BigInt(fraction[2])) } catch { return null }
  }

  const numeric = compact.match(/^([+-]?)(?:(\d+)(?:\.(\d*))?|\.(\d+))(%?)$/)
  if (!numeric) return null
  try {
    const negative = numeric[1] === '-'
    const whole = numeric[2] ?? '0'
    const decimals = numeric[3] ?? numeric[4] ?? ''
    const digits = BigInt(`${whole}${decimals}` || '0') * (negative ? -1n : 1n)
    const decimalScale = 10n ** BigInt(decimals.length)
    const percentScale = numeric[5] === '%' ? 100n : 1n
    return normaliseRational(digits, decimalScale * percentScale)
  } catch { return null }
}

export function rationalsEqual(a: Rational, b: Rational): boolean {
  return a.numerator === b.numerator && a.denominator === b.denominator
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
