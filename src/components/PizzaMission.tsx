import { useEffect, useMemo, useState } from 'react'
import { fractionsEqual, parseFraction, suggestedDifficulty } from '../fractions'
import { t } from '../i18n'
import { saveAnswer, saveProgress } from '../storage'
import type { AnswerRecord, MissionProgressWithProfile, Profile } from '../types'

export function MissionIntro({ profile, onBack, onBegin }: { profile: Profile; onBack: () => void; onBegin: () => void }) {
  const language = profile.language
  return <div className="mission-shell intro-screen"><button className="back-button" onClick={onBack}>← {t(language, 'back')}</button><div className="intro-art"><span>🍕</span><i>★</i><i>★</i></div><div className="intro-copy"><span className="eyebrow">{t(language, 'introEyebrow')}</span><h1>{t(language, 'introTitle')}</h1><p>{t(language, 'introBody')}</p><div className="mission-meta"><span>◷ {t(language, 'minutes')}</span><span>★ {t(language, 'reward')}</span></div><button className="button primary full" onClick={onBegin}>{t(language, 'begin')} →</button></div></div>
}

const choices = ['1/4', '2/4', '3/4', '1']

export function PizzaMission({ profile, history, initialStep, initialScore, initialTotal, wasCompleted, onExit, onComplete, onDataChanged }: {
  profile: Profile; history: AnswerRecord[]; initialStep: number; initialScore: number; initialTotal: number; wasCompleted: boolean; onExit: () => void; onComplete: (attempts: AnswerRecord[], isFirstCompletion: boolean) => void; onDataChanged: () => void
}) {
  const language = profile.language
  const [step, setStep] = useState(Math.min(initialStep, 2))
  const [slices, setSlices] = useState<boolean[]>([false, false, false, false])
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null)
  const [hintOpen, setHintOpen] = useState(false)
  const [translation, setTranslation] = useState(false)
  const [attempts, setAttempts] = useState<AnswerRecord[]>([])
  const otherLanguage = language === 'ko' ? 'en' : 'ko'
  const configuredDifficulty = profile.unitDifficulties.pizza ?? profile.difficulty
  const effectiveDifficulty = configuredDifficulty === 'auto' ? suggestedDifficulty(history.filter((item) => item.missionId === 'pizza')) : configuredDifficulty
  const questionKey = step === 0 ? 'slicesPrompt' : step === 1 ? 'question2' : effectiveDifficulty === 'easy' ? 'question3Easy' : effectiveDifficulty === 'challenge' ? 'question3Challenge' : 'question3'
  const questionId = step === 0
    ? 'slices'
    : step === 1
      ? 'same-denominator'
      : effectiveDifficulty === 'easy'
        ? 'same-denominator-easy'
        : effectiveDifficulty === 'challenge'
          ? 'unlike-denominator-challenge'
          : 'unlike-denominator-medium'
  const selectedCount = slices.filter(Boolean).length
  const currentAnswer = step === 0 ? `${selectedCount}/4` : answer
  const explanationKey = effectiveDifficulty === 'easy' ? 'explanation3Easy' : effectiveDifficulty === 'challenge' ? 'explanation3Challenge' : 'explanation3'
  const explanation = step === 1 ? t(language, 'explanation2') : step === 2 ? t(language, explanationKey) : t(language, 'hintText')
  const missionChoices = effectiveDifficulty === 'challenge' && step === 2 ? ['3/4', '4/6', '5/6', '1'] : choices
  const correct = useMemo(() => {
    if (step === 0) return selectedCount === 3
    const fraction = parseFraction(answer)
    const target = effectiveDifficulty === 'challenge' && step === 2 ? { numerator: 5, denominator: 6 } : { numerator: 3, denominator: 4 }
    return fraction ? fractionsEqual(fraction, target) : false
  }, [step, selectedCount, answer, effectiveDifficulty])

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

  const check = async () => {
    const record: AnswerRecord = { id: crypto.randomUUID(), profileId: profile.id, missionId: 'pizza', questionId, correct, hintsUsed: hintOpen ? 1 : 0, answeredAt: new Date().toISOString(), answer: currentAnswer }
    await saveAnswer(record); setAttempts((items) => [...items, record]); setFeedback(correct ? 'correct' : 'incorrect'); onDataChanged()
  }
  const advance = async () => {
    if (step < 2) { setStep(step + 1); setAnswer(''); setFeedback(null); setHintOpen(false); setTranslation(false); return }
    await saveProgress({ profileId: profile.id, missionId: 'pizza', completed: true, currentStep: 3, score: attempts.filter((item) => item.correct).length, total: attempts.length, updatedAt: new Date().toISOString() })
    onComplete(attempts, !wasCompleted)
  }
  const retry = () => { setFeedback(null); if (step === 0) setSlices([false, false, false, false]); else setAnswer('') }

  return <div className="mission-shell learning-screen"><header className="mission-header"><button className="icon-button" onClick={onExit} aria-label={t(language, 'back')}>×</button><div className="step-track"><span style={{ width: `${(step + 1) / 3 * 100}%` }} /></div><strong>{step + 1}/3</strong></header>
    <main className="learning-main"><span className="eyebrow">{t(language, 'pizzaTitle')}</span><h1>{t(language, questionKey)}</h1>{translation && <div className="translation-card"><small>{language === 'ko' ? 'ENGLISH' : '한국어'}</small><p>{t(otherLanguage, questionKey)}</p></div>}
      {step === 0 ? <div className="pizza-board"><div className="pizza-grid" aria-label={t(language, 'slicesPrompt')}>{slices.map((selected, index) => <button key={index} aria-label={`${index + 1}`} aria-pressed={selected} className={selected ? 'pizza-slice selected' : 'pizza-slice'} onClick={() => { const next = [...slices]; next[index] = !next[index]; setSlices(next); setFeedback(null) }}><span>{selected ? '🫑' : ''}</span></button>)}</div><div className="fraction-readout"><span>{t(language, 'selected')}</span><strong><b>{selectedCount}</b><i /><b>4</b></strong></div></div> : <div className="answer-choices">{missionChoices.map((choice) => <button key={choice} className={answer === choice ? 'answer-choice selected' : 'answer-choice'} onClick={() => { setAnswer(choice); setFeedback(null) }}>{choice}</button>)}</div>}
      <div className="help-row"><button className="text-button" onClick={() => setHintOpen(!hintOpen)}>💡 {t(language, 'hint')}</button><button className="text-button" onClick={() => setTranslation(!translation)}>🌐 {translation ? t(language, 'closeTranslation') : t(language, 'translationHelp')}</button></div>
      {hintOpen && <div className="hint-card">{step === 0 ? t(language, 'hintText') : explanation}</div>}
    </main>
    <footer className={`answer-footer ${feedback ?? ''}`}>{feedback ? <div className="feedback-copy"><span>{feedback === 'correct' ? '✓' : '↻'}</span><div><strong>{feedback === 'correct' ? t(language, 'correct') : t(language, 'incorrect')}</strong><p>{feedback === 'correct' ? explanation : (hintOpen ? explanation : t(language, 'hint'))}</p></div></div> : <span />}{feedback === 'correct' ? <button className="button primary" onClick={advance}>{t(language, 'next')} →</button> : feedback === 'incorrect' ? <button className="button primary" onClick={retry}>{t(language, 'retry')}</button> : <button className="button primary" disabled={step === 0 ? selectedCount === 0 : !answer} onClick={check}>{t(language, 'check')}</button>}</footer>
  </div>
}

export function MissionResult({ profile, attempts, xpEarned, onMap, onAgain }: { profile: Profile; attempts: AnswerRecord[]; xpEarned: number; onMap: () => void; onAgain: () => void }) {
  const language = profile.language
  const correct = attempts.filter((item) => item.correct).length
  const hints = attempts.reduce((sum, item) => sum + item.hintsUsed, 0)
  return <div className="mission-shell result-screen"><div className="confetti">★ <span>●</span> ★</div><div className="result-medal">🍕<i>✓</i></div><span className="eyebrow">MISSION COMPLETE</span><h1>{t(language, 'resultTitle')}</h1><p>{t(language, 'resultBody')}</p><div className="result-stats"><div><strong>{attempts.length ? Math.round(correct / attempts.length * 100) : 100}%</strong><small>{t(language, 'accuracy')}</small></div><div><strong>{hints}</strong><small>{t(language, 'hints')}</small></div><div><strong>+{xpEarned}</strong><small>{t(language, 'earned')}</small></div></div><button className="button primary full" onClick={onMap}>{t(language, 'finish')}</button><button className="button ghost full" onClick={onAgain}>{t(language, 'tryAgain')}</button></div>
}
