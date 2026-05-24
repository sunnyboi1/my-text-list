import { useState, useRef, useCallback, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { Scenario } from './types'
import { CARD_COLORS } from './types'
import { useInfiniteCanvas } from './hooks/useInfiniteCanvas'
import { ScenarioCard } from './components/ScenarioCard'
import { ConnectionLayer } from './components/ConnectionLayer'
import { ChatPanel } from './components/ChatPanel'
import { Toolbar } from './components/Toolbar'

const STORAGE_KEY = 'vision-board-scenarios'

function loadLocal(): Scenario[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function newScenario(count: number): Scenario {
  const col = count % CARD_COLORS.length
  return {
    id: uuidv4(),
    title: '',
    description: '',
    pros: [],
    cons: [],
    reasoning: '',
    position: { x: -160 + count * 80, y: -100 + count * 60 },
    color: CARD_COLORS[col],
    connections: [],
    isChosen: false,
    phase: '',
  }
}

export default function App() {
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [loaded, setLoaded] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [connectMode, setConnectMode] = useState(false)
  const [connectSource, setConnectSource] = useState<string | null>(null)
  const [scale, setScale] = useState(1)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<string | null>(null)

  const worldRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const canvas = useInfiniteCanvas(worldRef)

  // Load board from server on mount; fall back to localStorage
  useEffect(() => {
    fetch('/api/board')
      .then(r => r.json())
      .then(data => {
        if (data.scenarios?.length > 0) {
          setScenarios(data.scenarios)
          setLastSaved(data.updatedAt ?? null)
        } else {
          setScenarios(loadLocal())
        }
      })
      .catch(() => setScenarios(loadLocal()))
      .finally(() => setLoaded(true))
  }, [])

  // Keep localStorage in sync as local backup
  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(scenarios))
  }, [scenarios, loaded])

  useEffect(() => {
    return canvas.onCameraChange(c => setScale(c.scale))
  }, [canvas])

  const addScenario = useCallback(() => {
    setScenarios(prev => [...prev, newScenario(prev.length)])
  }, [])

  const updateScenario = useCallback((id: string, patch: Partial<Scenario>) => {
    setScenarios(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s))
  }, [])

  const deleteScenario = useCallback((id: string) => {
    setScenarios(prev =>
      prev.filter(s => s.id !== id)
          .map(s => ({ ...s, connections: s.connections.filter(c => c !== id) }))
    )
  }, [])

  const handleDragEnd = useCallback((id: string, x: number, y: number) => {
    setScenarios(prev => prev.map(s => s.id === id ? { ...s, position: { x, y } } : s))
  }, [])

  const handleStartConnect = useCallback((id: string) => {
    setConnectMode(true)
    setConnectSource(id)
  }, [])

  const handleCardClick = useCallback((id: string) => {
    if (!connectMode) return
    if (!connectSource) { setConnectSource(id); return }
    if (connectSource === id) { setConnectSource(null); setConnectMode(false); return }
    setScenarios(prev => prev.map(s => {
      if (s.id !== connectSource) return s
      const already = s.connections.includes(id)
      return { ...s, connections: already ? s.connections.filter(c => c !== id) : [...s.connections, id] }
    }))
    setConnectSource(null)
    setConnectMode(false)
  }, [connectMode, connectSource])

  const toggleConnect = useCallback(() => {
    setConnectMode(m => !m)
    setConnectSource(null)
  }, [])

  const resetView = useCallback(() => {
    canvas.setCamera({ x: window.innerWidth / 2, y: window.innerHeight / 2.5, scale: 1 })
  }, [canvas])

  const saveBoard = useCallback(async () => {
    setSaving(true)
    try {
      const r = await fetch('/api/board', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarios }),
      })
      const data = await r.json()
      if (data.ok) setLastSaved(data.updatedAt)
    } catch { /* silent — still saved locally */ }
    setSaving(false)
  }, [scenarios])

  const handleViewportMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.scenario-card')) return
    if (connectMode && connectSource) { setConnectSource(null); setConnectMode(false); return }
    canvas.handleMouseDown(e)
  }, [canvas, connectMode, connectSource])

  if (!loaded) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d0f14' }}>
        <div style={{ color: '#4a5568', fontSize: '0.9rem' }}>Loading board…</div>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div
        ref={viewportRef}
        className={`canvas-viewport grid-bg ${connectMode ? 'connecting' : ''}`}
        onMouseDown={handleViewportMouseDown}
        onMouseMove={canvas.handleMouseMove}
        onMouseUp={canvas.handleMouseUp}
        onMouseLeave={canvas.handleMouseUp}
      >
        <div ref={worldRef} className="canvas-world">
          <ConnectionLayer scenarios={scenarios} />
          {scenarios.map(s => (
            <ScenarioCard
              key={s.id}
              scenario={s}
              scale={scale}
              onUpdate={updateScenario}
              onDelete={deleteScenario}
              onDragEnd={handleDragEnd}
              onStartConnect={handleStartConnect}
              isConnectingSource={connectSource === s.id}
              onCardClick={handleCardClick}
              connectMode={connectMode}
            />
          ))}
        </div>
      </div>

      <Toolbar
        onAddScenario={addScenario}
        onToggleChat={() => setChatOpen(o => !o)}
        onToggleConnect={toggleConnect}
        onResetView={resetView}
        onSave={saveBoard}
        chatOpen={chatOpen}
        connectMode={connectMode}
        scenarioCount={scenarios.length}
        saving={saving}
        lastSaved={lastSaved}
      />

      <div className="fixed bottom-4 left-4 text-xs text-slate-600 font-mono z-40 bg-[#161923]/70 px-2 py-1 rounded-lg">
        {Math.round(scale * 100)}%
      </div>

      <div className="fixed bottom-4 left-20 flex gap-1 z-40">
        {[{ label: '−', delta: 0.8 }, { label: '+', delta: 1.25 }].map(({ label, delta }) => (
          <button
            key={label}
            onClick={() => canvas.zoomTo(scale * delta, window.innerWidth / 2, window.innerHeight / 2)}
            className="w-7 h-7 rounded-lg bg-[#161923]/70 border border-[#2a3348] text-slate-400 hover:text-slate-200 hover:bg-[#2a3348] text-sm font-bold transition-colors"
          >{label}</button>
        ))}
      </div>

      {connectMode && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-purple-900/80 border border-purple-700 text-purple-200 text-xs px-4 py-2 rounded-xl backdrop-blur-sm">
          {connectSource ? 'Click another card to connect · Click background to cancel' : 'Click a card to start a connection'}
        </div>
      )}

      {scenarios.length === 0 && (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="text-center">
            <div className="text-5xl mb-4 opacity-30">🗺️</div>
            <div className="text-slate-500 text-base font-medium">Your vision board is empty</div>
            <div className="text-slate-700 text-sm mt-1">Click + Scenario to add your first path</div>
          </div>
        </div>
      )}

      <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} scenarios={scenarios} />
    </div>
  )
}
