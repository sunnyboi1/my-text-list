export interface Scenario {
  id: string
  title: string
  description: string
  pros: string[]
  cons: string[]
  reasoning: string
  position: { x: number; y: number }
  color: string
  connections: string[]
  isChosen?: boolean
  phase?: string
}

export interface Camera {
  x: number
  y: number
  scale: number
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export const CARD_COLORS = [
  '#4f8ef7',
  '#a78bfa',
  '#34d399',
  '#f59e0b',
  '#f87171',
  '#38bdf8',
  '#fb923c',
  '#e879f9',
]
