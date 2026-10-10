import { useEffect, useRef, useState } from 'react'
import { levelRank } from '../mathLevels'
import { buildShoppingQuestions, calculateCart, formatNZD, productUnitPriceCents, productUnitPriceLabel, shoppingLocalise, validateShoppingCart } from '../shoppingProblems'
import { saveAnswerAndProgress, saveProgress } from '../storage'
import type { AnswerRecord, Profile } from '../types'

const copy = {
  ko: {
    back: '뒤로', eyebrow: 'MISSION 02 · 돈과 백분율', title: '쇼핑 챌린지',
    intro: '가상 뉴질랜드 슈퍼마켓에서 예산을 계획하고, 할인과 단위 가격을 비교해 가장 알맞은 장바구니를 만드세요.',
    educational: '학습을 위해 만든 가상 상품과 가격이며 실제 판매 가격이 아니에요.', minutes: '약 7분', reward: '최초 완료 +40 XP', begin: '장보러 가기',
    budget: '예산', cart: '장바구니', empty: '상품의 + 버튼을 눌러 담아 보세요.', subtotal: '할인 전', discount: '할인', total: '결제 금액', remaining: '남은 예산',
    add: '추가', remove: '빼기', each: '개당', checkout: '계산대에서 결제', correct: '결제 성공!', incorrect: '조건을 다시 확인해 봐요.', over: '예산을 초과했어요.',
    next: '다음 쇼핑', complete: '미션 완료', retry: '장바구니 고치기', hint: '힌트', nextHint: '다음 힌트', translation: '번역 도움', closeTranslation: '번역 닫기',
    conditions: '구매 조건', receipt: 'YULI 영수증', paid: '결제 완료', saved: '아낀 금액', unitPrice: '단위 가격 비교', extension: '확장 학습', supported: '힌트를 활용한 지원형 재도전',
    resultTitle: '쇼핑 미션 완료!', resultBody: '예산, 할인, 단위 가격과 여러 구매 조건을 함께 해결했어요.', accuracy: '정답률', hints: '사용한 힌트', earned: '획득 XP', map: '탐험 지도로', again: '새 쇼핑 미션', completeLabel: '완료',
  },
  en: {
    back: 'Back', eyebrow: 'MISSION 02 · MONEY & PERCENTAGES', title: 'Shopping Challenge',
    intro: 'Plan a budget in a virtual New Zealand supermarket, compare discounts and unit prices, and build the right trolley.',
    educational: 'These are fictional products and educational prices, not real retail prices.', minutes: 'About 7 minutes', reward: 'First completion +40 XP', begin: 'Start shopping',
    budget: 'Budget', cart: 'Trolley', empty: 'Use a + button to add a product.', subtotal: 'Before discount', discount: 'Discount', total: 'Amount to pay', remaining: 'Budget left',
    add: 'Add', remove: 'Remove', each: 'each', checkout: 'Pay at checkout', correct: 'Payment approved!', incorrect: 'Check every condition again.', over: 'That is over budget.',
    next: 'Next shop', complete: 'Complete mission', retry: 'Edit trolley', hint: 'Hint', nextHint: 'Next hint', translation: 'Translation help', closeTranslation: 'Close translation',
    conditions: 'Shopping conditions', receipt: 'YULI receipt', paid: 'Paid', saved: 'Saved', unitPrice: 'Unit-price comparison', extension: 'Extension learning', supported: 'Supported retry with hints',
    resultTitle: 'Shopping mission complete!', resultBody: 'You solved budgets, discounts, unit prices and multiple shopping conditions together.', accuracy: 'Accuracy', hints: 'Hints used', earned: 'XP earned', map: 'Back to map', again: 'New shopping mission', completeLabel: 'complete',
  },
} as const

export function ShoppingIntro({ profile, onBack, onBegin }: { profile: Profile; onBack: () => void; onBegin: () => void }) {
  const c = copy[profile.language]
  return <div className="mission-shell intro-screen shopping-intro"><button className="back-button" onClick={onBack}>← {c.back}</button><div className="intro-art shopping-intro-art"><span>🛒</span><i>★</i><i>NZ$</i></div><div className="intro-copy"><span className="eyebrow">{c.eyebrow}</span><h1>{c.title}</h1><p>{c.intro}</p><p className="educational-price-note">ⓘ {c.educational}</p><div className="mission-meta"><span>◷ {c.minutes}</span><span>★ {c.reward}</span></div><button className="button primary full" onClick={onBegin}>{c.begin} →</button></div></div>
}

export function ShoppingMission({ profile, history, initialStep, initialScore, initialTotal, initialCart, initialHintLevel, initialAttemptIds, initialSupportAttempt, wasCompleted, onExit, onComplete, onDataChanged }: {
  profile: Profile
  history: AnswerRecord[]
  initialStep: number
  initialScore: number
  initialTotal: number
  initialCart?: Record<string, number>
  initialHintLevel?: number
  initialAttemptIds?: string[]
  initialSupportAttempt?: boolean
  wasCompleted: boolean
  onExit: () => void
  onComplete: (attempts: AnswerRecord[], isFirstCompletion: boolean) => void
  onDataChanged: () => void
}) {
  const language = profile.language
  const c = copy[language]
  const [questions] = useState(() => buildShoppingQuestions(profile, history))
  const [step, setStep] = useState(Math.min(initialStep, 2))
  const [cart, setCart] = useState<Record<string, number>>(() => initialCart ?? {})
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | 'over' | null>(null)
  const [hintLevel, setHintLevel] = useState(Math.min(2, initialHintLevel ?? 0))
  const [translation, setTranslation] = useState(false)
  const [attempts, setAttempts] = useState<AnswerRecord[]>(() => {
    const attemptIds = new Set(initialAttemptIds ?? [])
    return history.filter((answer) => answer.profileId === profile.id && answer.missionId === 'shopping' && attemptIds.has(answer.id))
  })
  const [supportAttempt, setSupportAttempt] = useState(initialSupportAttempt ?? false)
  const [submitting, setSubmitting] = useState(false)
  const submissionLocked = useRef(false)
  const question = questions[step]
  const totals = calculateCart(question, cart)
  const itemCount = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0)
  const otherLanguage = language === 'ko' ? 'en' : 'ko'

  useEffect(() => {
    void saveProgress({
      profileId: profile.id, missionId: 'shopping', completed: wasCompleted, currentStep: step,
      score: wasCompleted ? initialScore : attempts.filter((attempt) => attempt.correct).length,
      total: wasCompleted ? initialTotal : attempts.length,
      updatedAt: new Date().toISOString(), missionState: { cart, hintLevel, attemptIds: attempts.map((attempt) => attempt.id), supportAttempt, runActive: true },
    })
  }, [profile.id, step, cart, hintLevel, attempts, supportAttempt, wasCompleted, initialScore, initialTotal])

  const changeQuantity = (productId: string, delta: number) => {
    setCart((current) => {
      const quantity = Math.max(0, Math.min(9, (current[productId] ?? 0) + delta))
      const next = { ...current, [productId]: quantity }
      if (quantity === 0) delete next[productId]
      return next
    })
    setFeedback(null)
    submissionLocked.current = false
  }

  const checkout = async () => {
    if (submissionLocked.current || itemCount === 0) return
    submissionLocked.current = true
    setSubmitting(true)
    const correct = validateShoppingCart(question, cart)
    const overBudget = totals.totalCents > question.budgetCents
    const record: AnswerRecord = {
      id: crypto.randomUUID(), profileId: profile.id, missionId: 'shopping', questionId: question.id,
      correct, hintsUsed: hintLevel, answeredAt: new Date().toISOString(),
      answer: JSON.stringify(Object.entries(cart).sort(([a], [b]) => a.localeCompare(b))), objectiveId: question.objectiveId, supportAttempt,
    }
    const nextAttempts = [...attempts, record]
    try {
      await saveAnswerAndProgress(record, {
        profileId: profile.id, missionId: 'shopping', completed: wasCompleted, currentStep: step,
        score: wasCompleted ? initialScore : nextAttempts.filter((attempt) => attempt.correct).length,
        total: wasCompleted ? initialTotal : nextAttempts.length, updatedAt: new Date().toISOString(),
        missionState: { cart, hintLevel, attemptIds: nextAttempts.map((attempt) => attempt.id), supportAttempt, runActive: true },
      })
      setAttempts(nextAttempts)
      setFeedback(correct ? 'correct' : overBudget ? 'over' : 'incorrect')
      onDataChanged()
    } catch (error) {
      submissionLocked.current = false
      throw error
    } finally {
      setSubmitting(false)
    }
  }

  const retry = () => {
    setFeedback(null)
    setHintLevel((level) => Math.max(1, level))
    setSupportAttempt(true)
    submissionLocked.current = false
  }

  const advance = async () => {
    if (step < 2) {
      setStep((current) => current + 1)
      setCart({})
      setFeedback(null)
      setHintLevel(0)
      setTranslation(false)
      setSupportAttempt(false)
      submissionLocked.current = false
      return
    }
    await saveProgress({
      profileId: profile.id, missionId: 'shopping', completed: true, currentStep: 3,
      score: wasCompleted ? initialScore : attempts.filter((item) => item.correct).length,
      total: wasCompleted ? initialTotal : attempts.length,
      updatedAt: new Date().toISOString(), missionState: { cart: {}, hintLevel: 0, attemptIds: [], supportAttempt: false, runActive: false },
    })
    onComplete(attempts, !wasCompleted)
  }

  return <div className="mission-shell learning-screen shopping-mission"><header className="mission-header"><button className="icon-button" onClick={onExit} aria-label={c.back}>×</button><div className="step-track shopping-track"><span style={{ width: `${(step + 1) / 3 * 100}%` }} /></div><strong>{step + 1}/3</strong></header>
    <main className="shopping-learning-main">
      <section className="shopping-question"><div className="question-heading"><span className="stage-badge">{shoppingLocalise(question.stageName, language)}</span><span className="concept-chip">{shoppingLocalise(question.concept, language)}</span><span className="level-chip">L{levelRank(question.level)} · {question.level}{question.curriculumBand === 'extension' ? ` · ${c.extension}` : ''}</span></div>{supportAttempt && <p className="support-label">{c.supported}</p>}<h1>{shoppingLocalise(question.prompt, language)}</h1><p>{shoppingLocalise(question.story, language)}</p><p className="educational-price-note">ⓘ {c.educational}</p>
        {translation && <div className="translation-card"><small>{otherLanguage === 'en' ? 'ENGLISH' : '한국어'}</small><p>{shoppingLocalise(question.prompt, otherLanguage)}</p><p>{shoppingLocalise(question.story, otherLanguage)}</p>{hintLevel > 0 && <p>💡 {shoppingLocalise(question.hints[hintLevel - 1], otherLanguage)}</p>}</div>}
      </section>
      <section className="market-workspace">
        <div className="market-area"><div className="market-sign"><span>YULI FRESH</span><strong>🥝 NZ SUPERMARKET</strong></div><div className="product-grid">{question.products.map((product) => {
          const quantity = cart[product.id] ?? 0
          const salePrice = product.discountPercent ? Math.round(product.priceCents * (100 - product.discountPercent) / 100) : product.priceCents
          return <article className={`product-card ${quantity ? 'selected' : ''}`} key={product.id}><span className="product-icon" aria-hidden="true">{product.icon}</span><strong>{shoppingLocalise(product.name, language)}</strong><div className="product-price">{product.discountPercent ? <><del>{formatNZD(product.priceCents, language)}</del><b>{formatNZD(salePrice, language)}</b><small>-{product.discountPercent}%</small></> : <b>{formatNZD(product.priceCents, language)}</b>}</div><small>{formatNZD(productUnitPriceCents(product), language)} / {productUnitPriceLabel(product, language)}</small><div className="quantity-control"><button disabled={quantity === 0 || feedback !== null} onClick={() => changeQuantity(product.id, -1)} aria-label={`${shoppingLocalise(product.name, language)} ${c.remove}`}>−</button><output aria-live="polite">{quantity}</output><button disabled={quantity === 9 || feedback !== null} onClick={() => changeQuantity(product.id, 1)} aria-label={`${shoppingLocalise(product.name, language)} ${c.add}`}>+</button></div></article>
        })}</div></div>
        <aside className="cart-panel"><div className="budget-card"><span>{c.budget}</span><strong>{formatNZD(question.budgetCents, language)}</strong></div><h2>🛒 {c.cart} <small>{itemCount}</small></h2>{itemCount === 0 ? <p className="empty-cart">{c.empty}</p> : <ul>{question.products.filter((product) => (cart[product.id] ?? 0) > 0).map((product) => { const price = product.discountPercent ? Math.round(product.priceCents * (100 - product.discountPercent) / 100) : product.priceCents; return <li key={product.id}><span>{product.icon} {shoppingLocalise(product.name, language)} × {cart[product.id]}</span><strong>{formatNZD(price * cart[product.id], language)}</strong></li> })}</ul>}<div className="cart-totals">{totals.discountCents > 0 && <><div><span>{c.subtotal}</span><span>{formatNZD(totals.subtotalCents, language)}</span></div><div className="saving"><span>{c.discount}</span><span>−{formatNZD(totals.discountCents, language)}</span></div></>}<div className="grand-total"><span>{c.total}</span><strong>{formatNZD(totals.totalCents, language)}</strong></div><div className={totals.remainingCents < 0 ? 'over-budget' : ''}><span>{c.remaining}</span><strong>{formatNZD(totals.remainingCents, language)}</strong></div></div>
          <div className="condition-list"><strong>{c.conditions}</strong>{question.conditionText.map((condition, index) => <span key={index}>◇ {shoppingLocalise(condition, language)}</span>)}</div>
        </aside>
      </section>
      <div className="help-row"><button className="text-button" onClick={() => setHintLevel((level) => Math.min(2, level + 1))}>💡 {hintLevel === 0 ? c.hint : c.nextHint}</button><button className="text-button" onClick={() => setTranslation((open) => !open)}>🌐 {translation ? c.closeTranslation : c.translation}</button></div>
      {hintLevel > 0 && <div className="hint-card"><span>{hintLevel}/2</span>{shoppingLocalise(question.hints[hintLevel - 1], language)}</div>}
      {feedback === 'correct' && <section className="receipt-card" aria-label={c.receipt}><header><span>★</span><div><strong>{c.receipt}</strong><small>{c.paid}</small></div><span>★</span></header>{question.products.filter((product) => (cart[product.id] ?? 0) > 0).map((product) => <div key={product.id}><span>{shoppingLocalise(product.name, language)} × {cart[product.id]}</span><span>{formatNZD((product.discountPercent ? Math.round(product.priceCents * (100 - product.discountPercent) / 100) : product.priceCents) * cart[product.id], language)}</span></div>)}<footer><strong>{c.total}</strong><strong>{formatNZD(totals.totalCents, language)}</strong></footer><p>{shoppingLocalise(question.success, language)}</p></section>}
    </main>
    <footer className={`answer-footer ${feedback === 'correct' ? 'correct' : feedback ? 'incorrect' : ''}`}>{feedback ? <div className="feedback-copy"><span>{feedback === 'correct' ? '✓' : '↻'}</span><div><strong>{feedback === 'correct' ? c.correct : feedback === 'over' ? c.over : c.incorrect}</strong><p>{shoppingLocalise(question.explanation, language)}</p></div></div> : <div className="footer-selection">{c.total} · {formatNZD(totals.totalCents, language)}</div>}{feedback === 'correct' ? <button className="button primary" onClick={advance}>{step === 2 ? c.complete : c.next} →</button> : feedback ? <button className="button primary" onClick={retry}>{c.retry}</button> : <button className="button primary" disabled={itemCount === 0 || submitting} onClick={checkout}>{c.checkout}</button>}</footer>
  </div>
}

export function ShoppingResult({ profile, attempts, xpEarned, onMap, onAgain }: { profile: Profile; attempts: AnswerRecord[]; xpEarned: number; onMap: () => void; onAgain: () => void }) {
  const c = copy[profile.language]
  const correct = attempts.filter((item) => item.correct).length
  const hints = attempts.reduce((sum, item) => sum + item.hintsUsed, 0)
  return <div className="mission-shell result-screen shopping-result"><div className="confetti">★ <span>●</span> ★</div><div className="result-medal">🛒<i>✓</i></div><span className="eyebrow">MISSION COMPLETE</span><h1>{c.resultTitle}</h1><p>{c.resultBody}</p><div className="result-stats"><div><strong>{attempts.length ? Math.round(correct / attempts.length * 100) : 100}%</strong><small>{c.accuracy}</small></div><div><strong>{hints}</strong><small>{c.hints}</small></div><div><strong>+{xpEarned}</strong><small>{c.earned}</small></div></div><button className="button primary full" onClick={onMap}>{c.map}</button><button className="button ghost full" onClick={onAgain}>{c.again}</button></div>
}
