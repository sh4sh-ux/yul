import { useEffect, useRef, useState } from 'react'
import { mathLevels } from '../mathLevels'
import { createBackup, resetLearningRecords, restoreBackup, type LearningResetTarget } from '../storage'
import type { MathLevel, Profile } from '../types'
import { t } from '../i18n'
import { profileDisplayName } from '../profileNames'
import { MathDiagnostic } from './MathDiagnostic'

export function SettingsScreen({ profile, profiles, onEdit, onProfileChange, onSwitch, onRestored }: {
  profile: Profile; profiles: Profile[]; onEdit: () => void; onProfileChange: (profile: Profile) => void; onSwitch: () => void; onRestored: () => void | Promise<void>
}) {
  const language = profile.language
  const inputRef = useRef<HTMLInputElement>(null)
  const backgroundRef = useRef<HTMLDivElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const resetTriggerRef = useRef<HTMLButtonElement | null>(null)
  const resettingRef = useRef(false)
  const [notice, setNotice] = useState('')
  const [diagnosticOpen, setDiagnosticOpen] = useState(false)
  const [resetTarget, setResetTarget] = useState<LearningResetTarget | null>(null)
  const [resetting, setResetting] = useState(false)
  const [completedResetTarget, setCompletedResetTarget] = useState<LearningResetTarget | null>(null)
  useEffect(() => {
    if (!resetTarget) return
    const background = backgroundRef.current
    background?.setAttribute('inert', '')
    cancelRef.current?.focus()
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !resettingRef.current) {
        event.preventDefault()
        setResetTarget(null)
        return
      }
      if (event.key !== 'Tab') return
      const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? [])
      if (focusable.length === 0) { event.preventDefault(); return }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      background?.removeAttribute('inert')
      resetTriggerRef.current?.focus()
    }
  }, [resetTarget])
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
  const resetData = async () => {
    if (!resetTarget || resetting) return
    const target = resetTarget
    resettingRef.current = true
    setResetting(true)
    try {
      await resetLearningRecords(target)
    } catch {
      setNotice(language === 'ko' ? '초기화하지 못했어요. 기존 데이터는 유지됩니다.' : 'Reset failed. Your existing data was kept.')
      resettingRef.current = false
      setResetting(false)
      return
    }
    setCompletedResetTarget(target)
    setResetTarget(null)
    try {
      await onRestored()
      setNotice(language === 'ko' ? '학습 기록을 안전하게 초기화했어요.' : 'Learning records were reset safely.')
    } catch {
      setNotice(language === 'ko' ? '학습 기록은 삭제됐지만 화면을 갱신하지 못했어요. 앱을 새로고침해 주세요.' : 'Learning records were deleted, but the screen could not refresh. Please reload the app.')
    } finally { resettingRef.current = false; setResetting(false) }
  }
  const openReset = (target: LearningResetTarget, trigger: HTMLButtonElement) => {
    if (completedResetTarget === 'all' || completedResetTarget === target) return
    resetTriggerRef.current = trigger
    setResetTarget(target)
  }
  const profileName = (id: Profile['id']) => {
    const item = profiles.find((candidate) => candidate.id === id)
    return item ? profileDisplayName(item, language) : (id === 'gayul' ? (language === 'ko' ? '가율' : 'Helena') : (language === 'ko' ? '하율' : 'Luna'))
  }
  const resetName = resetTarget === 'all'
    ? (language === 'ko' ? '전체 학생' : 'all learners')
    : resetTarget ? profileName(resetTarget) : ''
  return <><div className="page" ref={backgroundRef} data-testid="settings-background"><header className="page-header"><span className="eyebrow">YULI</span><h1>{t(language, 'settings')}</h1></header>
    <section className="settings-card profile-setting"><span className="profile-avatar small">{profile.avatar}</span><div><strong>{profileDisplayName(profile, language)}</strong><small>Year {profile.year}</small></div><button className="text-button" onClick={onEdit}>{t(language, 'edit')}</button></section>
    <section className="settings-card"><h2>{t(language, 'language')}</h2><div className="segmented"><button className={language === 'ko' ? 'active' : ''} onClick={() => onProfileChange({ ...profile, language: 'ko' })}>한국어</button><button className={language === 'en' ? 'active' : ''} onClick={() => onProfileChange({ ...profile, language: 'en' })}>English</button></div></section>
    <section className="settings-card"><h2>{t(language, 'year')}</h2><select value={profile.year ?? ''} onChange={(event) => onProfileChange({ ...profile, year: Number(event.target.value) })}>{Array.from({ length: 8 }, (_, index) => <option key={index + 1} value={index + 1}>Year {index + 1}</option>)}</select></section>
    <section className="settings-card"><h2>{language === 'ko' ? '수학 학습 레벨' : 'Maths learning level'}</h2><p className="helper">{language === 'ko' ? `Year ${profile.year}와 독립적으로 관리됩니다. Level 5는 학교 필수 진도와 구분된 확장 학습입니다.` : `Managed independently from Year ${profile.year}. Level 5 is extension learning, separate from required school progress.`}</p><div className="difficulty-grid level-grid">{mathLevels.map((level) => <button key={level} className={profile.mathLevel === level ? 'choice-chip selected' : 'choice-chip'} onClick={() => onProfileChange({ ...profile, mathLevel: level, difficulty: level })}>{t(language, level)}</button>)}</div><label className="toggle-row"><input type="checkbox" checked={profile.adaptiveDifficulty} onChange={(event) => onProfileChange({ ...profile, adaptiveDifficulty: event.target.checked })} /><span>{language === 'ko' ? '충분한 학습 근거가 쌓이면 자동 조절' : 'Adjust automatically after enough evidence'}</span></label><button className="button secondary full" onClick={() => setDiagnosticOpen(true)}>{language === 'ko' ? '10문항 레벨 진단 시작' : 'Start 10-question level check'}</button>{profile.diagnostic && <p className="notice">{language === 'ko' ? `최근 추천: ${t(language, profile.diagnostic.recommendedLevel)} (${profile.diagnostic.score}/${profile.diagnostic.total})` : `Latest recommendation: ${t(language, profile.diagnostic.recommendedLevel)} (${profile.diagnostic.score}/${profile.diagnostic.total})`}</p>}</section>
    <section className="settings-card"><h2>{t(language, 'pizzaDifficulty')}</h2><p className="helper">{language === 'ko' ? '기본 학습 레벨을 사용하거나 피자 미션만 별도로 설정할 수 있어요.' : 'Use the main learning level or override only this mission.'}</p><div className="difficulty-grid level-grid"><button className={profile.unitDifficulties.pizza === undefined ? 'choice-chip selected' : 'choice-chip'} onClick={() => { const { pizza: _pizza, ...rest } = profile.unitDifficulties; onProfileChange({ ...profile, unitDifficulties: rest }) }}>{language === 'ko' ? '기본 레벨 사용' : 'Use main level'}</button>{mathLevels.map((level) => <button key={level} className={profile.unitDifficulties.pizza === level ? 'choice-chip selected' : 'choice-chip'} onClick={() => onProfileChange({ ...profile, unitDifficulties: { ...profile.unitDifficulties, pizza: level } })}>{t(language, level)}</button>)}</div></section>
    <section className="settings-card"><h2>{language === 'ko' ? '쇼핑 미션 레벨' : 'Shopping mission level'}</h2><p className="helper">{language === 'ko' ? '기본 학습 레벨을 사용하거나 쇼핑 미션만 별도로 설정할 수 있어요.' : 'Use the main learning level or override only Shopping Challenge.'}</p><div className="difficulty-grid level-grid"><button className={profile.unitDifficulties.shopping === undefined ? 'choice-chip selected' : 'choice-chip'} onClick={() => { const { shopping: _shopping, ...rest } = profile.unitDifficulties; onProfileChange({ ...profile, unitDifficulties: rest }) }}>{language === 'ko' ? '기본 레벨 사용' : 'Use main level'}</button>{mathLevels.map((level) => <button key={level} className={profile.unitDifficulties.shopping === level ? 'choice-chip selected' : 'choice-chip'} onClick={() => onProfileChange({ ...profile, unitDifficulties: { ...profile.unitDifficulties, shopping: level } })}>{t(language, level)}</button>)}</div></section>
    <section className="settings-card data-management"><h2>{t(language, 'dataSettings')}</h2><p className="helper">{t(language, 'localNotice')}</p><div className="button-row"><button className="button secondary" onClick={exportData}>{t(language, 'export')}</button><button className="button secondary" onClick={() => inputRef.current?.click()}>{t(language, 'import')}</button></div><input ref={inputRef} hidden type="file" accept="application/json,.json" onChange={(event) => importData(event.target.files?.[0])} />{notice && <p className="notice" role="status">{notice}</p>}<p className="privacy-note">🔒 {t(language, 'privacyNotice')}</p><div className="reset-zone"><h3>{language === 'ko' ? '학습 기록 초기화' : 'Reset learning records'}</h3><p>{language === 'ko' ? '먼저 JSON 백업을 내보내는 것을 권장해요. 이름, 아바타, Year, 언어와 수동 난이도 설정은 유지됩니다.' : 'We recommend exporting a JSON backup first. Names, avatar, Year, language and manual difficulty settings are kept.'}</p><div className="individual-reset-grid"><button className="button danger-outline" aria-disabled={completedResetTarget === 'all' || completedResetTarget === 'gayul'} onClick={(event) => openReset('gayul', event.currentTarget)}>{language === 'ko' ? `${profileName('gayul')} 기록 초기화` : `Reset ${profileName('gayul')} records`}</button><button className="button danger-outline" aria-disabled={completedResetTarget === 'all' || completedResetTarget === 'hayul'} onClick={(event) => openReset('hayul', event.currentTarget)}>{language === 'ko' ? `${profileName('hayul')} 기록 초기화` : `Reset ${profileName('hayul')} records`}</button></div><button className="button danger full" aria-disabled={completedResetTarget === 'all'} onClick={(event) => openReset('all', event.currentTarget)}>{language === 'ko' ? '전체 학습 기록 초기화' : 'Reset all learning records'}</button></div></section>
    <button className="button ghost full" onClick={onSwitch}>{t(language, 'switchProfile')}</button>
    {diagnosticOpen && <MathDiagnostic profile={profile} onClose={() => setDiagnosticOpen(false)} onFinish={(score, recommendedLevel: MathLevel, apply) => { onProfileChange({ ...profile, ...(apply ? { mathLevel: recommendedLevel, difficulty: recommendedLevel } : {}), diagnostic: { completedAt: new Date().toISOString(), score, total: 10, recommendedLevel, applied: apply } }); setDiagnosticOpen(false) }} />}
  </div>{resetTarget && <div ref={dialogRef} className="overlay" role="dialog" aria-modal="true" aria-labelledby="reset-title"><section className="sheet reset-confirmation"><div className="sheet-handle" /><span className="warning-icon" aria-hidden="true">!</span><h2 id="reset-title">{language === 'ko' ? `${resetName} 학습 기록을 초기화할까요?` : `Reset learning records for ${resetName}?`}</h2><p>{language === 'ko' ? '다음 데이터는 삭제 후 복구할 수 없습니다.' : 'The following data cannot be recovered after deletion.'}</p><ul><li>{language === 'ko' ? 'XP와 획득 보상' : 'XP and earned rewards'}</li><li>{language === 'ko' ? '미션 완료·진행 상태와 장바구니' : 'Mission completion, progress and trolley state'}</li><li>{language === 'ko' ? '정답·오답·힌트·복습 기록' : 'Answers, hints and review records'}</li><li>{language === 'ko' ? '진단 결과와 자동 난이도 학습 이력' : 'Diagnostic results and adaptive-level evidence'}</li></ul>{resetTarget !== 'all' && <p className="preserved-note">{language === 'ko' ? `${resetTarget === 'gayul' ? profileName('hayul') : profileName('gayul')}의 데이터는 삭제하지 않습니다.` : `${resetTarget === 'gayul' ? profileName('hayul') : profileName('gayul')}'s data will not be deleted.`}</p>}<button className="button secondary full" onClick={exportData}>{language === 'ko' ? '먼저 JSON 백업 내보내기' : 'Export a JSON backup first'}</button><div className="sheet-actions"><button ref={cancelRef} className="button ghost" disabled={resetting} onClick={() => setResetTarget(null)}>{language === 'ko' ? '취소' : 'Cancel'}</button><button className="button danger" disabled={resetting} onClick={resetData}>{resetting ? (language === 'ko' ? '초기화 중…' : 'Resetting…') : (language === 'ko' ? '최종 확인 및 초기화' : 'Confirm and reset')}</button></div></section></div>}</>
}
