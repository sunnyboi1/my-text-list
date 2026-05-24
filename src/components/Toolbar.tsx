interface Props {
  onAddScenario: () => void
  onToggleChat: () => void
  onToggleConnect: () => void
  onResetView: () => void
  onSave: () => void
  chatOpen: boolean
  connectMode: boolean
  scenarioCount: number
  saving: boolean
  lastSaved: string | null
}

function formatSaved(iso: string | null) {
  if (!iso) return null
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function Toolbar({
  onAddScenario,
  onToggleChat,
  onToggleConnect,
  onResetView,
  onSave,
  chatOpen,
  connectMode,
  scenarioCount,
  saving,
  lastSaved,
}: Props) {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 bg-[#161923]/90 backdrop-blur-sm border border-[#2a3348] rounded-2xl px-3 py-2 shadow-2xl">
      <span className="text-slate-500 text-xs font-medium mr-1 hidden sm:block">Vision Board</span>
      <div className="w-px h-4 bg-[#2a3348] hidden sm:block" />

      <button
        onClick={onAddScenario}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors"
      >
        <span className="text-base leading-none">+</span> Scenario
      </button>

      <button
        onClick={onToggleConnect}
        title="Connect mode: click two cards to draw a connection"
        className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
          connectMode
            ? 'bg-purple-700/60 text-purple-300 border border-purple-600'
            : 'text-slate-400 hover:text-slate-200 hover:bg-[#2a3348]'
        }`}
      >
        {connectMode ? '⟶ Connecting…' : '⟶ Connect'}
      </button>

      <button
        onClick={onResetView}
        title="Reset view"
        className="px-3 py-1.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-[#2a3348] text-xs font-medium transition-colors"
      >
        ⌖ Reset
      </button>

      <div className="w-px h-4 bg-[#2a3348]" />

      <button
        onClick={onSave}
        disabled={saving}
        title={lastSaved ? `Last saved ${formatSaved(lastSaved)}` : 'Save board to server'}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors disabled:opacity-50 text-emerald-400 hover:text-emerald-300 hover:bg-[#2a3348]"
      >
        {saving ? '…' : '↑'} {saving ? 'Saving' : lastSaved ? `Saved ${formatSaved(lastSaved)}` : 'Save'}
      </button>

      <div className="w-px h-4 bg-[#2a3348]" />

      <button
        onClick={onToggleChat}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
          chatOpen ? 'bg-[#2a3348] text-slate-200' : 'text-slate-400 hover:text-slate-200 hover:bg-[#2a3348]'
        }`}
      >
        💬 Chat
        {scenarioCount > 0 && (
          <span className="bg-blue-600/40 text-blue-300 rounded-full px-1.5 py-0.5 text-[10px]">
            {scenarioCount}
          </span>
        )}
      </button>
    </div>
  )
}
