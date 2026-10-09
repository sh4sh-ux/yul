import { useEffect, useRef, useState } from 'react'
import { fractionsEqual } from '../fractions'
import { t } from '../i18n'
import { buildPizzaQuestions, localise } from '../pizzaProblems'
import { saveAnswer, saveProgress } from '../storage'
import type { AnswerRecord, Profile } from '../types'
import { InteractivePizza } from './InteractivePizza'

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
  const [attempts, setAttempts] = useState<AnswerRecord[]>([])
  const [submitting, setSubmitting] = useState(false)
  const submissionLocked = useRef(false)
  const otherLanguage = language === 'ko' ? 'en' : 'ko'
  const question = questions[step]
  const currentFraction = { numerator: selected.size, denominator: question.denominator }
  const correct = fractionsEqual(currentFraction, question.target)

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
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
    setFeedback(null)
  }
  const check = async () => {
    if (submissionLocked.current || selected.size === 0) return
    submissionLocked.current = true
    setSubmitting(true)
    const record: AnswerRecord = {
      id: crypto.randomUUID(), profileId: profile.id, missionId: 'pizza', questionId: question.id, correct,
      hintsUsed: hintLevel, answeredAt: new Date().toISOString(), answer: `${selected.size}/${question.denominator}`,
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
      setStep(step + 1); setSelected(new Set()); setFeedback(null); setHintLevel(0); setTranslation(false); submissionLocked.current = false
      return
    }
    await saveProgress({ profileId: profile.id, missionId: 'pizza', completed: true, currentStep: 3, score: attempts.filter((item) => item.correct).length, total: attempts.length, updatedAt: new Date().toISOString() })
    onComplete(attempts, !wasCompleted)
  }
  const retry = () => { setFeedback(null); submissionLocked.current = false }

  return <div className="mission-shell learning-screen"><header className="mission-header"><button className="icon-button" onClick={onExit} aria-label={t(language, 'back')}>×</button><div className="step-track"><span style={{ width: `${(step + 1) / 3 * 100}%` }} /></div><strong>{step + 1}/3</strong></header>
    <main className="learning-main pizza-learning-main">
      <section className="question-panel"><div className="question-heading"><span className="stage-badge">{localise(question.stageName, language)}</span><span className="concept-chip">{localise(question.concept, language)}</span></div><h1>{localise(question.prompt, language)}</h1>{question.story && <p className="mission-story">{localise(question.story, language)}</p>}{question.equation && <div className="order-ticket"><span>🍕 {t(language, 'orderTicket')}</span><strong>{question.equation}</strong></div>}
        {translation && <div className="translation-card"><small>{otherLanguage === 'en' ? 'ENGLISH' : '한국어'}</small><p>{localise(question.prompt, otherLanguage)}</p>{question.story && <p>{localise(question.story, otherLanguage)}</p>}{hintLevel > 0 && <p>💡 {localise(question.hints[hintLevel - 1], otherLanguage)}</p>}</div>}
      </section>
      <section className="pizza-workspace">
        <div className="pizza-stage"><span className="workspace-label">{t(language, 'yourPizza')}</span><InteractivePizza denominator={question.denominator} selected={selected} onToggle={toggleSlice} disabled={feedback !== null || submitting} feedback={feedback} sliceLabel={t(language, 'slice')} />{feedback === 'correct' && <div className="success-stars" aria-hidden="true"><i>★</i><i>★</i><i>★</i></div>}</div>
        <aside className="fraction-panel" aria-live="polite"><span>{t(language, 'selected')}</span><div className="large-fraction"><b>{selected.size}</b><i /><b>{question.denominator}</b></div><div className="fraction-meaning"><span><b>{selected.size}</b>{t(language, 'numerator')}</span><span><b>{question.denominator}</b>{t(language, 'denominator')}</span></div><button className="clear-button" disabled={selected.size === 0 || feedback !== null} onClick={() => setSelected(new Set())}>{t(language, 'clearSelection')}</button></aside>
      </section>
      <div className="help-row"><button className="text-button" onClick={() => setHintLevel((level) => Math.min(2, level + 1))}>💡 {hintLevel === 0 ? t(language, 'hint') : t(language, 'nextHint')}</button><button className="text-button" onClick={() => setTranslation(!translation)}>🌐 {translation ? t(language, 'closeTranslation') : t(language, 'translationHelp')}</button></div>
      {hintLevel > 0 && <div className="hint-card"><span>{hintLevel}/2</span>{localise(question.hints[hintLevel - 1], language)}</div>}
    </main>
    <footer className={`answer-footer ${feedback ?? ''}`}>{feedback ? <div className="feedback-copy"><span>{feedback === 'correct' ? '✓' : '↻'}</span><div><strong>{feedback === 'correct' ? t(language, 'correct') : t(language, 'incorrect')}</strong><p>{feedback === 'correct' ? localise(question.explanation, language) : t(language, 'tryVisualHint')}</p></div></div> : <div className="footer-selection">{selected.size}/{question.denominator}</div>}{feedback === 'correct' ? <button className="button primary" onClick={advance}>{step === 2 ? t(language, 'completeMission') : t(language, 'next')} →</button> : feedback === 'incorrect' ? <button className="button primary" onClick={retry}>{t(language, 'retry')}</button> : <button className="button primary" disabled={selected.size === 0 || submitting} onClick={check}>{t(language, 'check')}</button>}</footer>
  </div>
}

export function MissionResult({ profile, attempts, xpEarned, onMap, onAgain }: { profile: Profile; attempts: AnswerRecord[]; xpEarned: number; onMap: () => void; onAgain: () => void }) {
  const language = profile.language
  const correct = attempts.filter((item) => item.correct).length
  const hints = attempts.reduce((sum, item) => sum + item.hintsUsed, 0)
  return <div className="mission-shell result-screen"><div className="confetti">★ <span>●</span> ★</div><div className="result-medal">🍕<i>✓</i></div><span className="eyebrow">MISSION COMPLETE</span><h1>{t(language, 'resultTitle')}</h1><p>{t(language, 'resultBody')}</p><div className="result-stats"><div><strong>{attempts.length ? Math.round(correct / attempts.length * 100) : 100}%</strong><small>{t(language, 'accuracy')}</small></div><div><strong>{hints}</strong><small>{t(language, 'hints')}</small></div><div><strong>+{xpEarned}</strong><small>{t(language, 'earned')}</small></div></div><button className="button primary full" onClick={onMap}>{t(language, 'finish')}</button><button className="button ghost full" onClick={onAgain}>{t(language, 'tryAgain')}</button></div>
}
