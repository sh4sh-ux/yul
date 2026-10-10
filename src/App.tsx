import { useCallback, useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { AppShell } from './components/AppShell'
import { ProfileEditor } from './components/ProfileEditor'
import { ProfilePicker } from './components/ProfilePicker'
import { HomeScreen, MapScreen, ProgressScreen, ReviewScreen, UnavailableCard } from './components/Screens'
import { SettingsScreen } from './components/SettingsScreen'
import { MissionIntro, MissionResult, PizzaMission } from './components/PizzaMission'
import { ShoppingIntro, ShoppingMission, ShoppingResult } from './components/ShoppingMission'
import { t } from './i18n'
import { completeMissionWithReward, getAnswers, getProgress, getSelectedProfile, initialiseProfiles, saveProfile, setSelectedProfile } from './storage'
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
  const [result, setResult] = useState<{ missionId: 'pizza' | 'shopping'; attempts: AnswerRecord[]; xpEarned: number } | null>(null)
  const selected = profiles.find((profile) => profile.id === selectedId) ?? null
  const pizzaProgress = progress.find((item) => item.missionId === 'pizza')
  const shoppingProgress = progress.find((item) => item.missionId === 'shopping')
  const shoppingRunActive = shoppingProgress?.missionState?.runActive ?? false

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
  const switchProfile = async () => { await setSelectedProfile(null); setSelectedId(null); setScreen('profiles'); setUnavailable(''); setResult(null) }
  const completePizzaMission = async (runAttempts: AnswerRecord[], isFirstCompletion: boolean) => {
    if (!selected) return
    if (isFirstCompletion) await updateSelected({ ...selected, xp: selected.xp + 30 })
    await refreshData(selected.id); setResult({ missionId: 'pizza', attempts: runAttempts, xpEarned: isFirstCompletion ? 30 : 0 })
  }
  const completeShoppingMission = async (runAttempts: AnswerRecord[]) => {
    if (!selected) return
    const completion = await completeMissionWithReward({
      profileId: selected.id, missionId: 'shopping', completed: true, currentStep: 3,
      score: runAttempts.filter((attempt) => attempt.correct).length, total: runAttempts.length,
      updatedAt: new Date().toISOString(),
      missionState: { cart: {}, hintLevel: 0, attemptIds: [], supportAttempt: false, runActive: false, paymentComplete: false },
    }, 40)
    setProfiles((items) => items.map((item) => item.id === completion.profile.id ? completion.profile : item))
    await refreshData(selected.id)
    setResult({ missionId: 'shopping', attempts: runAttempts, xpEarned: completion.xpEarned })
  }
  const restored = async () => {
    const restoredProfiles = await initialiseProfiles(); setProfiles(restoredProfiles)
    const restoredSelected = restoredProfiles.find((profile) => profile.id === selectedId)
    if (restoredSelected) await refreshData(restoredSelected.id)
  }

  if (loading) return <div className="loading"><img src={`${import.meta.env.BASE_URL}logo-placeholder.svg`} alt="YULI" /><span /></div>
  if (!selected) return <><ProfilePicker profiles={profiles} language={pickerLanguage} onLanguage={setPickerLanguage} onSelect={chooseProfile} onEdit={(profile) => { setEditor(profile); setEditorRequired(profile.year === null) }} />{editor && <ProfileEditor profile={editor} language={pickerLanguage} required={editorRequired} onSave={commitProfile} onCancel={() => setEditor(null)} />}</>
  if (result) return result.missionId === 'pizza'
    ? <MissionResult profile={selected} attempts={result.attempts} xpEarned={result.xpEarned} onMap={() => { setResult(null); setScreen('map') }} onAgain={() => { setResult(null); setScreen('mission') }} />
    : <ShoppingResult profile={selected} attempts={result.attempts} xpEarned={result.xpEarned} onMap={() => { setResult(null); setScreen('map') }} onAgain={() => { setResult(null); setScreen('shopping-mission') }} />
  if (screen === 'mission-intro') return <MissionIntro profile={selected} onBack={() => setScreen('map')} onBegin={() => setScreen('mission')} />
  if (screen === 'mission') return <PizzaMission profile={selected} history={answers} initialStep={pizzaProgress?.completed ? 0 : pizzaProgress?.currentStep ?? 0} initialScore={pizzaProgress?.score ?? 0} initialTotal={pizzaProgress?.total ?? 3} wasCompleted={pizzaProgress?.completed ?? false} onExit={() => setScreen('map')} onComplete={completePizzaMission} onDataChanged={() => refreshData(selected.id)} />
  if (screen === 'shopping-intro') return <ShoppingIntro profile={selected} onBack={() => setScreen('map')} onBegin={() => setScreen('shopping-mission')} />
  if (screen === 'shopping-mission') return <ShoppingMission profile={selected} history={answers} initialStep={shoppingProgress?.completed && !shoppingRunActive ? 0 : shoppingProgress?.currentStep ?? 0} initialScore={shoppingProgress?.score ?? 0} initialTotal={shoppingProgress?.total ?? 0} initialCart={shoppingProgress?.completed && !shoppingRunActive ? {} : shoppingProgress?.missionState?.cart} initialHintLevel={shoppingProgress?.completed && !shoppingRunActive ? 0 : shoppingProgress?.missionState?.hintLevel} initialAttemptIds={shoppingProgress?.completed && !shoppingRunActive ? [] : shoppingProgress?.missionState?.attemptIds} initialSupportAttempt={shoppingProgress?.completed && !shoppingRunActive ? false : shoppingProgress?.missionState?.supportAttempt} initialPaymentComplete={shoppingProgress?.completed && !shoppingRunActive ? false : shoppingProgress?.missionState?.paymentComplete} wasCompleted={shoppingProgress?.completed ?? false} onExit={() => setScreen('map')} onComplete={completeShoppingMission} onDataChanged={() => refreshData(selected.id)} />

  return <AppShell profile={selected} screen={screen} onNavigate={(next) => { setUnavailable(''); setScreen(next) }} onSettings={() => setScreen('settings')}>
    {screen === 'home' && <HomeScreen profile={selected} pizzaProgress={pizzaProgress} shoppingProgress={shoppingProgress} onMission={() => setScreen('mission-intro')} onShopping={() => setScreen('shopping-intro')} onMap={() => setScreen('map')} />}
    {screen === 'map' && (unavailable ? <UnavailableCard language={selected.language} title={unavailable} onBack={() => setUnavailable('')} /> : <MapScreen language={selected.language} pizzaCompleted={pizzaProgress?.completed ?? false} shoppingCompleted={shoppingProgress?.completed ?? false} onPizza={() => setScreen('mission-intro')} onShopping={() => setScreen('shopping-intro')} onUnavailable={setUnavailable} />)}
    {screen === 'review' && <ReviewScreen language={selected.language} answers={answers} />}
    {screen === 'progress' && <ProgressScreen profile={selected} answers={answers} progress={progress} />}
    {screen === 'settings' && <SettingsScreen profile={selected} onEdit={() => { setEditor(selected); setEditorRequired(false) }} onProfileChange={updateSelected} onSwitch={switchProfile} onRestored={restored} />}
    {editor && <ProfileEditor profile={editor} language={selected.language} onSave={commitProfile} onCancel={() => setEditor(null)} />}
    {(needRefresh || offlineReady) && <div className="pwa-toast" role="status"><span>{needRefresh ? t(selected.language, 'updateReady') : t(selected.language, 'offlineReady')}</span>{needRefresh ? <button onClick={() => updateServiceWorker(true)}>{t(selected.language, 'update')}</button> : <button onClick={() => setOfflineReady(false)}>×</button>}</div>}
  </AppShell>
}
