import { useId } from 'react'

interface Point { x: number; y: number }

const pointOnCircle = (angle: number, radius: number): Point => {
  const radians = angle * Math.PI / 180
  return { x: 120 + Math.cos(radians) * radius, y: 120 + Math.sin(radians) * radius }
}

export function pizzaSlicePath(index: number, denominator: number, radius = 91): string {
  const startAngle = -90 + index * 360 / denominator
  const endAngle = -90 + (index + 1) * 360 / denominator
  const start = pointOnCircle(startAngle, radius)
  const end = pointOnCircle(endAngle, radius)
  const largeArc = 360 / denominator > 180 ? 1 : 0
  return `M 120 120 L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y} Z`
}

export function InteractivePizza({ denominator, selected, onToggle, disabled = false, feedback, sliceLabel }: {
  denominator: number
  selected: Set<number>
  onToggle: (index: number) => void
  disabled?: boolean
  feedback?: 'correct' | 'incorrect' | null
  sliceLabel: string
}) {
  const id = useId().replace(/:/g, '')
  return <div className={`interactive-pizza ${feedback ?? ''}`}>
    <svg viewBox="0 0 240 240" role="group" aria-label={`${denominator} ${sliceLabel}`}>
      <defs>
        <radialGradient id={`${id}-cheese`} cx="45%" cy="40%">
          <stop offset="0" stopColor="#ffe79a" /><stop offset="1" stopColor="#f5bd4f" />
        </radialGradient>
        <filter id={`${id}-shadow`} x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#6f3f20" floodOpacity=".25" /></filter>
      </defs>
      <circle cx="120" cy="120" r="103" fill="#c9853b" filter={`url(#${id}-shadow)`} />
      <circle cx="120" cy="120" r="94" fill="#eaa64d" />
      {Array.from({ length: denominator }, (_, index) => {
        const start = -90 + index * 360 / denominator
        const middle = start + 180 / denominator
        const offset = selected.has(index) ? 8 : 0
        const radians = middle * Math.PI / 180
        const topping = pointOnCircle(middle, 55)
        return <g
          key={index}
          className={`svg-slice ${selected.has(index) ? 'selected' : ''}`}
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-label={`${sliceLabel} ${index + 1}`}
          aria-pressed={selected.has(index)}
          aria-disabled={disabled}
          transform={`translate(${Math.cos(radians) * offset} ${Math.sin(radians) * offset})`}
          onClick={() => { if (!disabled) onToggle(index) }}
          onKeyDown={(event) => {
            if (!disabled && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); onToggle(index) }
          }}
        >
          <path d={pizzaSlicePath(index, denominator)} fill={`url(#${id}-cheese)`} />
          <circle cx={topping.x} cy={topping.y} r={denominator > 6 ? 5 : 7} className="pepperoni" />
          <circle cx={pointOnCircle(middle - 10, 35).x} cy={pointOnCircle(middle - 10, 35).y} r="3.5" className="olive" />
          <path d={`M ${pointOnCircle(middle + 8, 70).x - 4} ${pointOnCircle(middle + 8, 70).y} q 5 -5 10 0`} className="pepper" />
        </g>
      })}
      <circle cx="120" cy="120" r="91" fill="none" stroke="#b86c31" strokeWidth="3" pointerEvents="none" />
    </svg>
  </div>
}
