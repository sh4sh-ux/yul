export type Language = 'ko' | 'en'
export type Difficulty = 'easy' | 'medium' | 'challenge' | 'auto'
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
}

export interface MissionProgress {
  missionId: MissionId
  completed: boolean
  currentStep: number
  score: number
  total: number
  updatedAt: string
}

export interface Profile {
  id: 'gayul' | 'hayul'
  name: string
  avatar: string
  year: number | null
  language: Language
  difficulty: Difficulty
  unitDifficulties: Partial<Record<MissionId, Difficulty>>
  xp: number
  createdAt: string
  updatedAt: string
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

export type Screen = 'profiles' | 'home' | 'map' | 'review' | 'progress' | 'settings' | 'mission-intro' | 'mission'
