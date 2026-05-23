import { useState, useRef, useEffect } from 'react'
import type { ChatMessage, Scenario } from '../types'

interface Props {
  open: boolean
  onClose: () => void
  scenarios: Scenario[]
}

function renderMarkdown(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^### (.+)$/gm, '<h3 style="font-weight:600;color:#94a3b8;font-size:0.8em;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="font-weight:600;color:#cbd5e1;margin-bottom:4px">$1</h2>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/gs, (m) => `<ul style="list-style:disc;padding-left:1.2em;margin:4px 0">${m}</ul>`)
    .replace(/\n\n/g, '</p><p style="margin-top:8px">')
    .replace(/\n/g, '<br/>')
}

export function ChatPanel({ open, onClose, scenarios }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')

    const userMsg: ChatMessage = { role: 'user', content: text }
    const next = [...messages, userMsg]
    setMessages(next)
    setLoading(true)
    setStreamingText('')

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: next.map(m => ({ role: m.role, content: m.content })),
          scenarios,
        }),
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      if (!res.body) throw new Error('No response body')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let full = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          if (data === '[DONE]') break
          try {
            const { text: t } = JSON.parse(data)
            if (t) {
              full += t
              setStreamingText(full)
            }
          } catch {}
        }
      }

      setMessages(prev => [...prev, { role: 'assistant', content: full }])
      setStreamingText('')
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err}` }])
      setStreamingText('')
    } finally {
      setLoading(false)
      textareaRef.current?.focus()
    }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className={`chat-panel ${open ? 'open' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a3348] flex-shrink-0">
        <div>
          <div className="font-semibold text-sm text-slate-100">Talk to your board</div>
          <div className="text-xs text-slate-500">{scenarios.length} scenario{scenarios.length !== 1 ? 's' : ''} in context</div>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors text-lg leading-none">×</button>
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {messages.length === 0 && !loading && (
          <div className="text-center py-8">
            <div className="text-3xl mb-3">💭</div>
            <div className="text-slate-400 text-sm font-medium">Ask anything about your scenarios</div>
            <div className="text-slate-600 text-xs mt-2">I have full context of everything on your board</div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`text-xs font-medium ${msg.role === 'user' ? 'text-slate-500' : 'text-blue-400'}`}>
              {msg.role === 'user' ? 'You' : 'Claude'}
            </div>
            {msg.role === 'user' ? (
              <div className="bg-[#2a3348] rounded-2xl rounded-tr-sm px-3.5 py-2.5 text-sm text-slate-200 max-w-[85%] leading-relaxed">
                {msg.content}
              </div>
            ) : (
              <div
                className="prose-dark text-sm text-slate-300 leading-relaxed max-w-full"
                dangerouslySetInnerHTML={{ __html: `<p>${renderMarkdown(msg.content)}</p>` }}
              />
            )}
          </div>
        ))}

        {streamingText && (
          <div className="flex flex-col gap-1 items-start">
            <div className="text-xs font-medium text-blue-400">Claude</div>
            <div
              className="prose-dark text-sm text-slate-300 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: `<p>${renderMarkdown(streamingText)}</p>` }}
            />
            <div className="flex gap-1 mt-1">
              <span className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        {loading && !streamingText && (
          <div className="flex gap-1 pl-1">
            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-3 pb-4 pt-2 flex-shrink-0 border-t border-[#2a3348]">
        <div className="flex gap-2 items-end bg-[#1e2433] rounded-xl border border-[#2a3348] px-3 py-2 focus-within:border-blue-800 transition-colors">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask about your scenarios..."
            className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-600 outline-none leading-relaxed"
            rows={1}
            disabled={loading}
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading}
            className="text-sm px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-medium transition-colors flex-shrink-0"
          >↑</button>
        </div>
        <div className="text-center text-xs text-slate-700 mt-1.5">Enter to send · Shift+Enter for newline</div>
      </div>
    </div>
  )
}
