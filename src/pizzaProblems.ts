import { adjustedMathLevel, normaliseMathLevel, profileMathLevel } from './mathLevels'
import type { Fraction } from './fractions'
import type { AnswerRecord, Language, MathLevel, Profile } from './types'

export interface LocalisedText { ko: string; en: string }
export interface WorkingStep {
  prompt: LocalisedText
  acceptedAnswers: string[]
  explanation: LocalisedText
}
export interface SupportQuestion {
  id: string
  prompt: LocalisedText
  story: LocalisedText
  denominator: number
  target: Fraction
  equation: string
  hints: [LocalisedText, LocalisedText]
  explanation: LocalisedText
  alternateExplanation: LocalisedText
}
export interface PizzaQuestion {
  id: string; objectiveId: string; level: MathLevel; curriculumBand: 'core' | 'extension'; stage: 1 | 2 | 3
  stageName: LocalisedText; concept: LocalisedText; prompt: LocalisedText; story: LocalisedText
  denominator: number; target: Fraction; equation: string; hints: [LocalisedText, LocalisedText]
  explanation: LocalisedText; alternateExplanation: LocalisedText; support: SupportQuestion; workingSteps?: WorkingStep[]
}

type Task = Omit<PizzaQuestion, 'id' | 'level' | 'curriculumBand' | 'stageName' | 'support'> & { slug: string; support: Omit<SupportQuestion, 'id'> }
const tx = (ko: string, en: string): LocalisedText => ({ ko, en })
export const localise = (value: LocalisedText, language: Language): string => value[language]
const stageNames = [tx('', ''), tx('1단계 · 발견', 'Stage 1 · Discover'), tx('2단계 · 해결', 'Stage 2 · Solve'), tx('3단계 · 추론', 'Stage 3 · Reason')] as const
const sup = (prompt: LocalisedText, story: LocalisedText, denominator: number, numerator: number, equation: string): Omit<SupportQuestion, 'id'> => {
  const answer = `${numerator}/${denominator}`
  return {
    prompt, story, denominator, target: { numerator, denominator }, equation,
    hints: [
      tx(`지원 문제의 식 ${equation}이 무엇을 묻는지 먼저 확인하세요.`, `First identify what the support equation ${equation} is asking.`),
      tx(`피자를 ${denominator}개의 같은 조각으로 보고 ${numerator}조각을 선택하세요.`, `Treat the pizza as ${denominator} equal slices and select ${numerator}.`),
    ],
    explanation: tx(`식 ${equation}의 정답은 ${answer}입니다.`, `The answer to ${equation} is ${answer}.`),
    alternateExplanation: tx(`그림을 ${denominator}개의 같은 조각으로 나누고 ${numerator}조각을 표시해 정답이 ${answer}인지 확인해 보세요.`, `Split the model into ${denominator} equal slices and mark ${numerator} to check ${answer}.`),
  }
}
const task = (stage: 1 | 2 | 3, slug: string, objectiveId: string, concept: LocalisedText, prompt: LocalisedText, story: LocalisedText,
  denominator: number, numerator: number, equation: string, hint1: LocalisedText, hint2: LocalisedText, explanation: LocalisedText,
  alternateExplanation: LocalisedText, support: Omit<SupportQuestion, 'id'>): Task => ({ stage, slug, objectiveId, concept, prompt, story, denominator,
    target: { numerator, denominator }, equation, hints: [hint1, hint2], explanation, alternateExplanation, support })

const foundation: Task[] = [
  task(1, 'part-whole', 'part-whole', tx('부분과 전체', 'Part and whole'), tx('3/4을 피자로 나타내세요.', 'Show 3/4 on the pizza.'), tx('한 판을 같은 크기 4조각으로 나눴어요.', 'One whole is split into 4 equal slices.'), 4, 3, '3 ÷ 4 = ?', tx('분모는 전체 조각 수예요.', 'The denominator is the total slices.'), tx('분자 3만큼 고르세요.', 'Choose the numerator: 3.'), tx('3/4은 같은 4조각 중 3조각이에요.', '3/4 is 3 of 4 equal parts.'), tx('먼저 전체 조각 수, 다음에 고를 조각 수를 찾아요.', 'Find the total first, then the selected parts.'), sup(tx('2/4을 나타내세요.', 'Show 2/4.'), tx('같은 크기 4조각 중 2조각이에요.', 'Choose 2 of 4 equal parts.'), 4, 2, '2/4 = ?')),
  task(2, 'add-like', 'add-like-fractions', tx('같은 조각 더하기', 'Adding equal parts'), tx('두 접시의 주문을 한 판에 합치세요.', 'Combine both plate orders.'), tx('첫 접시는 1/4판, 둘째 접시는 2/4판이에요.', 'The plates hold 1/4 and 2/4.'), 4, 3, '1/4 + 2/4 = ?', tx('조각 크기가 모두 같아요.', 'The parts are the same size.'), tx('1조각과 2조각을 합쳐요.', 'Combine 1 slice and 2 slices.'), tx('1/4 + 2/4 = 3/4이에요.', '1/4 + 2/4 = 3/4.'), tx('같은 크기 조각은 개수만 합쳐요.', 'For equal parts, combine their counts.'), sup(tx('1/4과 1/4을 합치세요.', 'Combine 1/4 and 1/4.'), tx('같은 조각 두 개를 놓아요.', 'Place two equal slices.'), 4, 2, '1/4 + 1/4 = ?')),
  task(3, 'compare-like', 'compare-fractions', tx('분수 비교', 'Comparing fractions'), tx('2/4와 3/4 중 더 큰 양을 만드세요.', 'Build the larger amount: 2/4 or 3/4.'), tx('조각 크기가 같을 때 주문량을 비교해요.', 'Compare orders with equal-sized slices.'), 4, 3, '2/4 ? 3/4', tx('분모가 같아요.', 'The denominators match.'), tx('분자를 비교하세요.', 'Compare the numerators.'), tx('3/4이 2/4보다 커요.', '3/4 is greater than 2/4.'), tx('같은 크기이므로 조각 수를 비교하면 돼요.', 'The parts match, so compare their counts.'), sup(tx('1/4와 2/4 중 큰 양을 만드세요.', 'Build the larger of 1/4 and 2/4.'), tx('조각 수를 비교해요.', 'Compare slice counts.'), 4, 2, '1/4 ? 2/4')),
]

const core: Task[] = [
  task(1, 'equivalent', 'equivalent-fractions', tx('동치분수', 'Equivalent fractions'), tx('1/2과 같은 양을 8조각으로 나타내세요.', 'Show 1/2 using 8 slices.'), tx('자르는 방법이 달라도 양은 같을 수 있어요.', 'Different partitions can show the same amount.'), 8, 4, '1/2 = ?/8', tx('8조각의 절반을 찾아요.', 'Find half of 8.'), tx('8 ÷ 2 = 4예요.', '8 ÷ 2 = 4.'), tx('1/2 = 4/8이에요.', '1/2 = 4/8.'), tx('분자와 분모에 같은 수를 곱하면 값이 같아요.', 'Multiply numerator and denominator by the same number.'), sup(tx('1/2을 6조각으로 나타내세요.', 'Show 1/2 using 6 slices.'), tx('6의 절반을 찾아요.', 'Find half of 6.'), 6, 3, '1/2 = ?/6')),
  task(2, 'remaining', 'fraction-subtraction', tx('남은 양', 'Finding a remainder'), tx('주문 뒤 남은 피자를 나타내세요.', 'Show the pizza left after serving.'), tx('한 판에서 3/8판을 냈어요.', 'A customer was served 3/8 of a pizza.'), 8, 5, '1 - 3/8 = ?', tx('한 판은 8/8이에요.', 'One whole is 8/8.'), tx('8조각에서 3조각을 빼요.', 'Subtract 3 slices from 8.'), tx('8/8 - 3/8 = 5/8이에요.', '8/8 − 3/8 = 5/8.'), tx('전체를 먼저 8/8로 바꿔 보세요.', 'Rename the whole as 8/8 first.'), sup(tx('2/8을 낸 뒤 남은 양은?', 'What remains after serving 2/8?'), tx('8/8에서 빼요.', 'Subtract from 8/8.'), 8, 6, '1 - 2/8 = ?')),
  task(3, 'decimal-half', 'fraction-decimal', tx('분수와 소수', 'Fractions and decimals'), tx('0.5와 같은 피자 양을 나타내세요.', 'Show the amount equal to 0.5.'), tx('0.5는 한 판의 절반이에요.', '0.5 is half of one whole.'), 8, 4, '0.5 = 1/2 = ?/8', tx('0.5 = 1/2예요.', '0.5 = 1/2.'), tx('8의 절반은 4예요.', 'Half of 8 is 4.'), tx('0.5 = 1/2 = 4/8이에요.', '0.5 = 1/2 = 4/8.'), tx('0.5는 10분의 5이고 약분하면 1/2이에요.', '0.5 is 5 tenths, simplified to 1/2.'), sup(tx('0.25와 같은 양을 나타내세요.', 'Show the amount equal to 0.25.'), tx('0.25는 1/4이에요.', '0.25 is 1/4.'), 8, 2, '0.25 = 1/4 = ?/8')),
]

function advanced(year7: boolean): Task[] {
  if (!year7) return [
    task(1, 'percent-link', 'fraction-decimal-percent', tx('분수·소수·백분율', 'Fractions, decimals and percentages'), tx('75%와 같은 피자 양을 나타내세요.', 'Show the pizza amount equal to 75%.'), tx('주문표의 0.75판과 같은 양이에요.', 'It is the same as 0.75 on the order slip.'), 8, 6, '75% = 0.75 = ?/8', tx('75% = 3/4예요.', '75% = 3/4.'), tx('8의 3/4을 찾아요.', 'Find 3/4 of 8.'), tx('75% = 0.75 = 3/4 = 6/8이에요.', '75% = 0.75 = 3/4 = 6/8.'), tx('100%를 25%씩 네 묶음으로 나눠 보세요.', 'Split 100% into four 25% groups.'), sup(tx('50%를 나타내세요.', 'Show 50%.'), tx('50%는 절반이에요.', '50% is one half.'), 8, 4, '50% = 0.5 = ?/8')),
    task(2, 'party-order', 'two-step-word-problem', tx('두 단계 주문', 'Two-step order'), tx('두 주문을 계산해 준비할 양을 나타내세요.', 'Calculate both orders and show the total.'), tx('8명이 1/16판씩 먹고 진행자가 1/4판을 더 주문했어요.', 'Eight guests eat 1/16 each, then the host orders 1/4 more.'), 8, 6, '8 × 1/16 + 1/4 = ?', tx('8 × 1/16 = 1/2예요.', '8 × 1/16 = 1/2.'), tx('1/2 + 1/4를 계산해요.', 'Now calculate 1/2 + 1/4.'), tx('1/2 + 1/4 = 3/4 = 6/8이에요.', '1/2 + 1/4 = 3/4 = 6/8.'), tx('사람 몫을 먼저 합친 뒤 추가 주문을 더해요.', 'Combine guest shares before adding the extra.'), sup(tx('4명이 1/8씩 먹고 1/4을 더 주문했어요.', 'Four guests eat 1/8 each, then order 1/4 more.'), tx('두 단계를 차례로 계산해요.', 'Calculate the two steps in order.'), 8, 6, '4 × 1/8 + 1/4 = ?')),
    task(3, 'waste', 'multiplicative-fraction', tx('실생활 추론', 'Real-life reasoning'), tx('실제로 먹은 양을 나타내세요.', 'Show the amount actually eaten.'), tx('3/4판을 샀지만 산 양의 1/3을 남겼어요.', 'They bought 3/4 but left 1/3 of what they bought.'), 8, 4, '3/4 × (1 - 1/3) = ?', tx('산 양의 2/3을 먹었어요.', 'They ate 2/3 of what was bought.'), tx('3/4 × 2/3을 계산해요.', 'Calculate 3/4 × 2/3.'), tx('3/4 × 2/3 = 1/2 = 4/8이에요.', '3/4 × 2/3 = 1/2 = 4/8.'), tx('남긴 1/3은 한 판이 아니라 산 양을 기준으로 해요.', 'The 1/3 is of the purchased amount, not the whole.'), sup(tx('1/2판을 사서 그 절반을 먹었어요.', 'They bought 1/2 and ate half of it.'), tx('1/2의 1/2을 찾아요.', 'Find 1/2 of 1/2.'), 8, 2, '1/2 × 1/2 = ?')),
  ]
  return [
    task(1, 'ratio-percent', 'ratio-percent', tx('비와 백분율', 'Ratios and percentages'), tx('토핑 비 3:5에서 첫 토핑의 몫을 나타내세요.', 'Show the first topping share in a 3:5 ratio.'), tx('두 토핑은 모두 8묶음이에요.', 'The two toppings make 8 groups altogether.'), 8, 3, '3:5 → ?/8 = ?%', tx('전체는 3+5=8이에요.', 'The whole is 3+5=8.'), tx('첫 토핑은 8중 3이에요.', 'The first topping is 3 of 8.'), tx('3:5의 첫 몫은 3/8 = 37.5%예요.', 'The first share of 3:5 is 3/8 = 37.5%.'), tx('비의 두 수를 더해 전체를 만들어요.', 'Add both ratio parts to make the whole.'), sup(tx('1:3의 첫 몫을 나타내세요.', 'Show the first share in 1:3.'), tx('전체는 4묶음이에요.', 'There are 4 groups.'), 8, 2, '1:3 → ?/8 = ?')),
    task(2, 'voucher', 'compound-percent', tx('백분율 두 단계', 'Two-step percentages'), tx('쿠폰이 원래 주문값에서 차지하는 비율을 나타내세요.', 'Show the voucher as a share of the original order.'), tx('25% 할인액의 절반을 쿠폰으로 받았어요.', 'Half of a 25% discount becomes a voucher.'), 8, 1, '25% × 1/2 = ?', tx('25%는 1/4이에요.', '25% is 1/4.'), tx('그 절반은 1/8이에요.', 'Half of that is 1/8.'), tx('12.5% = 1/8이에요.', '12.5% = 1/8.'), tx('$20라면 할인 $5의 절반 $2.50로 확인할 수 있어요.', 'For $20, half of a $5 discount is $2.50.'), sup(tx('40%의 절반을 나타내세요.', 'Show half of 40%.'), tx('40%를 둘로 나눠요.', 'Split 40% in half.'), 10, 2, '40% × 1/2 = ?')),
    task(3, 'nested-percent', 'nested-percent', tx('포함 관계 추론', 'Nested proportion reasoning'), tx('전체 중 채식 큰 피자의 비율을 나타내세요.', 'Show the large vegetarian share of all orders.'), tx('큰 피자는 전체의 60%이고, 그 절반이 채식이에요.', 'Large pizzas are 60% of all orders; half are vegetarian.'), 10, 3, '60% × 1/2 = ?', tx('60%의 절반을 찾아요.', 'Find half of 60%.'), tx('0.6 × 0.5를 계산해요.', 'Calculate 0.6 × 0.5.'), tx('30% = 3/10이에요.', '30% = 3/10.'), tx('100건 중 60건, 그 절반인 30건으로 생각해요.', 'Think 60 of 100, then half: 30.'), sup(tx('80%의 절반을 나타내세요.', 'Show half of 80%.'), tx('80%를 둘로 나눠요.', 'Split 80% in half.'), 10, 4, '80% × 1/2 = ?')),
  ]
}

function high(level: 'expert' | 'master', year7: boolean): Task[] {
  const master = level === 'master'
  const y7 = year7
  const tasks = [
    task(1, 'unlike-units', 'unlike-denominators', tx('서로 다른 단위 통합', 'Combining unlike units'), tx(master ? '5/6판에서 1/4판을 빼세요.' : '1/3판과 1/4판을 합치세요.', master ? 'Subtract 1/4 from 5/6.' : 'Combine 1/3 and 1/4.'), tx(y7 ? '예약 변경을 공통 조각으로 정확히 계산하세요.' : '서로 다른 조각 크기를 먼저 맞추세요.', y7 ? 'Calculate a changed booking using exact common parts.' : 'First make the unlike parts the same size.'), 12, 7, master ? '5/6 - 1/4 = ?' : '1/3 + 1/4 = ?', tx('최소공배수 12를 사용해요.', 'Use the least common denominator, 12.'), tx(master ? '10/12 - 3/12를 계산해요.' : '4/12 + 3/12를 계산해요.', master ? 'Calculate 10/12 − 3/12.' : 'Calculate 4/12 + 3/12.'), tx('답은 7/12예요.', 'The answer is 7/12.'), tx('두 양을 같은 12조각 그림으로 다시 그려 보세요.', 'Redraw both amounts with 12 equal parts.'), sup(tx(master ? '3/4에서 1/3을 빼세요.' : '1/2과 1/3을 합치세요.', master ? 'Subtract 1/3 from 3/4.' : 'Combine 1/2 and 1/3.'), tx('12를 공통 분모로 사용해요.', 'Use 12 as a common denominator.'), 12, master ? 5 : 10, master ? '3/4 - 1/3 = ?' : '1/2 + 1/3 = ?')),
    task(2, 'compound-rate', 'compound-rate', tx('연속 비율 추론', 'Compound rates'), tx('모든 조건을 만족하는 주문 비율을 나타내세요.', 'Show the order share satisfying every condition.'), tx(master ? '80%가 배달이고 그중 75%가 정시이며, 정시 주문의 2/3가 가족 피자예요.' : '온라인 주문은 전체의 3/4이고, 그중 2/3가 가족 피자예요.', master ? '80% are deliveries, 75% are on time, and 2/3 of those are family pizzas.' : 'Online orders are 3/4 of all orders; 2/3 of those are family pizzas.'), 10, master ? 4 : 5, master ? '0.8 × 0.75 × 2/3 = ?' : '3/4 × 2/3 = ?', tx('“그중”은 곱셈이에요.', '“Of those” means multiplication.'), tx(master ? '0.8×0.75=0.6 뒤 2/3를 곱해요.' : '3을 약분하세요.', master ? '0.8×0.75=0.6, then multiply by 2/3.' : 'Cancel the common factor 3.'), tx(master ? '40% = 4/10이에요.' : '50% = 5/10이에요.', master ? '40% = 4/10.' : '50% = 5/10.'), tx('100건을 가정해 각 조건을 차례로 적용해도 돼요.', 'Assume 100 orders and apply each condition.'), sup(tx(master ? '60% 중 2/3를 나타내세요.' : '전체의 2/3 중 3/4을 나타내세요.', master ? 'Show 2/3 of 60%.' : 'Show 3/4 of 2/3.'), tx('“~의”를 곱셈으로 바꿔요.', 'Translate “of” into multiplication.'), 10, master ? 4 : 5, master ? '60% × 2/3 = ?' : '2/3 × 3/4 = ?')),
    task(3, 'constraint-model', 'constraint-modelling', tx(master ? '심화 모델링' : '조건 모델링', master ? 'Extension modelling' : 'Constraint modelling'), tx('조건을 식으로 바꿔 최종 양을 나타내세요.', 'Model the conditions and show the final amount.'), tx(master ? '한 양의 1/3을 기부하고, 남은 양의 3/4을 판매했어요.' : '5/8판을 준비해 그 양의 20%를 추가한 뒤 한 판의 1/4을 취소했어요.', master ? 'One third is donated, then 3/4 of the remainder is sold.' : 'Prepare 5/8, add 20% of that amount, then cancel 1/4 of a whole.'), 8, 4, master ? '(1 - 1/3) × 3/4 = ?' : '5/8 × 1.2 - 1/4 = ?', tx('중간값을 기록하세요.', 'Record each intermediate value.'), tx(master ? '2/3 × 3/4을 계산해요.' : '5/8의 120%는 3/4예요.', master ? 'Calculate 2/3 × 3/4.' : '120% of 5/8 is 3/4.'), tx('최종 양은 1/2 = 4/8이에요.', 'The final amount is 1/2 = 4/8.'), tx('막대 그림에 조건을 한 단계씩 표시해 단위를 확인해요.', 'Mark each condition on a bar model and check units.'), sup(tx(master ? '3/4 중 2/3를 나타내세요.' : '1/2에 그 양의 50%를 더하세요.', master ? 'Show 2/3 of 3/4.' : 'Add 50% of 1/2 to 1/2.'), tx('원래 양과 그 일부를 구분해요.', 'Separate the original amount from its part.'), 8, master ? 4 : 6, master ? '3/4 × 2/3 = ?' : '1/2 + 1/4 = ?')),
  ]
  if (!master) return tasks
  const workingSteps: WorkingStep[][] = [
    [
      { prompt: tx('두 분수의 공통분모를 입력하세요.', 'Enter a common denominator for both fractions.'), acceptedAnswers: ['12'], explanation: tx('6과 4의 최소공배수는 12예요.', 'The least common multiple of 6 and 4 is 12.') },
      { prompt: tx('통분한 뒤 계산한 분수를 입력하세요.', 'Enter the fraction after renaming and calculating.'), acceptedAnswers: ['7/12'], explanation: tx('10/12 - 3/12 = 7/12예요.', '10/12 − 3/12 = 7/12.') },
    ],
    [
      { prompt: tx('80%의 75%를 계산하세요.', 'Calculate 75% of 80%.'), acceptedAnswers: ['60%', '0.6'], explanation: tx('0.8 × 0.75 = 0.6, 즉 60%예요.', '0.8 × 0.75 = 0.6, or 60%.') },
      { prompt: tx('그 결과의 2/3를 계산하세요.', 'Calculate 2/3 of that result.'), acceptedAnswers: ['40%', '0.4', '2/5'], explanation: tx('60% × 2/3 = 40%예요.', '60% × 2/3 = 40%.') },
    ],
    [
      { prompt: tx('1/3을 기부한 뒤 남은 분수를 입력하세요.', 'Enter the fraction remaining after donating 1/3.'), acceptedAnswers: ['2/3'], explanation: tx('1 - 1/3 = 2/3예요.', '1 − 1/3 = 2/3.') },
      { prompt: tx('남은 양의 3/4을 계산하세요.', 'Calculate 3/4 of the remainder.'), acceptedAnswers: ['1/2', '4/8'], explanation: tx('2/3 × 3/4 = 1/2예요.', '2/3 × 3/4 = 1/2.') },
    ],
  ]
  return tasks.map((item, index) => ({ ...item, workingSteps: workingSteps[index] }))
}

const tasksFor = (level: MathLevel, year7: boolean): Task[] => level === 'foundation' ? foundation : level === 'core' ? core : level === 'advanced' ? advanced(year7) : high(level, year7)

export function resolvePizzaDifficulty(profile: Profile, history: AnswerRecord[]): MathLevel {
  const override = profile.unitDifficulties.pizza
  const configured = override && override !== 'auto' ? normaliseMathLevel(override) : profileMathLevel(profile)
  return profile.adaptiveDifficulty || override === 'auto' ? adjustedMathLevel(configured, history) : configured
}

export function buildPizzaQuestions(profile: Profile, history: AnswerRecord[]): PizzaQuestion[] {
  const level = resolvePizzaDifficulty(profile, history)
  const year7 = (profile.year ?? 5) >= 7
  return tasksFor(level, year7).map((item) => {
    const id = `pizza-v12-${year7 ? 'y7' : 'y5'}-${level}-${item.slug}`
    return { ...item, id, support: { ...item.support, id: `${id}-support` }, stageName: stageNames[item.stage], level,
      curriculumBand: level === 'master' ? 'extension' : 'core' }
  })
}

export function pizzaReviewPrompt(questionId: string, language: Language): string | null {
  const legacy: Record<string, LocalisedText> = {
    'pizza-v11-discover-3-of-4': tx('피자 4조각 중 3조각을 골라 3/4을 만들어 보세요.', 'Select 3 of 4 pizza slices to make 3/4.'),
    'pizza-v11-discover-5-of-8': tx('피자 8조각 중 5조각을 골라 5/8을 만들어 보세요.', 'Select 5 of 8 pizza slices to make 5/8.'),
    'pizza-v11-order-1-4-plus-2-4': tx('1/4과 2/4을 한 판에 합쳐 보세요.', 'Combine 1/4 and 2/4 on one pizza.'),
    'pizza-v11-order-3-8-plus-2-8': tx('3/8과 2/8을 한 판에 합쳐 보세요.', 'Combine 3/8 and 2/8 on one pizza.'),
    'pizza-v11-challenge-compare-quarters': tx('2/4와 3/4 중 더 큰 분수를 만들어 보세요.', 'Build the larger fraction: 2/4 or 3/4.'),
    'pizza-v11-challenge-equivalent-half': tx('1/2과 같은 양을 8조각 피자로 만들어 보세요.', 'Build an amount equal to 1/2 using 8 slices.'),
    'pizza-v11-challenge-thirds': tx('1/3과 1/3을 합친 양을 만들어 보세요.', 'Build the amount made by 1/3 plus 1/3.'),
    'pizza-v11-challenge-2-3-plus-1-6': tx('2/3와 1/6을 합친 양을 만들어 보세요.', 'Build the amount made by 2/3 plus 1/6.'),
    'pizza-v11-challenge-1-2-plus-1-4': tx('1/2과 1/4을 합친 양을 만들어 보세요.', 'Build the amount made by 1/2 plus 1/4.'),
  }
  if (legacy[questionId]) return localise(legacy[questionId], language)
  for (const year of [5, 7]) for (const level of ['foundation', 'core', 'advanced', 'expert', 'master'] as MathLevel[]) {
    const questions = buildPizzaQuestions({ year, mathLevel: level, difficulty: level, adaptiveDifficulty: false, unitDifficulties: {} } as Profile, [])
    for (const question of questions) {
      if (question.id === questionId) return localise(question.prompt, language)
      if (question.support.id === questionId) return localise(question.support.prompt, language)
    }
  }
  return null
}
