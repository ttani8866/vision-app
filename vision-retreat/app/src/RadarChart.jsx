import { DOMAINS, GIFT_BASE, GIFT_CAP, RISK_FLOOR } from './data.js'

const SIZE = 300
const CENTER = SIZE / 2
const R_MAX = SIZE * 0.42

// 各軸のギフトスコアを独立に半径へ写す（軸同士で押し合い・相対で最弱を作らない）
const AXIS_GAMMA = 1.05
const MIN_GIFT_FRAC = 0.48

const GRID_RING_FRACS = [0.22, 0.38, 0.54, 0.70, 0.86, 1]

const AXIS_ORDER = [
  { domain: 'executing', angle: -Math.PI / 2 },
  { domain: 'influencing', angle: 0 },
  { domain: 'relationship', angle: Math.PI / 2 },
  { domain: 'thinking', angle: Math.PI }
]

function radiiFromGiftScores(giftScores) {
  return AXIS_ORDER.map(a => {
    const g = giftScores[a.domain] ?? GIFT_BASE
    const span = GIFT_CAP - RISK_FLOOR
    const norm = span > 0 ? Math.min(1, Math.max(0, (g - RISK_FLOOR) / span)) : 0
    const shaped = Math.pow(norm, AXIS_GAMMA)
    return R_MAX * (MIN_GIFT_FRAC + (1 - MIN_GIFT_FRAC) * shaped)
  })
}

function pointAt(angle, r) {
  return {
    x: CENTER + r * Math.cos(angle),
    y: CENTER + r * Math.sin(angle)
  }
}

function ringPathUniform(frac) {
  const points = AXIS_ORDER.map(a => pointAt(a.angle, R_MAX * frac))
  return points.map((p, i) => (i === 0 ? `M${p.x} ${p.y}` : `L${p.x} ${p.y}`)).join(' ') + ' Z'
}

function polygonPathFromRadii(radii) {
  const points = AXIS_ORDER.map((a, i) => pointAt(a.angle, radii[i]))
  return points.map((p, i) => (i === 0 ? `M${p.x} ${p.y}` : `L${p.x} ${p.y}`)).join(' ') + ' Z'
}

export default function RadarChart({ giftScores, topDomain }) {
  const topColor = DOMAINS[topDomain]?.color || '#8b5cf6'
  const radii = radiiFromGiftScores(giftScores)
  const points = AXIS_ORDER.map((a, i) => pointAt(a.angle, radii[i]))

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="radar-chart" aria-hidden="true">
      <defs>
        <radialGradient id="radar-grad" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor={topColor} stopOpacity="0.55" />
          <stop offset="100%" stopColor={topColor} stopOpacity="0.12" />
        </radialGradient>
      </defs>

      {GRID_RING_FRACS.map((frac, idx) => (
        <path
          key={idx}
          d={ringPathUniform(frac)}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="1"
        />
      ))}

      {AXIS_ORDER.map(a => {
        const tip = pointAt(a.angle, R_MAX)
        return (
          <line
            key={a.domain}
            x1={CENTER}
            y1={CENTER}
            x2={tip.x}
            y2={tip.y}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1"
          />
        )
      })}

      <path
        d={polygonPathFromRadii(radii)}
        fill="url(#radar-grad)"
        stroke={topColor}
        strokeWidth="2.25"
      />

      {points.map((p, i) => {
        const d = AXIS_ORDER[i].domain
        const color = DOMAINS[d].color
        return (
          <circle key={d} cx={p.x} cy={p.y} r="4.5" fill={color} />
        )
      })}

      {AXIS_ORDER.map(a => {
        const label = DOMAINS[a.domain].label
        const labelR = R_MAX + 24
        const pt = pointAt(a.angle, labelR)
        return (
          <text
            key={a.domain}
            x={pt.x}
            y={pt.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={DOMAINS[a.domain].color}
            fontSize="12"
            fontWeight="600"
            fontFamily="'Noto Sans JP', sans-serif"
          >
            {label}
          </text>
        )
      })}
    </svg>
  )
}
