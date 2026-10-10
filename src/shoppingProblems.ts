import { adjustedMathLevel, normaliseMathLevel, profileMathLevel } from './mathLevels'
import type { AnswerRecord, Language, MathLevel, Profile } from './types'

export interface ShoppingText { ko: string; en: string }

export interface ShopProduct {
  id: string
  name: ShoppingText
  icon: string
  priceCents: number
  packSize: number
  measurement: {
    amount: number
    unit: 'item' | 'gram' | 'litre'
    priceBasis: number
    priceBasisLabel: ShoppingText
  }
  discountPercent?: number
}

export interface CartCondition {
  productId: string
  min?: number
  max?: number
  exact?: number
}

export interface ShoppingQuestion {
  id: string
  objectiveId: string
  level: MathLevel
  curriculumBand: 'core' | 'extension'
  stage: 1 | 2 | 3
  stageName: ShoppingText
  concept: ShoppingText
  prompt: ShoppingText
  story: ShoppingText
  budgetCents: number
  products: ShopProduct[]
  conditions: CartCondition[]
  conditionText: ShoppingText[]
  hints: [ShoppingText, ShoppingText]
  explanation: ShoppingText
  success: ShoppingText
  bestValueProductId?: string
  exactTotalCents?: number
}

export interface CartTotals {
  subtotalCents: number
  discountCents: number
  totalCents: number
  remainingCents: number
}

const tx = (ko: string, en: string): ShoppingText => ({ ko, en })
export const shoppingLocalise = (value: ShoppingText, language: Language) => value[language]
export const formatNZD = (cents: number, language: Language) => {
  const amount = new Intl.NumberFormat(language === 'ko' ? 'ko-KR' : 'en-NZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(cents) / 100)
  return `${cents < 0 ? '-' : ''}NZ$${amount}`
}

const measured = (amount: number, unit: ShopProduct['measurement']['unit'], priceBasis: number, ko: string, en: string): ShopProduct['measurement'] => ({ amount, unit, priceBasis, priceBasisLabel: tx(ko, en) })
const catalogue = {
  apple: (priceCents = 125): ShopProduct => ({ id: 'apple', name: tx('사과', 'Apples'), icon: '🍎', priceCents, packSize: 1, measurement: measured(1, 'item', 1, '개', 'item') }),
  milk: (priceCents = 320): ShopProduct => ({ id: 'milk', name: tx('우유', 'Milk'), icon: '🥛', priceCents, packSize: 1, measurement: measured(1, 'litre', 1, 'L', 'L') }),
  bread: (priceCents = 380): ShopProduct => ({ id: 'bread', name: tx('빵', 'Bread'), icon: '🍞', priceCents, packSize: 1, measurement: measured(1, 'item', 1, '봉지', 'loaf') }),
  eggs: (priceCents = 540, packSize = 6): ShopProduct => ({ id: `eggs-${packSize}`, name: tx(`달걀 ${packSize}개`, `${packSize} eggs`), icon: '🥚', priceCents, packSize, measurement: measured(packSize, 'item', 1, '개', 'egg') }),
  banana: (priceCents = 90): ShopProduct => ({ id: 'banana', name: tx('바나나', 'Bananas'), icon: '🍌', priceCents, packSize: 1, measurement: measured(1, 'item', 1, '개', 'item') }),
  cheese: (priceCents = 600, packSize = 500): ShopProduct => ({ id: `cheese-${packSize}`, name: tx(`치즈 ${packSize}g`, `${packSize}g cheese`), icon: '🧀', priceCents, packSize, measurement: measured(packSize, 'gram', 100, '100g', '100g') }),
  cereal: (priceCents = 750, packSize = 750): ShopProduct => ({ id: `cereal-${packSize}`, name: tx(`시리얼 ${packSize}g`, `${packSize}g cereal`), icon: '🥣', priceCents, packSize, measurement: measured(packSize, 'gram', 100, '100g', '100g') }),
  juice: (priceCents = 480, packSize = 1): ShopProduct => ({ id: `juice-${packSize}`, name: tx(`주스 ${packSize}L`, `${packSize}L juice`), icon: '🧃', priceCents, packSize, measurement: measured(packSize, 'litre', 1, 'L', 'L') }),
}

const discounted = (product: ShopProduct, discountPercent: number): ShopProduct => ({ ...product, discountPercent })
const stages = [tx('', ''), tx('1단계 · 쇼핑', 'Stage 1 · Shopping'), tx('2단계 · 알뜰 쇼핑', 'Stage 2 · Smart Shopper'), tx('3단계 · 쇼핑 마스터', 'Stage 3 · Shopping Master')] as const

export function calculateCart(question: ShoppingQuestion, cart: Record<string, number>): CartTotals {
  let subtotalCents = 0
  let totalCents = 0
  for (const product of question.products) {
    const quantity = Math.max(0, Math.trunc(cart[product.id] ?? 0))
    subtotalCents += product.priceCents * quantity
    const salePrice = product.discountPercent
      ? Math.round(product.priceCents * (100 - product.discountPercent) / 100)
      : product.priceCents
    totalCents += salePrice * quantity
  }
  return { subtotalCents, discountCents: subtotalCents - totalCents, totalCents, remainingCents: question.budgetCents - totalCents }
}

export function productUnitPriceCents(product: ShopProduct): number {
  const salePrice = product.discountPercent
    ? Math.round(product.priceCents * (100 - product.discountPercent) / 100)
    : product.priceCents
  return Math.round(salePrice * product.measurement.priceBasis / product.measurement.amount)
}

export const productUnitPriceLabel = (product: ShopProduct, language: Language) => shoppingLocalise(product.measurement.priceBasisLabel, language)

export function validateShoppingCart(question: ShoppingQuestion, cart: Record<string, number>): boolean {
  if (!question.products.some((product) => (cart[product.id] ?? 0) > 0)) return false
  const totals = calculateCart(question, cart)
  if (totals.totalCents > question.budgetCents) return false
  if (question.exactTotalCents !== undefined && totals.totalCents !== question.exactTotalCents) return false
  if (question.bestValueProductId) {
    const selected = question.products.filter((product) => (cart[product.id] ?? 0) > 0)
    if (selected.length !== 1 || selected[0].id !== question.bestValueProductId) return false
  }
  return question.conditions.every((condition) => {
    const quantity = cart[condition.productId] ?? 0
    return (condition.exact === undefined || quantity === condition.exact)
      && (condition.min === undefined || quantity >= condition.min)
      && (condition.max === undefined || quantity <= condition.max)
  })
}

type ScenarioInput = Omit<ShoppingQuestion, 'id' | 'level' | 'curriculumBand' | 'stageName'> & { slug: string }

const scenario = (stage: 1 | 2 | 3, slug: string, objectiveId: string, concept: ShoppingText, prompt: ShoppingText,
  story: ShoppingText, budgetCents: number, products: ShopProduct[], conditions: CartCondition[], conditionText: ShoppingText[],
  hints: [ShoppingText, ShoppingText], explanation: ShoppingText, success: ShoppingText,
  extra: Pick<ShoppingQuestion, 'bestValueProductId' | 'exactTotalCents'> = {}): ScenarioInput => ({
  stage, slug, objectiveId, concept, prompt, story, budgetCents, products, conditions, conditionText, hints, explanation, success, ...extra,
})

function foundation(year7: boolean): ScenarioInput[] {
  return [
    scenario(1, year7 ? 'pantry-count' : 'fruit-count', 'money-addition', tx('돈 더하기', 'Adding money'),
      tx(year7 ? '빵 1개와 우유 2병을 담으세요.' : '사과 2개와 우유 1병을 담으세요.', year7 ? 'Add 1 bread and 2 bottles of milk.' : 'Add 2 apples and 1 bottle of milk.'),
      tx('가격표를 보고 예산 안에서 정확한 수량을 골라요.', 'Read the shelf labels and choose the exact quantities within budget.'),
      year7 ? 1100 : 700, year7 ? [catalogue.bread(), catalogue.milk(), catalogue.apple()] : [catalogue.apple(), catalogue.milk(), catalogue.banana()],
      year7 ? [{ productId: 'bread', exact: 1 }, { productId: 'milk', exact: 2 }, { productId: 'apple', exact: 0 }] : [{ productId: 'apple', exact: 2 }, { productId: 'milk', exact: 1 }, { productId: 'banana', exact: 0 }],
      year7 ? [tx('빵은 1개예요.', 'Choose 1 bread.'), tx('우유는 2병이에요.', 'Choose 2 bottles of milk.')] : [tx('사과는 2개예요.', 'Choose 2 apples.'), tx('우유는 1병이에요.', 'Choose 1 bottle of milk.')],
      [tx('필요한 물건을 하나씩 먼저 담으세요.', 'Add each required item first.'), tx('수량과 합계를 다시 확인하세요.', 'Check each quantity and the total.')],
      tx('각 상품의 가격에 수량을 곱한 뒤 더해요.', 'Multiply each price by its quantity, then add.'), tx('목록과 예산을 모두 지켰어요!', 'You matched the list and stayed on budget!')),
    scenario(2, 'simple-change', 'change', tx('거스름돈', 'Change'), tx('바나나 3개를 사고 계산대로 가세요.', 'Buy 3 bananas and go to checkout.'),
      tx('예산에서 산 물건의 값을 빼면 잔액을 알 수 있어요.', 'Subtract the purchase from the budget to find the balance.'), 500,
      [catalogue.banana(), catalogue.apple()], [{ productId: 'banana', exact: 3 }, { productId: 'apple', exact: 0 }], [tx('바나나 3개', '3 bananas'), tx('NZ$5 안에서 구매', 'Stay within NZ$5')],
      [tx('90센트를 세 번 더해요.', 'Add 90 cents three times.'), tx('500센트에서 합계를 빼세요.', 'Subtract the total from 500 cents.')],
      tx('NZ$5.00에서 NZ$2.70을 빼면 NZ$2.30이 남아요.', 'NZ$5.00 − NZ$2.70 leaves NZ$2.30.'), tx('거스름돈까지 정확해요!', 'Your change is correct!')),
    scenario(3, 'lunch-list', 'constraints', tx('구매 조건', 'Purchase conditions'), tx('점심 목록을 모두 만족시키세요.', 'Satisfy the whole lunch list.'),
      tx('빵 1개, 치즈 1팩, 과일 2개가 필요해요.', 'You need 1 bread, 1 cheese pack and 2 pieces of fruit.'), 1400,
      [catalogue.bread(), catalogue.cheese(600, 500), catalogue.apple(), catalogue.juice()],
      [{ productId: 'bread', exact: 1 }, { productId: 'cheese-500', exact: 1 }, { productId: 'apple', exact: 2 }, { productId: 'juice-1', exact: 0 }],
      [tx('빵 1개와 치즈 1팩', '1 bread and 1 cheese pack'), tx('사과 2개, 주스는 제외', '2 apples and no juice')],
      [tx('조건마다 장바구니 수량을 확인해요.', 'Check the cart quantity for every condition.'), tx('필요하지 않은 물건도 없는지 확인해요.', 'Check that no extra item is included.')],
      tx('모든 수량 조건과 예산을 함께 확인해야 해요.', 'Every quantity condition and the budget must all be checked.'), tx('점심 목록을 완성했어요!', 'Lunch shopping complete!')),
  ]
}

function core(year7: boolean): ScenarioInput[] {
  const milk = discounted(catalogue.milk(400), 25)
  return [
    scenario(1, year7 ? 'balanced-breakfast' : 'breakfast', 'multi-item-total', tx('여러 가격 합산', 'Multi-item totals'),
      tx(year7 ? '시리얼 1상자, 우유 2병, 바나나 4개를 담으세요.' : '시리얼 1상자, 우유 1병, 바나나 2개를 담으세요.', year7 ? 'Add 1 cereal, 2 milks and 4 bananas.' : 'Add 1 cereal, 1 milk and 2 bananas.'),
      tx('아침 식사 목록의 총액과 잔액을 계산해요.', 'Calculate the breakfast total and remaining budget.'), year7 ? 1900 : 1400,
      [catalogue.cereal(), catalogue.milk(), catalogue.banana()], year7 ? [{ productId: 'cereal-750', exact: 1 }, { productId: 'milk', exact: 2 }, { productId: 'banana', exact: 4 }] : [{ productId: 'cereal-750', exact: 1 }, { productId: 'milk', exact: 1 }, { productId: 'banana', exact: 2 }],
      year7 ? [tx('시리얼 1, 우유 2', '1 cereal and 2 milks'), tx('바나나 4', '4 bananas')] : [tx('시리얼 1, 우유 1', '1 cereal and 1 milk'), tx('바나나 2', '2 bananas')],
      [tx('같은 상품은 가격×수량으로 계산해요.', 'Use price × quantity for repeated items.'), tx('상품별 소계를 마지막에 더하세요.', 'Add the item subtotals last.')],
      tx('상품별 소계를 더하면 장바구니 총액이 됩니다.', 'Adding each item subtotal gives the cart total.'), tx('아침 장보기를 완성했어요!', 'Breakfast shopping complete!')),
    scenario(2, 'quarter-off', 'percent-discount', tx('25% 할인', '25% discount'), tx('25% 할인 우유 2병만 담아 결제하세요.', 'Buy exactly 2 bottles of milk at 25% off.'),
      tx('할인액과 할인 후 가격을 계산대에서 확인해요.', 'Check the saving and sale total at checkout.'), 700, [milk, catalogue.juice()],
      [{ productId: 'milk', exact: 2 }, { productId: 'juice-1', exact: 0 }], [tx('우유 2병', '2 bottles of milk'), tx('각 우유는 25% 할인', 'Each milk is 25% off')],
      [tx('NZ$4의 25%는 NZ$1이에요.', '25% of NZ$4 is NZ$1.'), tx('한 병은 NZ$3, 두 병은 NZ$6이에요.', 'One bottle is NZ$3, so two cost NZ$6.')],
      tx('NZ$8.00에서 25%인 NZ$2.00을 할인해 NZ$6.00이에요.', '25% of NZ$8.00 is NZ$2.00, so the sale total is NZ$6.00.'), tx('할인 계산이 정확해요!', 'Discount calculated correctly!')),
    scenario(3, 'family-shop', 'multi-constraint', tx('여러 조건', 'Multiple constraints'), tx('가족 목록을 예산 안에서 완성하세요.', 'Complete the family list within budget.'),
      tx('달걀 12개 이상, 빵 1개, 우유 1병이 필요해요.', 'You need at least 12 eggs, 1 bread and 1 milk.'), 1800,
      [catalogue.eggs(540, 6), catalogue.bread(), catalogue.milk(), catalogue.apple()],
      [{ productId: 'eggs-6', exact: 2 }, { productId: 'bread', exact: 1 }, { productId: 'milk', exact: 1 }, { productId: 'apple', exact: 0 }],
      [tx('달걀 6개 팩 2개', '2 packs of 6 eggs'), tx('빵 1개와 우유 1병', '1 bread and 1 milk')],
      [tx('12÷6으로 달걀 팩 수를 찾아요.', 'Use 12 ÷ 6 to find the egg packs.'), tx('네 조건과 예산을 모두 확인하세요.', 'Check all four conditions and the budget.')],
      tx('필요한 개수를 팩 크기로 나눈 뒤 나머지 상품을 더해요.', 'Divide the needed amount by the pack size, then add the other items.'), tx('가족 목록의 모든 조건을 만족했어요!', 'Every family-list condition is met!')),
  ]
}

function advanced(year7: boolean): ScenarioInput[] {
  const juice = discounted(catalogue.juice(600), 20)
  return [
    scenario(1, year7 ? 'team-supplies' : 'class-picnic', 'multi-step-budget', tx('다단계 예산', 'Multi-step budgeting'),
      tx(year7 ? '팀 준비물 목록을 정확히 담으세요.' : '학급 소풍 목록을 정확히 담으세요.', year7 ? 'Build the exact team supplies order.' : 'Build the exact class picnic order.'),
      tx(year7 ? '시리얼 2상자, 우유 3병, 바나나 5개가 필요해요.' : '빵 2개, 주스 3병, 사과 4개가 필요해요.', year7 ? 'You need 2 cereals, 3 milks and 5 bananas.' : 'You need 2 breads, 3 juices and 4 apples.'),
      year7 ? 3000 : 2800, year7 ? [catalogue.cereal(), catalogue.milk(), catalogue.banana(), catalogue.cheese()] : [catalogue.bread(), catalogue.juice(), catalogue.apple(), catalogue.cheese()],
      year7 ? [{ productId: 'cereal-750', exact: 2 }, { productId: 'milk', exact: 3 }, { productId: 'banana', exact: 5 }, { productId: 'cheese-500', exact: 0 }] : [{ productId: 'bread', exact: 2 }, { productId: 'juice-1', exact: 3 }, { productId: 'apple', exact: 4 }, { productId: 'cheese-500', exact: 0 }],
      year7 ? [tx('시리얼 2, 우유 3', '2 cereals and 3 milks'), tx('바나나 5, 치즈 제외', '5 bananas and no cheese')] : [tx('빵 2, 주스 3', '2 breads and 3 juices'), tx('사과 4, 치즈 제외', '4 apples and no cheese')],
      [tx('상품별 소계를 표처럼 정리해요.', 'Organise each item subtotal like a table.'), tx('합계와 예산의 차이가 잔액이에요.', 'The difference between budget and total is the balance.')],
      tx('수량별 소계, 전체 합계, 잔액의 순서로 계산해요.', 'Calculate quantity subtotals, the grand total, then the balance.'), tx('다단계 예산을 정확히 관리했어요!', 'You managed the multi-step budget!')),
    scenario(2, 'sale-and-change', 'discount-change', tx('할인과 거스름돈', 'Discount and change'), tx('20% 할인 주스 2병과 빵 1개를 담으세요.', 'Add 2 juices at 20% off and 1 bread.'),
      tx('할인 후 합계를 구한 다음 예산에서 빼야 해요.', 'Find the discounted total before subtracting it from the budget.'), 1500,
      [juice, catalogue.bread(), catalogue.apple()], [{ productId: 'juice-1', exact: 2 }, { productId: 'bread', exact: 1 }, { productId: 'apple', exact: 0 }],
      [tx('20% 할인 주스 2병', '2 juices at 20% off'), tx('빵 1개, 사과 제외', '1 bread and no apples')],
      [tx('NZ$6의 20%는 NZ$1.20이에요.', '20% of NZ$6 is NZ$1.20.'), tx('주스 두 병의 할인 후 값에 빵 값을 더해요.', 'Add the bread to the sale price of two juices.')],
      tx('주스는 병당 NZ$4.80, 두 병과 빵은 NZ$13.40이며 NZ$1.60이 남아요.', 'Juice is NZ$4.80 each; two plus bread cost NZ$13.40, leaving NZ$1.60.'), tx('할인과 잔액을 두 단계로 해결했어요!', 'You solved the discount and balance in two steps!')),
    scenario(3, year7 ? 'club-constraints' : 'party-constraints', 'compound-constraints', tx('복합 구매 전략', 'Compound purchase strategy'),
      tx('모든 모임 조건을 만족하는 장바구니를 만드세요.', 'Build a cart that satisfies every event condition.'),
      tx(year7 ? '달걀 18개 이상, 주스 2L, 빵 2개가 필요하고 시리얼은 사지 않아요.' : '달걀 12개, 주스 2L 이상, 빵 1개가 필요하고 치즈는 사지 않아요.', year7 ? 'You need at least 18 eggs, 2L juice and 2 breads, with no cereal.' : 'You need 12 eggs, at least 2L juice and 1 bread, with no cheese.'),
      year7 ? 3300 : 2500, year7 ? [catalogue.eggs(540, 6), catalogue.juice(850, 2), catalogue.bread(), catalogue.cereal()] : [catalogue.eggs(540, 6), catalogue.juice(480, 1), catalogue.bread(), catalogue.cheese()],
      year7 ? [{ productId: 'eggs-6', exact: 3 }, { productId: 'juice-2', exact: 1 }, { productId: 'bread', exact: 2 }, { productId: 'cereal-750', exact: 0 }] : [{ productId: 'eggs-6', exact: 2 }, { productId: 'juice-1', exact: 2 }, { productId: 'bread', exact: 1 }, { productId: 'cheese-500', exact: 0 }],
      year7 ? [tx('달걀 6개 팩 3개, 주스 2L 1병', '3 six-egg packs and 1 two-litre juice'), tx('빵 2개, 시리얼 제외', '2 breads and no cereal')] : [tx('달걀 6개 팩 2개, 주스 1L 2병', '2 six-egg packs and 2 one-litre juices'), tx('빵 1개, 치즈 제외', '1 bread and no cheese')],
      [tx('최소 수량을 팩 크기로 바꿔 적으세요.', 'Convert each minimum amount into pack quantities.'), tx('필수·제외·예산 조건을 하나씩 체크하세요.', 'Check required, excluded and budget conditions one by one.')],
      tx('정답은 값 하나가 아니라 모든 수량·제외·예산 조건을 만족하는 구매 전략이에요.', 'The solution is not one number: the strategy must satisfy every quantity, exclusion and budget condition.'), tx('복합 조건을 모두 해결했어요!', 'Every compound condition is satisfied!')),
  ]
}

function high(level: 'expert' | 'master', year7: boolean): ScenarioInput[] {
  const master = level === 'master'
  const eggs6 = catalogue.eggs(540, 6)
  const eggs12 = catalogue.eggs(960, 12)
  const cheese250 = catalogue.cheese(360, 250)
  const cheese500 = catalogue.cheese(600, 500)
  return [
    scenario(1, year7 ? 'expedition-budget' : 'camp-budget', 'budget-modelling', tx('예산 모델링', 'Budget modelling'),
      tx('준비 목록의 조건을 모두 만족시키세요.', 'Meet every condition on the supplies list.'),
      tx(master ? (year7 ? '캠프에는 달걀 24개, 빵 3개, 우유 4병이 정확히 필요해요.' : '캠프에는 달걀 18개, 빵 2개, 우유 3병이 정확히 필요해요.') : (year7 ? '원정대에는 달걀 18개, 빵 2개, 우유 3병이 필요해요.' : '모임에는 달걀 12개, 빵 2개, 우유 2병이 필요해요.'), master ? (year7 ? 'Camp needs exactly 24 eggs, 3 breads and 4 milks.' : 'Camp needs exactly 18 eggs, 2 breads and 3 milks.') : (year7 ? 'The expedition needs 18 eggs, 2 breads and 3 milks.' : 'The event needs 12 eggs, 2 breads and 2 milks.')),
      master ? (year7 ? 4700 : 3400) : (year7 ? 3500 : 2500), [eggs6, catalogue.bread(), catalogue.milk(), catalogue.apple()],
      [{ productId: 'eggs-6', exact: master ? (year7 ? 4 : 3) : (year7 ? 3 : 2) }, { productId: 'bread', exact: master ? (year7 ? 3 : 2) : 2 }, { productId: 'milk', exact: master ? (year7 ? 4 : 3) : (year7 ? 3 : 2) }, { productId: 'apple', exact: 0 }],
      [tx('팩 크기를 필요한 개수로 변환', 'Convert pack size to required count'), tx('정확한 수량과 예산을 동시 검증', 'Verify exact quantities and budget together')],
      [tx('각 필요량÷팩 크기로 먼저 수량을 정해요.', 'First divide each need by its pack size.'), tx('센트 단위 소계를 더하고 예산과 비교하세요.', 'Add subtotals in cents and compare with the budget.')],
      tx('단위 변환과 예산 계산을 분리한 뒤 마지막에 조건을 함께 검증해요.', 'Separate unit conversion from budgeting, then verify all conditions together.'), tx('정확한 예산 모델을 만들었어요!', 'You built an exact budget model!')),
    scenario(2, 'unit-price', 'unit-price', tx('단위 가격 비교', 'Unit-price comparison'), tx('달걀 12개를 사는 가장 경제적인 한 팩을 고르세요.', 'Choose the best-value single pack for 12 eggs.'),
      tx('팩 가격이 아니라 달걀 1개당 가격을 정확히 비교해요.', 'Compare the exact cost per egg, not just the pack price.'), 1200,
      [eggs6, eggs12], [], [tx('정확히 한 팩 선택', 'Choose exactly one pack'), tx('12개를 충족하는 최저 단가', 'Meet 12 eggs at the lowest unit price')],
      [tx('가격÷개수로 한 개당 가격을 구해요.', 'Divide price by count for cost per egg.'), tx('6개 팩은 90c/개, 12개 팩은 80c/개예요.', 'The 6-pack is 90c each; the 12-pack is 80c each.')],
      tx('NZ$9.60÷12=80c로, NZ$5.40÷6=90c보다 저렴해요.', 'NZ$9.60÷12=80c, cheaper than NZ$5.40÷6=90c.'), tx('단위 가격으로 더 좋은 선택을 찾았어요!', 'You found the better value using unit price!'), { bestValueProductId: 'eggs-12' }),
    scenario(3, 'sale-strategy', 'compound-discount-constraints', tx(master ? '확장 구매 최적화' : '복합 할인 전략', master ? 'Extension purchase optimisation' : 'Compound discount strategy'),
      tx('할인과 최소 수량을 모두 만족하는 전략을 만드세요.', 'Build a strategy satisfying the discount and minimum amounts.'),
      tx(master ? '치즈 1kg 이상, 주스 3L, 빵 2개가 필요합니다. 500g 치즈는 20% 할인입니다.' : '치즈 500g 이상, 주스 2L, 빵 1개가 필요합니다. 500g 치즈는 20% 할인입니다.', master ? 'You need at least 1kg cheese, 3L juice and 2 breads. The 500g cheese is 20% off.' : 'You need at least 500g cheese, 2L juice and 1 bread. The 500g cheese is 20% off.'),
      master ? 3300 : 2000, [cheese250, discounted(cheese500, 20), catalogue.juice(), catalogue.bread()],
      [{ productId: 'cheese-250', exact: 0 }, { productId: 'cheese-500', exact: master ? 2 : 1 }, { productId: 'juice-1', exact: master ? 3 : 2 }, { productId: 'bread', exact: master ? 2 : 1 }],
      master ? [tx('할인 치즈 500g 2팩, 작은 팩 제외', '2 discounted 500g cheese packs; no small pack'), tx('주스 3L와 빵 2개', '3L juice and 2 breads')] : [tx('할인 치즈 500g 1팩, 작은 팩 제외', '1 discounted 500g cheese pack; no small pack'), tx('주스 2L와 빵 1개', '2L juice and 1 bread')],
      [tx('용량 조건을 먼저 팩 수로 바꾸세요.', 'Convert the amount requirements into pack counts first.'), tx('할인 가격을 적용한 뒤 총액과 예산을 확인하세요.', 'Apply the discount before checking total and budget.')],
      tx('단위 가격, 할인, 최소 수량, 예산을 모두 통과해야 올바른 전략이에요.', 'A valid strategy must pass unit-price, discount, minimum-amount and budget checks.'), tx('복합 구매 전략을 완성했어요!', 'Compound shopping strategy complete!')),
  ]
}

const scenariosFor = (level: MathLevel, year7: boolean) => level === 'foundation' ? foundation(year7) : level === 'core' ? core(year7) : level === 'advanced' ? advanced(year7) : high(level, year7)

const materialiseShoppingQuestions = (level: MathLevel, year7: boolean): ShoppingQuestion[] => scenariosFor(level, year7).map((item) => {
  const { slug, ...question } = item
  return {
    ...question, id: `shopping-v12-${year7 ? 'y7' : 'y5'}-${level}-${slug}`, level,
    curriculumBand: level === 'master' ? 'extension' : 'core', stageName: stages[question.stage],
  }
})

export function resolveShoppingDifficulty(profile: Profile, history: AnswerRecord[]): MathLevel {
  const override = profile.unitDifficulties.shopping
  const configured = override && override !== 'auto' ? normaliseMathLevel(override) : profileMathLevel(profile)
  return profile.adaptiveDifficulty || override === 'auto' ? adjustedMathLevel(configured, history, 'shopping') : configured
}

export function buildShoppingQuestions(profile: Profile, history: AnswerRecord[]): ShoppingQuestion[] {
  const level = resolveShoppingDifficulty(profile, history)
  const year7 = (profile.year ?? 5) >= 7
  return materialiseShoppingQuestions(level, year7)
}

export function shoppingQuestionsFromQuestionId(questionId: string): ShoppingQuestion[] | null {
  const match = /^shopping-v12-(y5|y7)-(foundation|core|advanced|expert|master)-(.+)$/.exec(questionId)
  if (!match) return null
  const [, yearBand, level, slug] = match
  const questions = materialiseShoppingQuestions(level as MathLevel, yearBand === 'y7')
  return questions.some((question) => question.id === questionId && question.id.endsWith(`-${slug}`)) ? questions : null
}

export function shoppingReviewPrompt(questionId: string, language: Language): string | null {
  const question = shoppingQuestionsFromQuestionId(questionId)?.find((candidate) => candidate.id === questionId)
  return question ? shoppingLocalise(question.prompt, language) : null
}
