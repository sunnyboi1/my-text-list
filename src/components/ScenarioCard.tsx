import { useState, useRef, useCallback } from 'react'
import type { Scenario } from '../types'

interface Props {
  scenario: Scenario
  scale: number
  onUpdate: (id: string, patch: Partial<Scenario>) => void
  onDelete: (id: string) => void
  onDragEnd: (id: string, x: number, y: number) => void
  onStartConnect: (id: string) => void
  isConnectingSource: boolean
  onCardClick: (id: string) => void
  connectMode: boolean
}

function TagList({
  items,
  onChange,
  color,
  placeholder,
}: {
  items: string[]
  onChange: (items: string[]) => void
  color: string
  placeholder: string
}) {
  const [draft, setDraft] = useState('')

  const add = () => {
    const trimmed = draft.trim()
    if (!trimmed) return
    onChange([...items, trimmed])
    setDraft('')
  }

  return (
    <div className="flex flex-col gap-1">
      <ul className="flex flex-col gap-1">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-1.5 group">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
            <span className="flex-1 text-sm text-slate-300 leading-relaxed break-words">{item}</span>
            <button
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-opacity text-xs flex-shrink-0 mt-0.5"
            >×</button>
          </li>
        ))}
      </ul>
      <div className="flex gap-1 mt-1">
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-xs text-slate-400 placeholder-slate-600 outline-none border-b border-transparent focus:border-slate-600 pb-0.5"
          onMouseDown={e => e.stopPropagation()}
        />
        {draft && (
          <button onClick={add} className="text-xs text-slate-500 hover:text-slate-300">+</button>
        )}
      </div>
    </div>
  )
}

export function ScenarioCard({
  scenario,
  scale,
  onUpdate,
  onDelete,
  onDragEnd,
  onStartConnect,
  isConnectingSource,
  onCardClick,
  connectMode,
}: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const dragState = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const hasDragged = useRef(false)

  const onHandleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    hasDragged.current = false
    dragState.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: scenario.position.x,
      origY: scenario.position.y,
    }

    const onMove = (me: MouseEvent) => {
      if (!dragState.current || !cardRef.current) return
      const dx = (me.clientX - dragState.current.startX) / scale
      const dy = (me.clientY - dragState.current.startY) / scale
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasDragged.current = true
      const nx = dragState.current.origX + dx
      const ny = dragState.current.origY + dy
      cardRef.current.style.transform = `translate(${nx}px, ${ny}px)`
    }

    const onUp = (me: MouseEvent) => {
      if (!dragState.current) return
      const dx = (me.clientX - dragState.current.startX) / scale
      const dy = (me.clientY - dragState.current.startY) / scale
      const nx = dragState.current.origX + dx
      const ny = dragState.current.origY + dy
      dragState.current = null
      onDragEnd(scenario.id, nx, ny)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [scenario.id, scenario.position, scale, onDragEnd])

  const handleCardClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (connectMode) {
      onCardClick(scenario.id)
      return
    }
    if (hasDragged.current) return
  }, [connectMode, onCardClick, scenario.id])

  return (
    <div
      ref={cardRef}
      className={`scenario-card ${scenario.isChosen ? 'chosen' : ''} ${isConnectingSource ? 'connecting-source' : ''}`}
      style={{
        transform: `translate(${scenario.position.x}px, ${scenario.position.y}px)`,
        borderTopColor: scenario.color,
        borderTopWidth: 3,
      }}
      onClick={handleCardClick}
    >
      {/* Header */}
      <div
        className="card-drag-handle flex items-center gap-2 px-3 py-2.5 border-b border-[#2a3348]"
        onMouseDown={onHandleMouseDown}
      >
        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: scenario.color }} />
        <input
          value={scenario.title}
          onChange={e => onUpdate(scenario.id, { title: e.target.value })}
          className="flex-1 bg-transparent font-semibold text-sm text-slate-100 outline-none placeholder-slate-600 min-w-0"
          placeholder="Scenario title..."
          onMouseDown={e => e.stopPropagation()}
        />
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            title={scenario.isChosen ? 'Unmark as chosen' : 'Mark as chosen path'}
            onClick={e => { e.stopPropagation(); onUpdate(scenario.id, { isChosen: !scenario.isChosen }) }}
            className={`text-xs px-1.5 py-0.5 rounded transition-colors ${scenario.isChosen ? 'bg-emerald-900/50 text-emerald-400' : 'text-slate-600 hover:text-emerald-500'}`}
          >✓</button>
          <button
            title="Connect to another card"
            onClick={e => { e.stopPropagation(); onStartConnect(scenario.id) }}
            className="text-xs text-slate-600 hover:text-accent transition-colors px-1"
          >⟶</button>
          <button
            onClick={e => { e.stopPropagation(); setCollapsed(c => !c) }}
            className="text-slate-600 hover:text-slate-300 transition-colors text-xs"
          >{collapsed ? '▼' : '▲'}</button>
          <button
            onClick={e => { e.stopPropagation(); onDelete(scenario.id) }}
            className="text-slate-600 hover:text-red-400 transition-colors text-xs"
          >✕</button>
        </div>
      </div>

      {!collapsed && (
        <div className="px-3 py-3 flex flex-col gap-3">
          {/* Description */}
          <textarea
            value={scenario.description}
            onChange={e => onUpdate(scenario.id, { description: e.target.value })}
            placeholder="Describe this scenario..."
            className="w-full bg-transparent text-sm text-slate-300 placeholder-slate-600 outline-none leading-relaxed"
            onMouseDown={e => e.stopPropagation()}
            rows={2}
          />

          {/* Pros */}
          <div>
            <div className="text-xs font-medium text-emerald-500 mb-1.5 uppercase tracking-wider">Pros</div>
            <TagList
              items={scenario.pros}
              onChange={pros => onUpdate(scenario.id, { pros })}
              color="#34d399"
              placeholder="Add a pro..."
            />
          </div>

          {/* Cons */}
          <div>
            <div className="text-xs font-medium text-red-400 mb-1.5 uppercase tracking-wider">Cons</div>
            <TagList
              items={scenario.cons}
              onChange={cons => onUpdate(scenario.id, { cons })}
              color="#f87171"
              placeholder="Add a con..."
            />
          </div>

          {/* Reasoning */}
          <div>
            <div className="text-xs font-medium text-blue-400 mb-1.5 uppercase tracking-wider">Why not this path</div>
            <textarea
              value={scenario.reasoning}
              onChange={e => onUpdate(scenario.id, { reasoning: e.target.value })}
              placeholder="Why you're not choosing this..."
              className="w-full bg-[#161923] rounded-md px-2.5 py-2 text-sm text-slate-300 placeholder-slate-600 outline-none leading-relaxed border border-[#2a3348] focus:border-blue-800"
              onMouseDown={e => e.stopPropagation()}
              rows={2}
            />
          </div>

          {/* Phase tag */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600">Phase:</span>
            <input
              value={scenario.phase || ''}
              onChange={e => onUpdate(scenario.id, { phase: e.target.value })}
              placeholder="e.g. 2025, Year 1..."
              className="flex-1 bg-transparent text-xs text-slate-400 placeholder-slate-700 outline-none border-b border-transparent focus:border-slate-600 pb-0.5"
              onMouseDown={e => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  )
}
