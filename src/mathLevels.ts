import type { AnswerRecord, Difficulty, MathLevel, MissionId, Profile } from './types'

export const mathLevels: MathLevel[] = ['foundation', 'core', 'advanced', 'expert', 'master']

export const levelRank = (level: MathLevel): number => mathLevels.indexOf(level) + 1

export function normaliseMathLevel(value: Difficulty | unknown): MathLevel {
  if (mathLevels.includes(value as MathLevel)) return value as MathLevel
  if (value === 'easy') return 'foundation'
  if (value === 'medium') return 'core'
  if (value === 'challenge') return 'advanced'
  return 'advanced'
}

export function profileMathLevel(profile: Pick<Profile, 'mathLevel' | 'difficulty'>): MathLevel {
  return normaliseMathLevel(profile.mathLevel ?? profile.difficulty)
}

export function migrateProfile<T extends Partial<Profile> & Pick<Profile, 'difficulty'>>(profile: T): T & Pick<Profile, 'mathLevel' | 'adaptiveDifficulty'> {
  return {
    ...profile,
    mathLevel: normaliseMathLevel(profile.mathLevel ?? profile.difficulty),
    adaptiveDifficulty: typeof profile.adaptiveDifficulty === 'boolean' ? profile.adaptiveDifficulty : profile.difficulty === 'auto',
  }
}

export function recommendedLevelFromScore(score: number, total: number): MathLevel {
  const ratio = total > 0 ? score / total : 0
  if (ratio < 0.3) return 'foundation'
  if (ratio < 0.5) return 'core'
  if (ratio < 0.7) return 'advanced'
  if (ratio < 0.9) return 'expert'
  return 'master'
}

/** A single miss never lowers a level. Downward adjustment needs a full evidence window
 * including two failed supported retries; otherwise the learner receives more support. */
export function adjustedMathLevel(current: MathLevel, history: AnswerRecord[], missionId: MissionId = 'pizza'): MathLevel {
  const recent = history.filter((item) => item.missionId === missionId).slice(-10)
  if (recent.length < 8) return current
  const correct = recent.filter((item) => item.correct).length
  const lowSupportSuccess = recent.filter((item) => item.correct && item.hintsUsed <= 1).length
  const supportedFailures = recent.filter((item) => !item.correct && item.supportAttempt).length
  const index = mathLevels.indexOf(current)
  if (correct / recent.length >= 0.8 && lowSupportSuccess >= 6) return mathLevels[Math.min(index + 1, mathLevels.length - 1)]
  if (correct / recent.length < 0.45 && supportedFailures >= 2) return mathLevels[Math.max(index - 1, 0)]
  return current
}
