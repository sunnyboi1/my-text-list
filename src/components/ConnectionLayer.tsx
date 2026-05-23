import type { Scenario } from '../types'

const CARD_W = 320
const CARD_H = 60

interface Props {
  scenarios: Scenario[]
}

export function ConnectionLayer({ scenarios }: Props) {
  const posMap = new Map(scenarios.map(s => [s.id, s]))

  const paths: JSX.Element[] = []

  for (const s of scenarios) {
    for (const targetId of s.connections) {
      const target = posMap.get(targetId)
      if (!target) continue

      const x1 = s.position.x + CARD_W
      const y1 = s.position.y + CARD_H / 2
      const x2 = target.position.x
      const y2 = target.position.y + CARD_H / 2

      const cx = (x1 + x2) / 2

      paths.push(
        <g key={`${s.id}-${targetId}`}>
          <path
            d={`M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`}
            fill="none"
            stroke={s.color}
            strokeWidth={2}
            strokeOpacity={0.4}
            strokeDasharray="6 4"
          />
          <circle cx={x2} cy={y2} r={4} fill={s.color} opacity={0.6} />
        </g>
      )
    }
  }

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: 0,
        height: 0,
        overflow: 'visible',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      {paths}
    </svg>
  )
}
