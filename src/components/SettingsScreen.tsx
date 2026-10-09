import { useRef, useState } from 'react'
import { createBackup, restoreBackup } from '../storage'
import type { Difficulty, Profile } from '../types'
import { t } from '../i18n'

const difficulties: Difficulty[] = ['easy', 'medium', 'challenge', 'auto']

export function SettingsScreen({ profile, onEdit, onProfileChange, onSwitch, onRestored }: {
  profile: Profile; onEdit: () => void; onProfileChange: (profile: Profile) => void; onSwitch: () => void; onRestored: () => void
}) {
  const language = profile.language
  const inputRef = useRef<HTMLInputElement>(null)
  const [notice, setNotice] = useState('')
  const exportData = async () => {
    const backup = await createBackup()
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url; link.download = `yuli-backup-${new Date().toISOString().slice(0, 10)}.json`; link.click()
    URL.revokeObjectURL(url)
  }
  const importData = async (file?: File) => {
    if (!file) return
    try { await restoreBackup(JSON.parse(await file.text())); setNotice(t(language, 'importSuccess')); onRestored() }
    catch { setNotice(t(language, 'importError')) }
    if (inputRef.current) inputRef.current.value = ''
  }
  return <div className="page"><header className="page-header"><span className="eyebrow">YULI</span><h1>{t(language, 'settings')}</h1></header>
    <section className="settings-card profile-setting"><span className="profile-avatar small">{profile.avatar}</span><div><strong>{profile.name}</strong><small>Year {profile.year}</small></div><button className="text-button" onClick={onEdit}>{t(language, 'edit')}</button></section>
    <section className="settings-card"><h2>{t(language, 'language')}</h2><div className="segmented"><button className={language === 'ko' ? 'active' : ''} onClick={() => onProfileChange({ ...profile, language: 'ko' })}>한국어</button><button className={language === 'en' ? 'active' : ''} onClick={() => onProfileChange({ ...profile, language: 'en' })}>English</button></div></section>
    <section className="settings-card"><h2>{t(language, 'year')}</h2><select value={profile.year ?? ''} onChange={(event) => onProfileChange({ ...profile, year: Number(event.target.value) })}>{Array.from({ length: 8 }, (_, index) => <option key={index + 1} value={index + 1}>Year {index + 1}</option>)}</select></section>
    <section className="settings-card"><h2>{t(language, 'difficulty')}</h2><div className="difficulty-grid">{difficulties.map((difficulty) => <button key={difficulty} className={profile.difficulty === difficulty ? 'choice-chip selected' : 'choice-chip'} onClick={() => onProfileChange({ ...profile, difficulty })}>{t(language, difficulty)}</button>)}</div></section>
    <section className="settings-card"><h2>{t(language, 'pizzaDifficulty')}</h2><div className="difficulty-grid">{difficulties.map((difficulty) => <button key={difficulty} className={(profile.unitDifficulties.pizza ?? profile.difficulty) === difficulty ? 'choice-chip selected' : 'choice-chip'} onClick={() => onProfileChange({ ...profile, unitDifficulties: { ...profile.unitDifficulties, pizza: difficulty } })}>{t(language, difficulty)}</button>)}</div></section>
    <section className="settings-card"><h2>{t(language, 'dataSettings')}</h2><p className="helper">{t(language, 'localNotice')}</p><div className="button-row"><button className="button secondary" onClick={exportData}>{t(language, 'export')}</button><button className="button secondary" onClick={() => inputRef.current?.click()}>{t(language, 'import')}</button></div><input ref={inputRef} hidden type="file" accept="application/json,.json" onChange={(event) => importData(event.target.files?.[0])} />{notice && <p className="notice" role="status">{notice}</p>}<p className="privacy-note">🔒 {t(language, 'privacyNotice')}</p></section>
    <button className="button ghost full" onClick={onSwitch}>{t(language, 'switchProfile')}</button>
  </div>
}
