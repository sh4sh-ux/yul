import { fractionsEqual, type Fraction } from './fractions'
import { recommendedLevelFromScore } from './mathLevels'
import type { Language, MathLevel } from './types'
import type { LocalisedText } from './pizzaProblems'

export interface DiagnosticOption { label: LocalisedText; value: Fraction }
export interface DiagnosticQuestion { id: string; level: MathLevel; prompt: LocalisedText; options: DiagnosticOption[]; answer: Fraction }
const tx = (ko: string, en: string): LocalisedText => ({ ko, en })
const option = (ko: string, en: string, numerator: number, denominator = 1): DiagnosticOption => ({ label: tx(ko, en), value: { numerator, denominator } })
const q = (id: string, level: MathLevel, ko: string, en: string, answer: Fraction, options: DiagnosticOption[]): DiagnosticQuestion => ({ id, level, prompt: tx(ko, en), answer, options })

const shared: DiagnosticQuestion[] = [
  q('d-part', 'foundation', '3/4에서 분자는 무엇인가요?', 'What is the numerator in 3/4?', { numerator: 3, denominator: 1 }, [option('3', '3', 3), option('4', '4', 4), option('7', '7', 7)]),
  q('d-equivalent', 'core', '1/2과 같은 분수는?', 'Which fraction equals 1/2?', { numerator: 4, denominator: 8 }, [option('2/8', '2/8', 2, 8), option('4/8', '4/8', 4, 8), option('6/8', '6/8', 6, 8)]),
  q('d-percent', 'advanced', '0.75를 백분율로 나타내면?', 'Write 0.75 as a percentage.', { numerator: 75, denominator: 1 }, [option('7.5%', '7.5%', 75, 10), option('75%', '75%', 75), option('750%', '750%', 750)]),
  q('d-unlike', 'expert', '1/3 + 1/4은?', 'What is 1/3 + 1/4?', { numerator: 7, denominator: 12 }, [option('2/7', '2/7', 2, 7), option('7/12', '7/12', 7, 12), option('1/2', '1/2', 1, 2)]),
  q('d-compound', 'master', '전체의 80% 중 3/4은 전체의 얼마인가요?', 'What is 3/4 of 80% of a whole?', { numerator: 3, denominator: 5 }, [option('60%', '60%', 3, 5), option('75%', '75%', 3, 4), option('80%', '80%', 4, 5)]),
]

const year5: DiagnosticQuestion[] = [
  q('y5-remainder', 'foundation', '8조각 중 3조각을 먹으면 몇 조각 남나요?', 'If 3 of 8 slices are eaten, how many remain?', { numerator: 5, denominator: 1 }, [option('3', '3', 3), option('5', '5', 5), option('8', '8', 8)]),
  q('y5-decimal', 'core', '1/4을 소수로 나타내면?', 'Write 1/4 as a decimal.', { numerator: 1, denominator: 4 }, [option('0.4', '0.4', 2, 5), option('0.25', '0.25', 1, 4), option('2.5', '2.5', 5, 2)]),
  q('y5-multistep', 'advanced', '12개의 1/3을 나눠 주고 2개를 더 준비하면 모두 몇 개인가요?', 'Share 1/3 of 12, then prepare 2 more. How many altogether?', { numerator: 6, denominator: 1 }, [option('4', '4', 4), option('6', '6', 6), option('8', '8', 8)]),
  q('y5-reason', 'expert', '3/4판의 2/3를 먹었습니다. 한 판의 얼마인가요?', 'You eat 2/3 of 3/4 of a pizza. What fraction of a whole?', { numerator: 1, denominator: 2 }, [option('1/2', '1/2', 1, 2), option('5/7', '5/7', 5, 7), option('2/3', '2/3', 2, 3)]),
  q('y5-reverse', 'master', '어떤 수의 25%가 6입니다. 그 수는?', '25% of a number is 6. What is the number?', { numerator: 24, denominator: 1 }, [option('12', '12', 12), option('18', '18', 18), option('24', '24', 24)]),
]

const year7: DiagnosticQuestion[] = [
  q('y7-order', 'foundation', '0.6과 5/8 중 더 큰 수는?', 'Which is greater: 0.6 or 5/8?', { numerator: 5, denominator: 8 }, [option('0.6', '0.6', 3, 5), option('5/8', '5/8', 5, 8), option('같음', 'Equal', 1, 1)]),
  q('y7-ratio', 'core', '빨강:파랑이 2:3일 때 빨강은 전체의 얼마인가요?', 'If red:blue is 2:3, what fraction is red?', { numerator: 2, denominator: 5 }, [option('2/3', '2/3', 2, 3), option('2/5', '2/5', 2, 5), option('3/5', '3/5', 3, 5)]),
  q('y7-rate', 'advanced', '$80에서 15% 할인한 가격은?', 'What is $80 after a 15% discount?', { numerator: 68, denominator: 1 }, [option('$65', '$65', 65), option('$68', '$68', 68), option('$72', '$72', 72)]),
  q('y7-reverse', 'expert', '할인 후 $72가 원래 가격의 80%라면 원래 가격은?', 'If $72 is 80% of the original price, what was the original?', { numerator: 90, denominator: 1 }, [option('$86.40', '$86.40', 432, 5), option('$90', '$90', 90), option('$96', '$96', 96)]),
  q('y7-compound', 'master', '전체의 3/4 중 20%를 제외하면 전체의 얼마가 남나요?', 'Remove 20% from 3/4 of a whole. What fraction of the whole remains?', { numerator: 3, denominator: 5 }, [option('55%', '55%', 11, 20), option('60%', '60%', 3, 5), option('80%', '80%', 4, 5)]),
]

export function diagnosticQuestions(year: number | null): DiagnosticQuestion[] { return [...shared, ...((year ?? 5) >= 7 ? year7 : year5)] }
export function checkDiagnosticAnswer(question: DiagnosticQuestion, optionIndex: number): boolean { return fractionsEqual(question.options[optionIndex].value, question.answer) }
export function scoreDiagnostic(questions: DiagnosticQuestion[], answers: number[]): { score: number; recommendedLevel: MathLevel } {
  const score = questions.reduce((sum, question, index) => sum + (checkDiagnosticAnswer(question, answers[index]) ? 1 : 0), 0)
  return { score, recommendedLevel: recommendedLevelFromScore(score, questions.length) }
}
export const diagnosticText = (value: LocalisedText, language: Language) => value[language]
