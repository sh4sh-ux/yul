import { suggestedDifficulty, type Fraction } from './fractions'
import type { AnswerRecord, Difficulty, Language, Profile } from './types'

export interface LocalisedText { ko: string; en: string }

export interface PizzaQuestion {
  id: string
  stage: 1 | 2 | 3
  stageName: LocalisedText
  concept: LocalisedText
  prompt: LocalisedText
  story?: LocalisedText
  denominator: number
  target: Fraction
  equation?: string
  hints: [LocalisedText, LocalisedText]
  explanation: LocalisedText
}

export type ResolvedDifficulty = Exclude<Difficulty, 'auto'>

const text = (ko: string, en: string): LocalisedText => ({ ko, en })
const stages = {
  discovery: text('1단계 · 발견', 'Stage 1 · Discover'),
  order: text('2단계 · 해결', 'Stage 2 · Solve'),
  challenge: text('3단계 · 도전', 'Stage 3 · Challenge'),
}

export function localise(value: LocalisedText, language: Language): string { return value[language] }

const reviewPrompts: Record<string, LocalisedText> = {
  'pizza-v11-discover-3-of-4': text('피자 4조각 중 3조각을 골라 3/4을 만들어 보세요.', 'Select 3 of 4 pizza slices to make 3/4.'),
  'pizza-v11-discover-5-of-8': text('피자 8조각 중 5조각을 골라 5/8을 만들어 보세요.', 'Select 5 of 8 pizza slices to make 5/8.'),
  'pizza-v11-order-1-4-plus-2-4': text('1/4과 2/4을 한 판에 합쳐 보세요.', 'Combine 1/4 and 2/4 on one pizza.'),
  'pizza-v11-order-3-8-plus-2-8': text('3/8과 2/8을 한 판에 합쳐 보세요.', 'Combine 3/8 and 2/8 on one pizza.'),
  'pizza-v11-challenge-compare-quarters': text('2/4와 3/4 중 더 큰 분수를 만들어 보세요.', 'Build the larger fraction: 2/4 or 3/4.'),
  'pizza-v11-challenge-equivalent-half': text('1/2과 같은 양을 8조각 피자로 만들어 보세요.', 'Build an amount equal to 1/2 using 8 slices.'),
  'pizza-v11-challenge-thirds': text('1/3과 1/3을 합친 양을 만들어 보세요.', 'Build the amount made by 1/3 plus 1/3.'),
  'pizza-v11-challenge-2-3-plus-1-6': text('2/3와 1/6을 합친 양을 만들어 보세요.', 'Build the amount made by 2/3 plus 1/6.'),
  'pizza-v11-challenge-1-2-plus-1-4': text('1/2과 1/4을 합친 양을 만들어 보세요.', 'Build the amount made by 1/2 plus 1/4.'),
}

export function pizzaReviewPrompt(questionId: string, language: Language): string | null {
  return reviewPrompts[questionId]?.[language] ?? null
}

export function resolvePizzaDifficulty(profile: Profile, history: AnswerRecord[]): ResolvedDifficulty {
  const configured = profile.unitDifficulties.pizza ?? profile.difficulty
  return configured === 'auto'
    ? suggestedDifficulty(history.filter((answer) => answer.missionId === 'pizza'))
    : configured
}

export function buildPizzaQuestions(profile: Profile, history: AnswerRecord[]): PizzaQuestion[] {
  const year = profile.year ?? 5
  const difficulty = resolvePizzaDifficulty(profile, history)
  const advancedDiscovery = year >= 6 && difficulty !== 'easy'
  const stageOne: PizzaQuestion = advancedDiscovery ? {
    id: 'pizza-v11-discover-5-of-8', stage: 1, stageName: stages.discovery,
    concept: text('분자와 분모', 'Numerator and denominator'),
    prompt: text('피자 8조각 중 5조각을 골라 5/8을 만들어 보세요.', 'Select 5 of 8 pizza slices to make 5/8.'),
    story: text('분모 8은 피자 한 판을 똑같이 8조각으로 나눈다는 뜻이에요.', 'The denominator 8 means one pizza is shared into 8 equal slices.'),
    denominator: 8, target: { numerator: 5, denominator: 8 },
    hints: [text('아래 숫자 8만큼 똑같은 조각이 있어요.', 'The bottom number 8 tells us there are 8 equal slices.'), text('위 숫자 5만큼 조각을 톡톡 선택해 보세요.', 'Tap the number of slices shown by the top number: 5.')],
    explanation: text('5/8에서 5는 선택한 조각 수, 8은 전체 조각 수예요.', 'In 5/8, 5 is the number selected and 8 is the total number of slices.'),
  } : {
    id: 'pizza-v11-discover-3-of-4', stage: 1, stageName: stages.discovery,
    concept: text('분자와 분모', 'Numerator and denominator'),
    prompt: text('피자 4조각 중 3조각을 골라 3/4을 만들어 보세요.', 'Select 3 of 4 pizza slices to make 3/4.'),
    story: text('분모 4는 피자 한 판을 똑같이 4조각으로 나눈다는 뜻이에요.', 'The denominator 4 means one pizza is shared into 4 equal slices.'),
    denominator: 4, target: { numerator: 3, denominator: 4 },
    hints: [text('아래 숫자 4는 전체 조각 수예요.', 'The bottom number 4 is the total number of slices.'), text('위 숫자 3만큼 조각을 톡톡 선택해 보세요.', 'Tap the number of slices shown by the top number: 3.')],
    explanation: text('3/4에서 3은 선택한 조각 수, 4는 전체 조각 수예요.', 'In 3/4, 3 is the number selected and 4 is the total number of slices.'),
  }

  const advancedOrder = year >= 6 && difficulty === 'challenge'
  const stageTwo: PizzaQuestion = advancedOrder ? {
    id: 'pizza-v11-order-3-8-plus-2-8', stage: 2, stageName: stages.order,
    concept: text('같은 분모의 덧셈', 'Adding like denominators'),
    prompt: text('주문을 한 판에 합쳐서 준비해 주세요.', 'Combine the order on one serving pizza.'),
    story: text('손님이 페퍼로니 피자 3/8판과 치즈 피자 2/8판을 주문했어요. 모두 얼마일까요?', 'A customer orders 3/8 pepperoni pizza and 2/8 cheese pizza. How much is that altogether?'),
    denominator: 8, target: { numerator: 5, denominator: 8 }, equation: '3/8 + 2/8 = ?',
    hints: [text('두 분수의 분모가 모두 8로 같아요.', 'Both fractions have the same denominator: 8.'), text('분모는 그대로 두고 분자 3과 2를 더해 보세요.', 'Keep the denominator and add the numerators 3 and 2.')],
    explanation: text('같은 크기의 조각끼리는 분자를 더해요. 3/8 + 2/8 = 5/8이에요.', 'With equal-sized slices, add the numerators. 3/8 + 2/8 = 5/8.'),
  } : {
    id: 'pizza-v11-order-1-4-plus-2-4', stage: 2, stageName: stages.order,
    concept: text('같은 분모의 덧셈', 'Adding like denominators'),
    prompt: text('주문을 한 판에 합쳐서 준비해 주세요.', 'Combine the order on one serving pizza.'),
    story: text('손님이 피자 1/4판과 2/4판을 주문했어요. 모두 얼마일까요?', 'A customer orders 1/4 of a pizza and 2/4 of a pizza. How much is that altogether?'),
    denominator: 4, target: { numerator: 3, denominator: 4 }, equation: '1/4 + 2/4 = ?',
    hints: [text('두 분수의 분모가 모두 4로 같아요.', 'Both fractions have the same denominator: 4.'), text('분모는 그대로 두고 분자 1과 2를 더해 보세요.', 'Keep the denominator and add the numerators 1 and 2.')],
    explanation: text('같은 크기의 조각끼리는 분자를 더해요. 1/4 + 2/4 = 3/4이에요.', 'With equal-sized slices, add the numerators. 1/4 + 2/4 = 3/4.'),
  }

  let stageThree: PizzaQuestion
  if (difficulty === 'easy') {
    stageThree = {
      id: 'pizza-v11-challenge-compare-quarters', stage: 3, stageName: stages.challenge,
      concept: text('분수 비교', 'Comparing fractions'),
      prompt: text('2/4와 3/4 중 더 큰 분수를 피자로 만들어 보세요.', 'Build the larger fraction: 2/4 or 3/4.'),
      story: text('조각 크기가 같다면 더 많은 조각을 가진 분수가 더 커요.', 'When slices are the same size, the fraction with more slices is larger.'),
      denominator: 4, target: { numerator: 3, denominator: 4 }, equation: '2/4  ?  3/4',
      hints: [text('두 피자는 모두 4등분이에요.', 'Both pizzas are divided into 4 equal slices.'), text('2조각과 3조각 중 어느 쪽이 더 많은지 생각해 보세요.', 'Think about which is more: 2 slices or 3 slices.')],
      explanation: text('분모가 같을 때는 분자가 큰 분수가 더 커요. 3/4이 2/4보다 커요.', 'When denominators match, the larger numerator makes the larger fraction. 3/4 is greater than 2/4.'),
    }
  } else if (difficulty === 'medium') {
    stageThree = year >= 5 ? {
      id: 'pizza-v11-challenge-equivalent-half', stage: 3, stageName: stages.challenge,
      concept: text('동치분수', 'Equivalent fractions'),
      prompt: text('1/2과 같은 양을 8조각 피자로 만들어 보세요.', 'Build an amount equal to 1/2 using an 8-slice pizza.'),
      story: text('자르는 방법이 달라도 같은 양을 나타낼 수 있어요.', 'Different slice sizes can still show the same amount.'),
      denominator: 8, target: { numerator: 4, denominator: 8 }, equation: '1/2 = ?/8',
      hints: [text('피자의 절반은 전체 8조각의 절반이에요.', 'Half the pizza is half of all 8 slices.'), text('8의 절반인 4조각을 선택해 보세요.', 'Select 4 slices, which is half of 8.')],
      explanation: text('1/2과 4/8은 피자에서 같은 양을 나타내는 동치분수예요.', '1/2 and 4/8 are equivalent fractions because they show the same amount.'),
    } : {
      id: 'pizza-v11-challenge-thirds', stage: 3, stageName: stages.challenge,
      concept: text('분수 덧셈', 'Adding fractions'),
      prompt: text('1/3과 1/3을 합친 양을 만들어 보세요.', 'Build the amount made by 1/3 plus 1/3.'),
      denominator: 3, target: { numerator: 2, denominator: 3 }, equation: '1/3 + 1/3 = ?',
      hints: [text('두 분수는 같은 크기의 조각이에요.', 'The fractions use equal-sized slices.'), text('1조각과 1조각을 합치면 2조각이에요.', 'One slice plus one slice makes two slices.')],
      explanation: text('1/3 + 1/3 = 2/3이에요.', '1/3 + 1/3 = 2/3.'),
    }
  } else {
    stageThree = year >= 6 ? {
      id: 'pizza-v11-challenge-2-3-plus-1-6', stage: 3, stageName: stages.challenge,
      concept: text('다른 분모의 덧셈', 'Adding unlike denominators'),
      prompt: text('2/3와 1/6을 합친 양을 피자로 만들어 보세요.', 'Build the amount made by 2/3 plus 1/6.'),
      story: text('서로 다른 크기의 조각은 먼저 같은 크기로 바꿔야 해요.', 'Different-sized slices need a common size before we add them.'),
      denominator: 6, target: { numerator: 5, denominator: 6 }, equation: '2/3 + 1/6 = ?',
      hints: [text('2/3를 분모가 6인 분수로 바꿔 보세요.', 'Rewrite 2/3 with a denominator of 6.'), text('2/3는 4/6이에요. 이제 1/6을 더해 보세요.', '2/3 equals 4/6. Now add 1/6.')],
      explanation: text('2/3 = 4/6이고, 4/6 + 1/6 = 5/6이에요.', '2/3 = 4/6, and 4/6 + 1/6 = 5/6.'),
    } : {
      id: 'pizza-v11-challenge-1-2-plus-1-4', stage: 3, stageName: stages.challenge,
      concept: text('다른 분모의 덧셈', 'Adding unlike denominators'),
      prompt: text('1/2과 1/4을 합친 양을 피자로 만들어 보세요.', 'Build the amount made by 1/2 plus 1/4.'),
      denominator: 4, target: { numerator: 3, denominator: 4 }, equation: '1/2 + 1/4 = ?',
      hints: [text('1/2을 분모가 4인 분수로 바꿔 보세요.', 'Rewrite 1/2 with a denominator of 4.'), text('1/2는 2/4예요. 이제 1/4을 더해 보세요.', '1/2 equals 2/4. Now add 1/4.')],
      explanation: text('1/2 = 2/4이고, 2/4 + 1/4 = 3/4이에요.', '1/2 = 2/4, and 2/4 + 1/4 = 3/4.'),
    }
  }

  return [stageOne, stageTwo, stageThree]
}
