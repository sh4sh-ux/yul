import { useState } from 'react'
import { diagnosticQuestions, diagnosticText, scoreDiagnostic } from '../mathDiagnostic'
import type { MathLevel, Profile } from '../types'

const labels: Record<MathLevel, string> = { foundation: 'Foundation', core: 'Core', advanced: 'Advanced', expert: 'Expert', master: 'Master' }

export function MathDiagnostic({ profile, onFinish, onClose }: { profile: Profile; onFinish: (score: number, level: MathLevel, apply: boolean) => void; onClose: () => void }) {
  const questions = diagnosticQuestions(profile.year)
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<number[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [result, setResult] = useState<{ score: number; recommendedLevel: MathLevel } | null>(null)
  const language = profile.language
  const question = questions[step]
  const submit = () => {
    if (selected === null) return
    const next = [...answers, selected]
    if (step + 1 === questions.length) setResult(scoreDiagnostic(questions, next))
    else { setAnswers(next); setStep(step + 1); setSelected(null) }
  }
  return <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="diagnostic-title"><section className="sheet diagnostic-sheet">
    <div className="section-heading"><div><span className="eyebrow">LEVEL CHECK · {step + 1}/{questions.length}</span><h2 id="diagnostic-title">{language === 'ko' ? '수학 레벨 진단' : 'Maths level check'}</h2></div><button className="icon-button" onClick={onClose} aria-label={language === 'ko' ? '닫기' : 'Close'}>×</button></div>
    {!result ? <><div className="step-track"><span style={{ width: `${(step + 1) / questions.length * 100}%` }} /></div><h3>{diagnosticText(question.prompt, language)}</h3><div className="diagnostic-options">{question.options.map((item, index) => <button key={index} className={selected === index ? 'choice-chip selected' : 'choice-chip'} onClick={() => setSelected(index)}>{diagnosticText(item.label, language)}</button>)}</div><p className="helper">{language === 'ko' ? '중간에 난이도를 낮추지 않아요. 아는 만큼 천천히 풀어 보세요.' : 'The check does not lower difficulty midway. Take your time and show what you know.'}</p><button className="button primary full" disabled={selected === null} onClick={submit}>{language === 'ko' ? '다음' : 'Next'}</button></> : <div className="diagnostic-result"><span className="result-medal">★</span><h3>{language === 'ko' ? `추천: ${labels[result.recommendedLevel]}` : `Recommended: ${labels[result.recommendedLevel]}`}</h3><p>{result.score}/{questions.length} · {language === 'ko' ? '학년과 독립된 학습 레벨이에요.' : 'This learning level is independent of school year.'}</p><button className="button primary full" onClick={() => onFinish(result.score, result.recommendedLevel, true)}>{language === 'ko' ? '추천 레벨 적용' : 'Apply recommendation'}</button><button className="button ghost full" onClick={() => onFinish(result.score, result.recommendedLevel, false)}>{language === 'ko' ? '현재 레벨 유지' : 'Keep current level'}</button></div>}
  </section></div>
}
