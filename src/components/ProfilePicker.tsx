import type { Language, Profile } from '../types'
import { t } from '../i18n'
import { Logo } from './Logo'

export function ProfilePicker({ profiles, language, onLanguage, onSelect, onEdit }: {
  profiles: Profile[]; language: Language; onLanguage: (language: Language) => void; onSelect: (profile: Profile) => void; onEdit: (profile: Profile) => void
}) {
  return <main className="welcome-shell">
    <div className="welcome-top"><Logo /><p>{t(language, 'tagline')}</p><div className="segmented language-switch" aria-label={t(language, 'language')}><button className={language === 'ko' ? 'active' : ''} onClick={() => onLanguage('ko')}>한국어</button><button className={language === 'en' ? 'active' : ''} onClick={() => onLanguage('en')}>English</button></div></div>
    <section className="profile-panel"><span className="eyebrow">YULI EXPLORERS</span><h1>{t(language, 'chooseLearner')}</h1><div className="profile-list">{profiles.map((profile) => <article className="profile-card" key={profile.id}><button className="profile-main" onClick={() => onSelect(profile)}><span className="profile-avatar">{profile.avatar}</span><span><strong>{profile.name}</strong><small>{profile.year ? `Year ${profile.year}` : t(language, 'chooseYear')}</small></span><span className="arrow">→</span></button><button className="text-button" onClick={() => onEdit(profile)}>{t(language, 'edit')}</button></article>)}</div></section>
    <footer>YULI by NARO · v1.0</footer>
  </main>
}
