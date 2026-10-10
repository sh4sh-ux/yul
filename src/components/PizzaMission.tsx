import { useEffect, useRef, useState } from 'react'
import { fractionsEqual } from '../fractions'
import { t } from '../i18n'
import { levelRank } from '../mathLevels'
import { buildPizzaQuestions, localise } from '../pizzaProblems'
import { saveAnswer, saveProgress } from '../storage'
import type { AnswerRecord, Profile } from '../types'
import { InteractivePizza } from './InteractivePizza'

const normaliseWorkingAnswer = (value: string) => value.trim().replace(/\s+/g, '').replace(',', '.')

export function isWorkingAnswerCorrect(value: string, acceptedAnswers: string[]): boolean {
  const normalised = normaliseWorkingAnswer(value)
  return acceptedAnswers.some((answer) => normaliseWorkingAnswer(answer) === normalised)
}

export function MissionIntro({ profile, onBack, onBegin }: { profile: Profile; onBack: () => void; onBegin: () => void }) {
  const language = profile.language
  return <div className="mission-shell intro-screen"><button className="back-button" onClick={onBack}>← {t(language, 'back')}</button><div className="intro-art"><span>🍕</span><i>★</i><i>★</i></div><div className="intro-copy"><span className="eyebrow">{t(language, 'introEyebrow')}</span><h1>{t(language, 'introTitle')}</h1><p>{t(language, 'introBody')}</p><div className="mission-meta"><span>◷ {t(language, 'minutes')}</span><span>★ {t(language, 'reward')}</span></div><button className="button primary full" onClick={onBegin}>{t(language, 'begin')} →</button></div></div>
}

export function PizzaMission({ profile, history, initialStep, initialScore, initialTotal, wasCompleted, onExit, onComplete, onDataChanged }: {
  profile: Profile; history: AnswerRecord[]; initialStep: number; initialScore: number; initialTotal: number; wasCompleted: boolean; onExit: () => void; onComplete: (attempts: AnswerRecord[], isFirstCompletion: boolean) => void; onDataChanged: () => void
}) {
  const language = profile.language
  const [questions] = useState(() => buildPizzaQuestions(profile, history))
  const [step, setStep] = useState(Math.min(initialStep, 2))
  const [selected, setSelected] = useState<Set<number>>(() => new Set())
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null)
  const [hintLevel, setHintLevel] = useState(0)
  const [translation, setTranslation] = useState(false)
  const [usingSupport, setUsingSupport] = useState(false)
  const [attempts, setAttempts] = useState<AnswerRecord[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [workingStep, setWorkingStep] = useState(0)
  const [workingInput, setWorkingInput] = useState('')
  const [workingError, setWorkingError] = useState(false)
  const submissionLocked = useRef(false)
  const otherLanguage = language === 'ko' ? 'en' : 'ko'
  const baseQuestion = questions[step]
  const question = usingSupport ? { ...baseQuestion, ...baseQuestion.support } : baseQuestion
  const currentFraction = { numerator: selected.size, denominator: question.denominator }
  const correct = fractionsEqual(currentFraction, question.target)
  const workingSteps = !usingSupport ? baseQuestion.workingSteps ?? [] : []
  const workingComplete = workingStep >= workingSteps.length

  useEffect(() => {
    void saveProgress({
      profileId: profile.id,
      missionId: 'pizza',
      completed: wasCompleted,
      currentStep: step,
      score: wasCompleted ? initialScore : 0,
      total: wasCompleted ? initialTotal : 3,
      updatedAt: new Date().toISOString(),
    })
  }, [profile.id, step, wasCompleted, initialScore, initialTotal])

  const toggleSlice = (index: number) => {
    if (!workingComplete) return
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
    setFeedback(null)
  }
  const checkWorkingStep = () => {
    const current = workingSteps[workingStep]
    if (!current || !workingInput.trim()) return
    if (!isWorkingAnswerCorrect(workingInput, current.acceptedAnswers)) {
      setWorkingError(true)
      return
    }
    setWorkingStep((value) => value + 1)
    setWorkingInput('')
    setWorkingError(false)
  }
  const check = async () => {
    if (submissionLocked.current || selected.size === 0) return
    submissionLocked.current = true
    setSubmitting(true)
    const record: AnswerRecord = {
      id: crypto.randomUUID(), profileId: profile.id, missionId: 'pizza', questionId: question.id, correct,
      hintsUsed: hintLevel, answeredAt: new Date().toISOString(), answer: `${selected.size}/${question.denominator}`,
      objectiveId: baseQuestion.objectiveId, supportAttempt: usingSupport,
    }
    try {
      await saveAnswer(record)
      setAttempts((items) => [...items, record])
      setFeedback(correct ? 'correct' : 'incorrect')
      onDataChanged()
    } catch (error) {
      submissionLocked.current = false
      throw error
    } finally {
      setSubmitting(false)
    }
  }
  const advance = async () => {
    if (step < 2) {
      setStep(step + 1); setSelected(new Set()); setFeedback(null); setHintLevel(0); setTranslation(false); setUsingSupport(false); setWorkingStep(0); setWorkingInput(''); setWorkingError(false); submissionLocked.current = false
      return
    }
    await saveProgress({ profileId: profile.id, missionId: 'pizza', completed: true, currentStep: 3, score: attempts.filter((item) => item.correct).length, total: attempts.length, updatedAt: new Date().toISOString() })
    onComplete(attempts, !wasCompleted)
  }
  const retry = () => {
    if (!usingSupport) {
      setUsingSupport(true)
      setHintLevel(1)
    }
    setSelected(new Set())
    setFeedback(null)
    setWorkingStep(0)
    setWorkingInput('')
    setWorkingError(false)
    submissionLocked.current = false
  }

  return <div className="mission-shell learning-screen"><header className="mission-header"><button className="icon-button" onClick={onExit} aria-label={t(language, 'back')}>×</button><div className="step-track"><span style={{ width: `${(step + 1) / 3 * 100}%` }} /></div><strong>{step + 1}/3</strong></header>
    <main className="learning-main pizza-learning-main">
      <section className="question-panel"><div className="question-heading"><span className="stage-badge">{localise(question.stageName, language)}</span><span className="concept-chip">{localise(question.concept, language)}</span><span className="level-chip">L{levelRank(baseQuestion.level)} · {baseQuestion.level}{baseQuestion.curriculumBand === 'extension' ? ` · ${language === 'ko' ? '확장' : 'extension'}` : ''}</span></div>{usingSupport && <p className="support-label">{language === 'ko' ? '같은 생각을 다른 문제로 연습해요' : 'Try the same idea in a different problem'}</p>}<h1>{localise(question.prompt, language)}</h1>{question.story && <p className="mission-story">{localise(question.story, language)}</p>}{question.equation && <div className="order-ticket"><span>🍕 {t(language, 'orderTicket')}</span><strong>{question.equation}</strong></div>}
        {translation && <div className="translation-card"><small>{otherLanguage === 'en' ? 'ENGLISH' : '한국어'}</small><p>{localise(question.prompt, otherLanguage)}</p>{question.story && <p>{localise(question.story, otherLanguage)}</p>}{hintLevel > 0 && <p>💡 {localise(question.hints[hintLevel - 1], otherLanguage)}</p>}</div>}
      </section>
      {workingSteps.length > 0 && <section className="master-working" aria-label={language === 'ko' ? 'Master 단계별 풀이' : 'Master step-by-step working'}>
        <header><span>{language === 'ko' ? '1 · 통분·변환' : '1 · Rename or convert'}</span><span>{language === 'ko' ? '2 · 계산' : '2 · Calculate'}</span><span>{language === 'ko' ? '3 · 피자 시각화' : '3 · Visualise'}</span></header>
        <div className="working-history">{workingSteps.slice(0, workingStep).map((item, index) => <p key={index}><b>✓</b> {localise(item.explanation, language)}</p>)}</div>
        {!workingComplete && <form onSubmit={(event) => { event.preventDefault(); checkWorkingStep() }}>
          <label htmlFor="master-working-answer">{localise(workingSteps[workingStep].prompt, language)}</label>
          <div><input id="master-working-answer" value={workingInput} onChange={(event) => { setWorkingInput(event.target.value); setWorkingError(false) }} inputMode="text" autoComplete="off" aria-invalid={workingError} /><button className="button secondary" type="submit" disabled={!workingInput.trim()}>{language === 'ko' ? '이 단계 확인' : 'Check this step'}</button></div>
          {workingError && <p className="working-error" role="alert">{language === 'ko' ? '좋은 시도예요. 계산 과정을 한 번 더 확인해 보세요.' : 'Good try. Check the calculation one more time.'}</p>}
        </form>}
        {workingComplete && <p className="working-ready"><b>✓</b> {language === 'ko' ? '계산을 확인했어요. 이제 피자 조각으로 나타내세요.' : 'Working checked. Now show the result with pizza slices.'}</p>}
      </section>}
      <section className="pizza-workspace">
        <div className="pizza-stage"><span className="workspace-label">{workingSteps.length > 0 ? (language === 'ko' ? '3 · 피자 시각화' : '3 · Pizza visualisation') : t(language, 'yourPizza')}</span><InteractivePizza denominator={question.denominator} selected={selected} onToggle={toggleSlice} disabled={!workingComplete || feedback !== null || submitting} feedback={feedback} sliceLabel={t(language, 'slice')} />{feedback === 'correct' && <div className="success-stars" aria-hidden="true"><i>★</i><i>★</i><i>★</i></div>}</div>
        <aside className="fraction-panel" aria-live="polite"><span>{t(language, 'selected')}</span><div className="large-fraction"><b>{selected.size}</b><i /><b>{question.denominator}</b></div><div className="fraction-meaning"><span><b>{selected.size}</b>{t(language, 'numerator')}</span><span><b>{question.denominator}</b>{t(language, 'denominator')}</span></div><button className="clear-button" disabled={selected.size === 0 || feedback !== null} onClick={() => setSelected(new Set())}>{t(language, 'clearSelection')}</button></aside>
      </section>
      <div className="help-row"><button className="text-button" onClick={() => setHintLevel((level) => Math.min(2, level + 1))}>💡 {hintLevel === 0 ? t(language, 'hint') : t(language, 'nextHint')}</button><button className="text-button" onClick={() => setTranslation(!translation)}>🌐 {translation ? t(language, 'closeTranslation') : t(language, 'translationHelp')}</button></div>
      {hintLevel > 0 && <div className="hint-card"><span>{hintLevel}/2</span>{localise(question.hints[hintLevel - 1], language)}</div>}
    </main>
    <footer className={`answer-footer ${feedback ?? ''}`}>{feedback ? <div className="feedback-copy"><span>{feedback === 'correct' ? '✓' : '↻'}</span><div><strong>{feedback === 'correct' ? t(language, 'correct') : t(language, 'incorrect')}</strong><p>{feedback === 'correct' ? localise(question.explanation, language) : localise(question.alternateExplanation, language)}</p></div></div> : <div className="footer-selection">{workingComplete ? `${selected.size}/${question.denominator}` : (language === 'ko' ? '단계별 풀이를 먼저 확인하세요' : 'Check each working step first')}</div>}{feedback === 'correct' ? <button className="button primary" onClick={advance}>{step === 2 ? t(language, 'completeMission') : t(language, 'next')} →</button> : feedback === 'incorrect' ? <button className="button primary" onClick={retry}>{usingSupport ? t(language, 'retry') : (language === 'ko' ? '유사 문제로 연습' : 'Try a similar problem')}</button> : <button className="button primary" disabled={!workingComplete || selected.size === 0 || submitting} onClick={check}>{t(language, 'check')}</button>}</footer>
  </div>
}

export function MissionResult({ profile, attempts, xpEarned, onMap, onAgain }: { profile: Profile; attempts: AnswerRecord[]; xpEarned: number; onMap: () => void; onAgain: () => void }) {
  const language = profile.language
  const correct = attempts.filter((item) => item.correct).length
  const hints = attempts.reduce((sum, item) => sum + item.hintsUsed, 0)
  return <div className="mission-shell result-screen"><div className="confetti">★ <span>●</span> ★</div><div className="result-medal">🍕<i>✓</i></div><span className="eyebrow">MISSION COMPLETE</span><h1>{t(language, 'resultTitle')}</h1><p>{t(language, 'resultBody')}</p><div className="result-stats"><div><strong>{attempts.length ? Math.round(correct / attempts.length * 100) : 100}%</strong><small>{t(language, 'accuracy')}</small></div><div><strong>{hints}</strong><small>{t(language, 'hints')}</small></div><div><strong>+{xpEarned}</strong><small>{t(language, 'earned')}</small></div></div><button className="button primary full" onClick={onMap}>{t(language, 'finish')}</button><button className="button ghost full" onClick={onAgain}>{t(language, 'tryAgain')}</button></div>
}
