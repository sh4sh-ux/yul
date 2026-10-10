export type Language = 'ko' | 'en'
export type MathLevel = 'foundation' | 'core' | 'advanced' | 'expert' | 'master'
export type LegacyDifficulty = 'easy' | 'medium' | 'challenge'
export type Difficulty = MathLevel | LegacyDifficulty | 'auto'
export type MissionId = 'pizza' | 'shopping' | 'travel' | 'nature' | 'creator'

export interface AnswerRecord {
  id: string
  profileId: string
  missionId: MissionId
  questionId: string
  correct: boolean
  hintsUsed: number
  answeredAt: string
  answer: string
  objectiveId?: string
  supportAttempt?: boolean
}

export interface MissionProgress {
  missionId: MissionId
  completed: boolean
  currentStep: number
  score: number
  total: number
  updatedAt: string
  /** Optional mission UI state. Older progress and v1 backups remain valid without it. */
  missionState?: {
    cart?: Record<string, number>
    hintLevel?: number
    attemptIds?: string[]
    supportAttempt?: boolean
    runActive?: boolean
  }
}

export interface Profile {
  id: 'gayul' | 'hayul'
  name: string
  avatar: string
  year: number | null
  language: Language
  difficulty: Difficulty
  /** Independent from school year. Added in 1.2; legacy records are migrated on read. */
  mathLevel: MathLevel
  adaptiveDifficulty: boolean
  diagnostic?: DiagnosticResult
  unitDifficulties: Partial<Record<MissionId, Difficulty>>
  xp: number
  createdAt: string
  updatedAt: string
}

export interface DiagnosticResult {
  completedAt: string
  score: number
  total: number
  recommendedLevel: MathLevel
  applied: boolean
}

export interface AppBackup {
  schema: 'yuli-backup'
  version: 1
  exportedAt: string
  profiles: Profile[]
  answers: AnswerRecord[]
  progress: MissionProgressWithProfile[]
}

export interface MissionProgressWithProfile extends MissionProgress {
  profileId: string
}

export type Screen = 'profiles' | 'home' | 'map' | 'review' | 'progress' | 'settings' | 'mission-intro' | 'mission' | 'shopping-intro' | 'shopping-mission'
