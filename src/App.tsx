import { useCallback, useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { AppShell } from './components/AppShell'
import { ProfileEditor } from './components/ProfileEditor'
import { ProfilePicker } from './components/ProfilePicker'
import { HomeScreen, MapScreen, ProgressScreen, ReviewScreen, UnavailableCard } from './components/Screens'
import { SettingsScreen } from './components/SettingsScreen'
import { MissionIntro, MissionResult, PizzaMission } from './components/PizzaMission'
import { t } from './i18n'
import { getAnswers, getProgress, getSelectedProfile, initialiseProfiles, saveProfile, setSelectedProfile } from './storage'
import type { AnswerRecord, Language, MissionProgressWithProfile, Profile, Screen } from './types'

export default function App() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [pickerLanguage, setPickerLanguage] = useState<Language>('ko')
  const [screen, setScreen] = useState<Screen>('profiles')
  const [editor, setEditor] = useState<Profile | null>(null)
  const [editorRequired, setEditorRequired] = useState(false)
  const [answers, setAnswers] = useState<AnswerRecord[]>([])
  const [progress, setProgress] = useState<MissionProgressWithProfile[]>([])
  const [unavailable, setUnavailable] = useState('')
  const [loading, setLoading] = useState(true)
  const [resultAttempts, setResultAttempts] = useState<AnswerRecord[] | null>(null)
  const selected = profiles.find((profile) => profile.id === selectedId) ?? null
  const pizzaProgress = progress.find((item) => item.missionId === 'pizza')

  const { needRefresh: [needRefresh, setNeedRefresh], offlineReady: [offlineReady, setOfflineReady], updateServiceWorker } = useRegisterSW()

  const refreshData = useCallback(async (profileId: string) => {
    const [nextAnswers, nextProgress] = await Promise.all([getAnswers(profileId), getProgress(profileId)])
    setAnswers(nextAnswers); setProgress(nextProgress)
  }, [])

  useEffect(() => { void (async () => {
    const [storedProfiles, storedSelected] = await Promise.all([initialiseProfiles(), getSelectedProfile()])
    setProfiles(storedProfiles)
    if (storedSelected && storedProfiles.some((profile) => profile.id === storedSelected)) {
      setSelectedId(storedSelected); setPickerLanguage(storedProfiles.find((profile) => profile.id === storedSelected)?.language ?? 'ko'); setScreen('home'); await refreshData(storedSelected)
    }
    setLoading(false)
  })() }, [refreshData])

  useEffect(() => {
    document.documentElement.lang = (selected?.language ?? pickerLanguage) === 'en' ? 'en-NZ' : 'ko'
  }, [selected?.language, pickerLanguage])

  const chooseProfile = async (profile: Profile) => {
    setPickerLanguage(profile.language)
    if (profile.year === null) { setEditor(profile); setEditorRequired(true); return }
    setSelectedId(profile.id); await setSelectedProfile(profile.id); await refreshData(profile.id); setScreen('home')
  }
  const commitProfile = async (profile: Profile) => {
    await saveProfile(profile)
    const next = profiles.map((item) => item.id === profile.id ? { ...profile, updatedAt: new Date().toISOString() } : item)
    setProfiles(next); setEditor(null); setEditorRequired(false); setPickerLanguage(profile.language)
    if (selectedId === profile.id || profile.year !== null) { setSelectedId(profile.id); await setSelectedProfile(profile.id); await refreshData(profile.id); setScreen('home') }
  }
  const updateSelected = async (profile: Profile) => { await saveProfile(profile); setProfiles((items) => items.map((item) => item.id === profile.id ? profile : item)) }
  const switchProfile = async () => { await setSelectedProfile(null); setSelectedId(null); setScreen('profiles'); setUnavailable(''); setResultAttempts(null) }
  const completeMission = async (runAttempts: AnswerRecord[]) => {
    if (!selected) return
    if (!pizzaProgress?.completed) await updateSelected({ ...selected, xp: selected.xp + 30 })
    await refreshData(selected.id); setResultAttempts(runAttempts)
  }
  const restored = async () => {
    const restoredProfiles = await initialiseProfiles(); setProfiles(restoredProfiles)
    const restoredSelected = restoredProfiles.find((profile) => profile.id === selectedId)
    if (restoredSelected) await refreshData(restoredSelected.id)
  }

  if (loading) return <div className="loading"><img src={`${import.meta.env.BASE_URL}logo-placeholder.svg`} alt="YULI" /><span /></div>
  if (!selected) return <><ProfilePicker profiles={profiles} language={pickerLanguage} onLanguage={setPickerLanguage} onSelect={chooseProfile} onEdit={(profile) => { setEditor(profile); setEditorRequired(profile.year === null) }} />{editor && <ProfileEditor profile={editor} language={pickerLanguage} required={editorRequired} onSave={commitProfile} onCancel={() => setEditor(null)} />}</>
  if (resultAttempts) return <MissionResult profile={selected} attempts={resultAttempts} onMap={() => { setResultAttempts(null); setScreen('map') }} onAgain={() => { setResultAttempts(null); setScreen('mission') }} />
  if (screen === 'mission-intro') return <MissionIntro profile={selected} onBack={() => setScreen('map')} onBegin={() => setScreen('mission')} />
  if (screen === 'mission') return <PizzaMission profile={selected} history={answers} initialStep={pizzaProgress?.completed ? 0 : pizzaProgress?.currentStep ?? 0} wasCompleted={pizzaProgress?.completed ?? false} onExit={() => setScreen('map')} onComplete={completeMission} onDataChanged={() => refreshData(selected.id)} />

  return <AppShell profile={selected} screen={screen} onNavigate={(next) => { setUnavailable(''); setScreen(next) }} onSettings={() => setScreen('settings')}>
    {screen === 'home' && <HomeScreen profile={selected} pizzaProgress={pizzaProgress} onMission={() => setScreen('mission-intro')} onMap={() => setScreen('map')} />}
    {screen === 'map' && (unavailable ? <UnavailableCard language={selected.language} title={unavailable} onBack={() => setUnavailable('')} /> : <MapScreen language={selected.language} pizzaCompleted={pizzaProgress?.completed ?? false} onPizza={() => setScreen('mission-intro')} onUnavailable={setUnavailable} />)}
    {screen === 'review' && <ReviewScreen language={selected.language} answers={answers} />}
    {screen === 'progress' && <ProgressScreen profile={selected} answers={answers} progress={progress} />}
    {screen === 'settings' && <SettingsScreen profile={selected} onEdit={() => { setEditor(selected); setEditorRequired(false) }} onProfileChange={updateSelected} onSwitch={switchProfile} onRestored={restored} />}
    {editor && <ProfileEditor profile={editor} language={selected.language} onSave={commitProfile} onCancel={() => setEditor(null)} />}
    {(needRefresh || offlineReady) && <div className="pwa-toast" role="status"><span>{needRefresh ? t(selected.language, 'updateReady') : t(selected.language, 'offlineReady')}</span>{needRefresh ? <button onClick={() => updateServiceWorker(true)}>{t(selected.language, 'update')}</button> : <button onClick={() => setOfflineReady(false)}>×</button>}</div>}
  </AppShell>
}
