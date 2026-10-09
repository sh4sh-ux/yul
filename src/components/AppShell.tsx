import type { Language, Profile, Screen } from '../types'
import { t } from '../i18n'
import { Logo } from './Logo'

const nav: Array<{ screen: Screen; icon: string; key: 'home' | 'explore' | 'review' | 'growth' }> = [
  { screen: 'home', icon: '⌂', key: 'home' }, { screen: 'map', icon: '◇', key: 'explore' },
  { screen: 'review', icon: '↻', key: 'review' }, { screen: 'progress', icon: '↗', key: 'growth' },
]

export function AppShell({ profile, screen, children, onNavigate, onSettings }: {
  profile: Profile; screen: Screen; children: React.ReactNode; onNavigate: (screen: Screen) => void; onSettings: () => void
}) {
  const language: Language = profile.language
  return <div className="app-shell">
    <header className="topbar"><button className="logo-button" onClick={() => onNavigate('home')}><Logo compact /></button><button className="profile-pill" onClick={onSettings} aria-label={t(language, 'settings')}><span>{profile.avatar}</span><span>{profile.name}</span></button></header>
    <main className="screen-content">{children}</main>
    {!['mission', 'mission-intro'].includes(screen) && <nav className="bottom-nav" aria-label="Primary">{nav.map((item) => <button key={item.screen} className={screen === item.screen ? 'active' : ''} onClick={() => onNavigate(item.screen)}><span>{item.icon}</span><small>{t(language, item.key)}</small></button>)}</nav>}
  </div>
}
