import { useRef, useState } from 'react'
import { mathLevels } from '../mathLevels'
import { createBackup, restoreBackup } from '../storage'
import type { MathLevel, Profile } from '../types'
import { t } from '../i18n'
import { profileDisplayName } from '../profileNames'
import { MathDiagnostic } from './MathDiagnostic'

export function SettingsScreen({ profile, onEdit, onProfileChange, onSwitch, onRestored }: {
  profile: Profile; onEdit: () => void; onProfileChange: (profile: Profile) => void; onSwitch: () => void; onRestored: () => void
}) {
  const language = profile.language
  const inputRef = useRef<HTMLInputElement>(null)
  const [notice, setNotice] = useState('')
  const [diagnosticOpen, setDiagnosticOpen] = useState(false)
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
    <section className="settings-card profile-setting"><span className="profile-avatar small">{profile.avatar}</span><div><strong>{profileDisplayName(profile, language)}</strong><small>Year {profile.year}</small></div><button className="text-button" onClick={onEdit}>{t(language, 'edit')}</button></section>
    <section className="settings-card"><h2>{t(language, 'language')}</h2><div className="segmented"><button className={language === 'ko' ? 'active' : ''} onClick={() => onProfileChange({ ...profile, language: 'ko' })}>한국어</button><button className={language === 'en' ? 'active' : ''} onClick={() => onProfileChange({ ...profile, language: 'en' })}>English</button></div></section>
    <section className="settings-card"><h2>{t(language, 'year')}</h2><select value={profile.year ?? ''} onChange={(event) => onProfileChange({ ...profile, year: Number(event.target.value) })}>{Array.from({ length: 8 }, (_, index) => <option key={index + 1} value={index + 1}>Year {index + 1}</option>)}</select></section>
    <section className="settings-card"><h2>{language === 'ko' ? '수학 학습 레벨' : 'Maths learning level'}</h2><p className="helper">{language === 'ko' ? `Year ${profile.year}와 독립적으로 관리됩니다. Level 5는 학교 필수 진도와 구분된 확장 학습입니다.` : `Managed independently from Year ${profile.year}. Level 5 is extension learning, separate from required school progress.`}</p><div className="difficulty-grid level-grid">{mathLevels.map((level) => <button key={level} className={profile.mathLevel === level ? 'choice-chip selected' : 'choice-chip'} onClick={() => onProfileChange({ ...profile, mathLevel: level, difficulty: level })}>{t(language, level)}</button>)}</div><label className="toggle-row"><input type="checkbox" checked={profile.adaptiveDifficulty} onChange={(event) => onProfileChange({ ...profile, adaptiveDifficulty: event.target.checked })} /><span>{language === 'ko' ? '충분한 학습 근거가 쌓이면 자동 조절' : 'Adjust automatically after enough evidence'}</span></label><button className="button secondary full" onClick={() => setDiagnosticOpen(true)}>{language === 'ko' ? '10문항 레벨 진단 시작' : 'Start 10-question level check'}</button>{profile.diagnostic && <p className="notice">{language === 'ko' ? `최근 추천: ${t(language, profile.diagnostic.recommendedLevel)} (${profile.diagnostic.score}/${profile.diagnostic.total})` : `Latest recommendation: ${t(language, profile.diagnostic.recommendedLevel)} (${profile.diagnostic.score}/${profile.diagnostic.total})`}</p>}</section>
    <section className="settings-card"><h2>{t(language, 'pizzaDifficulty')}</h2><p className="helper">{language === 'ko' ? '기본 학습 레벨을 사용하거나 피자 미션만 별도로 설정할 수 있어요.' : 'Use the main learning level or override only this mission.'}</p><div className="difficulty-grid level-grid"><button className={profile.unitDifficulties.pizza === undefined ? 'choice-chip selected' : 'choice-chip'} onClick={() => { const { pizza: _pizza, ...rest } = profile.unitDifficulties; onProfileChange({ ...profile, unitDifficulties: rest }) }}>{language === 'ko' ? '기본 레벨 사용' : 'Use main level'}</button>{mathLevels.map((level) => <button key={level} className={profile.unitDifficulties.pizza === level ? 'choice-chip selected' : 'choice-chip'} onClick={() => onProfileChange({ ...profile, unitDifficulties: { ...profile.unitDifficulties, pizza: level } })}>{t(language, level)}</button>)}</div></section>
    <section className="settings-card"><h2>{language === 'ko' ? '쇼핑 미션 레벨' : 'Shopping mission level'}</h2><p className="helper">{language === 'ko' ? '기본 학습 레벨을 사용하거나 쇼핑 미션만 별도로 설정할 수 있어요.' : 'Use the main learning level or override only Shopping Challenge.'}</p><div className="difficulty-grid level-grid"><button className={profile.unitDifficulties.shopping === undefined ? 'choice-chip selected' : 'choice-chip'} onClick={() => { const { shopping: _shopping, ...rest } = profile.unitDifficulties; onProfileChange({ ...profile, unitDifficulties: rest }) }}>{language === 'ko' ? '기본 레벨 사용' : 'Use main level'}</button>{mathLevels.map((level) => <button key={level} className={profile.unitDifficulties.shopping === level ? 'choice-chip selected' : 'choice-chip'} onClick={() => onProfileChange({ ...profile, unitDifficulties: { ...profile.unitDifficulties, shopping: level } })}>{t(language, level)}</button>)}</div></section>
    <section className="settings-card"><h2>{t(language, 'dataSettings')}</h2><p className="helper">{t(language, 'localNotice')}</p><div className="button-row"><button className="button secondary" onClick={exportData}>{t(language, 'export')}</button><button className="button secondary" onClick={() => inputRef.current?.click()}>{t(language, 'import')}</button></div><input ref={inputRef} hidden type="file" accept="application/json,.json" onChange={(event) => importData(event.target.files?.[0])} />{notice && <p className="notice" role="status">{notice}</p>}<p className="privacy-note">🔒 {t(language, 'privacyNotice')}</p></section>
    <button className="button ghost full" onClick={onSwitch}>{t(language, 'switchProfile')}</button>
    {diagnosticOpen && <MathDiagnostic profile={profile} onClose={() => setDiagnosticOpen(false)} onFinish={(score, recommendedLevel: MathLevel, apply) => { onProfileChange({ ...profile, ...(apply ? { mathLevel: recommendedLevel, difficulty: recommendedLevel } : {}), diagnostic: { completedAt: new Date().toISOString(), score, total: 10, recommendedLevel, applied: apply } }); setDiagnosticOpen(false) }} />}
  </div>
}
