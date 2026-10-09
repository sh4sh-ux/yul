import type { AnswerRecord, Language, MissionProgressWithProfile, Profile } from '../types'
import { t } from '../i18n'

const missions = [
  { id: 'pizza', icon: '🍕', key: 'pizzaTitle' as const, colour: 'coral', subject: '1 · FRACTIONS' },
  { id: 'shopping', icon: '🛒', key: 'shopping' as const, colour: 'mint', subject: '2 · MONEY' },
  { id: 'travel', icon: '✈️', key: 'travel' as const, colour: 'blue', subject: '3 · ENGLISH' },
  { id: 'nature', icon: '🥝', key: 'nature' as const, colour: 'green', subject: '4 · SCIENCE' },
  { id: 'creator', icon: '💡', key: 'creator' as const, colour: 'yellow', subject: '5 · CREATIVITY' },
]

export function HomeScreen({ profile, pizzaProgress, onMission, onMap }: { profile: Profile; pizzaProgress?: MissionProgressWithProfile; onMission: () => void; onMap: () => void }) {
  const language = profile.language
  return <div className="page home-page">
    <section className="hero"><div><span className="eyebrow">{t(language, 'hello')}, {profile.name}!</span><h1>{t(language, 'todayAdventure')}</h1><p>{t(language, 'tagline')}</p></div><div className="xp-badge">⭐ {profile.xp} XP</div></section>
    <button className="featured-mission" onClick={onMission}><div className="pizza-art" aria-hidden="true">🍕</div><div className="featured-copy"><span className="mission-number">MISSION 01</span><h2>{t(language, 'pizzaTitle')}</h2><p>{t(language, 'pizzaSubtitle')}</p><span className="button primary inline">{pizzaProgress && pizzaProgress.currentStep > 0 && !pizzaProgress.completed ? t(language, 'resumeMission') : t(language, 'startMission')} →</span></div></button>
    <div className="section-heading"><div><span className="eyebrow">5 REGIONS</span><h2>{t(language, 'mapTitle')}</h2></div><button className="text-button" onClick={onMap}>{t(language, 'explore')} →</button></div>
    <div className="mini-route">{missions.map((mission, index) => <div className={`mini-node ${index === 0 ? 'ready' : ''}`} key={mission.id}><span>{mission.icon}</span><small>{index + 1}</small></div>)}</div>
  </div>
}

export function MapScreen({ language, pizzaCompleted, onPizza, onUnavailable }: { language: Language; pizzaCompleted: boolean; onPizza: () => void; onUnavailable: (title: string) => void }) {
  return <div className="page"><header className="page-header"><span className="eyebrow">FREE EXPLORE</span><h1>{t(language, 'mapTitle')}</h1><p>{t(language, 'lockedNote')}</p></header><div className="adventure-map">{missions.map((mission, index) => <button key={mission.id} className={`map-stop ${mission.colour} ${index % 2 ? 'right' : 'left'}`} onClick={() => mission.id === 'pizza' ? onPizza() : onUnavailable(t(language, mission.key))}><span className="map-icon">{mission.icon}</span><span className="map-copy"><small>{mission.subject}</small><strong>{t(language, mission.key)}</strong><em>{mission.id === 'pizza' ? (pizzaCompleted ? '✓' : t(language, 'available')) : t(language, 'comingSoon')}</em></span></button>)}</div></div>
}

export function UnavailableCard({ language, title, onBack }: { language: Language; title: string; onBack: () => void }) {
  return <div className="page centred-page"><div className="empty-card"><span className="big-icon">🧭</span><h1>{title}</h1><p>{t(language, 'missionUnavailable')}</p><button className="button primary" onClick={onBack}>{t(language, 'back')}</button></div></div>
}

export function ReviewScreen({ language, answers }: { language: Language; answers: AnswerRecord[] }) {
  const wrong = answers.filter((answer) => !answer.correct).slice().reverse()
  const questionText = (questionId: string) => {
    if (questionId === 'slices') return t(language, 'slicesPrompt')
    if (questionId === 'same-denominator') return t(language, 'question2')
    if (questionId === 'same-denominator-easy') return t(language, 'question3Easy')
    if (questionId === 'unlike-denominator-challenge') return t(language, 'question3Challenge')
    return t(language, 'question3')
  }
  return <div className="page"><header className="page-header"><span className="eyebrow">REVIEW</span><h1>{t(language, 'reviewTitle')}</h1><p>{t(language, 'reviewBody')}</p></header>{wrong.length === 0 ? <div className="empty-card"><span className="big-icon">📖</span><p>{t(language, 'noReview')}</p></div> : <div className="review-list">{wrong.map((answer) => <article className="review-card" key={answer.id}><span>🍕</span><div><strong>{t(language, 'pizzaTitle')}</strong><p>{questionText(answer.questionId)}</p><small>{new Date(answer.answeredAt).toLocaleDateString(language === 'ko' ? 'ko-KR' : 'en-NZ')}</small></div></article>)}</div>}</div>
}

export function ProgressScreen({ profile, answers, progress }: { profile: Profile; answers: AnswerRecord[]; progress: MissionProgressWithProfile[] }) {
  const language = profile.language
  const correct = answers.filter((answer) => answer.correct).length
  return <div className="page"><header className="page-header"><span className="eyebrow">PROGRESS</span><h1>{t(language, 'growthTitle')}</h1></header><div className="stats-grid"><article><span>⭐</span><strong>{profile.xp}</strong><small>{t(language, 'totalXp')}</small></article><article><span>🏁</span><strong>{progress.filter((item) => item.completed).length}/5</strong><small>{t(language, 'completed')}</small></article><article><span>✓</span><strong>{answers.length ? `${Math.round(correct / answers.length * 100)}%` : '—'}</strong><small>{t(language, 'accuracy')}</small></article><article><span>✎</span><strong>{answers.length}</strong><small>{t(language, 'answers')}</small></article></div><section className="growth-card"><div className="growth-ring" style={{ '--progress': `${Math.min(profile.xp, 100)}%` } as React.CSSProperties}><span>{profile.avatar}</span></div><div><h2>{profile.name}</h2><p>Year {profile.year}</p><div className="xp-track"><span style={{ width: `${Math.min(profile.xp, 100)}%` }} /></div><small>{profile.xp}/100 XP</small></div></section></div>
}
