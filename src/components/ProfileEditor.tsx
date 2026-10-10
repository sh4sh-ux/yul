import { useState } from 'react'
import { mathLevels } from '../mathLevels'
import type { Language, Profile } from '../types'
import { t } from '../i18n'
import { migrateProfileNames, profileNames } from '../profileNames'

const avatars = ['🌿', '🚀', '🐬', '🦊', '🌈', '⭐']

export function ProfileEditor({ profile, language, required, onSave, onCancel }: {
  profile: Profile; language: Language; required?: boolean; onSave: (profile: Profile) => void; onCancel: () => void
}) {
  const [draft, setDraft] = useState(() => migrateProfileNames(profile))
  const names = draft.names ?? profileNames(draft)
  const trimmedNames = { ko: names.ko.trim(), en: names.en.trim() }
  const valid = trimmedNames.ko.length > 0 && trimmedNames.en.length > 0 && draft.year !== null
  return <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="profile-title">
    <form className="sheet profile-editor" onSubmit={(event) => { event.preventDefault(); if (valid) onSave({ ...draft, name: trimmedNames.ko, names: trimmedNames }) }}>
      <div className="sheet-handle" />
      <div className="section-heading"><div><span className="eyebrow">YULI</span><h2 id="profile-title">{t(language, 'profileSetup')}</h2></div>{!required && <button type="button" className="icon-button" onClick={onCancel} aria-label={t(language, 'cancel')}>×</button>}</div>
      <label>{t(language, 'nameKo')}<input value={names.ko} maxLength={16} onChange={(event) => setDraft({ ...draft, name: event.target.value, names: { ...names, ko: event.target.value } })} /></label>
      <label>{t(language, 'nameEn')}<input value={names.en} maxLength={16} onChange={(event) => setDraft({ ...draft, names: { ...names, en: event.target.value } })} /></label>
      <fieldset><legend>{t(language, 'avatar')}</legend><div className="avatar-grid">{avatars.map((avatar) => <button type="button" key={avatar} className={draft.avatar === avatar ? 'avatar-option selected' : 'avatar-option'} onClick={() => setDraft({ ...draft, avatar })} aria-label={avatar}>{avatar}</button>)}</div></fieldset>
      <label>{t(language, 'year')}<select value={draft.year ?? ''} onChange={(event) => setDraft({ ...draft, year: Number(event.target.value) || null })}><option value="">{t(language, 'chooseYear')}</option>{Array.from({ length: 8 }, (_, index) => <option key={index + 1} value={index + 1}>Year {index + 1}</option>)}</select></label>
      <fieldset><legend>{t(language, 'language')}</legend><div className="segmented"><button type="button" className={draft.language === 'ko' ? 'active' : ''} onClick={() => setDraft({ ...draft, language: 'ko' })}>한국어</button><button type="button" className={draft.language === 'en' ? 'active' : ''} onClick={() => setDraft({ ...draft, language: 'en' })}>English</button></div></fieldset>
      <fieldset><legend>{language === 'ko' ? '수학 학습 레벨 (학년과 별도)' : 'Maths learning level (separate from year)'}</legend><div className="difficulty-grid level-grid">{mathLevels.map((level) => <button type="button" key={level} className={draft.mathLevel === level ? 'choice-chip selected' : 'choice-chip'} onClick={() => setDraft({ ...draft, mathLevel: level, difficulty: level })}>{t(language, level)}</button>)}</div></fieldset>
      <p className="helper">{t(language, 'profileHint')}</p>
      <div className="sheet-actions">{!required && <button type="button" className="button secondary" onClick={onCancel}>{t(language, 'cancel')}</button>}<button className="button primary" disabled={!valid}>{t(language, 'save')}</button></div>
    </form>
  </div>
}
