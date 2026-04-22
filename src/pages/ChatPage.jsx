import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../lib/api'

const API_URL = import.meta.env.VITE_API_URL

// ── Individual message bubbles ──────────────────────────────────────────────

function UserMessage({ content }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[70%] bg-blue-600 text-white text-sm rounded-2xl rounded-tr-sm px-4 py-3">
        {content}
      </div>
    </div>
  )
}

function AssistantMessage({ content, streaming }) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[70%] bg-white border border-gray-200 text-gray-800 text-sm rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
        {content}
        {streaming && (
          <span className="inline-block w-2 h-4 bg-gray-400 ml-1 animate-pulse rounded-sm" />
        )}
      </div>
    </div>
  )
}

// ── Citations panel ──────────────────────────────────────────────────────────

function CitationsPanel({ citations }) {
  if (citations.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm px-4 text-center">
        Source passages will appear here after the first answer.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 p-4 overflow-y-auto h-full">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        Sources used ({citations.length})
      </p>
      {citations.map((chunk, i) => (
        <div
          key={i}
          className="bg-white border border-gray-200 rounded-lg p-3 text-xs text-gray-600 leading-relaxed shadow-sm"
        >
          <span className="inline-block bg-blue-100 text-blue-700 font-semibold rounded px-1.5 py-0.5 mb-2">
            #{i + 1}
          </span>
          <p>{chunk}</p>
        </div>
      ))}
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const { uuid } = useParams()
  const navigate = useNavigate()

  const [doc, setDoc] = useState(null)
  const [messages, setMessages] = useState([])
  const [citations, setCitations] = useState([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)

  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)

  // Fetch document details on mount
  useEffect(() => {
    api.get(`/documents/${uuid}`)
      .then(res => setDoc(res.data))
      .catch(() => navigate('/dashboard'))
  }, [uuid])

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage() {
    if (!input.trim() || streaming) return

    const question = input.trim()
    setInput('')
    setStreaming(true)

    const userMsgId = Date.now()
    const assistantMsgId = Date.now() + 1

    setMessages(prev => [
      ...prev,
      { id: userMsgId, role: 'user', content: question },
      { id: assistantMsgId, role: 'assistant', content: '', streaming: true },
    ])

    try {
      const response = await fetch(`${API_URL}/chat/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${window.__auth_token__}`,
        },
        body: JSON.stringify({ document_uuid: uuid, question, top_k: 5 }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text = decoder.decode(value, { stream: true })
        const lines = text.split('\n')

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)

          if (data === '[DONE]') break

          if (data.startsWith('[CITATIONS]')) {
            try {
              setCitations(JSON.parse(data.slice(11)))
            } catch { /* malformed citations — skip */ }
            continue
          }

          flushSync(() => {
            setMessages(prev =>
              prev.map(m =>
                m.id === assistantMsgId
                  ? { ...m, content: m.content + data }
                  : m
              )
            )
          })
        }
      }
    } catch {
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantMsgId
            ? { ...m, content: 'Something went wrong. Please try again.' }
            : m
        )
      )
    } finally {
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantMsgId ? { ...m, streaming: false } : m
        )
      )
      setStreaming(false)
      textareaRef.current?.focus()
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">

      {/* Header */}
      <header className="bg-white border-b border-gray-200 shrink-0">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            ← Back
          </button>
          <h1 className="text-sm font-semibold text-gray-900 truncate">
            {doc ? doc.filename : 'Loading…'}
          </h1>
        </div>
      </header>

      {/* Body: chat + citations */}
      <div className="flex flex-1 overflow-hidden max-w-7xl w-full mx-auto">

        {/* Chat column */}
        <div className="flex flex-col flex-1 overflow-hidden">

          {/* Message thread */}
          <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-4">
            {messages.length === 0 && (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                Ask anything about this document.
              </div>
            )}
            {messages.map(m =>
              m.role === 'user'
                ? <UserMessage key={m.id} content={m.content} />
                : <AssistantMessage key={m.id} content={m.content} streaming={m.streaming} />
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input bar */}
          <div className="border-t border-gray-200 bg-white px-6 py-4 shrink-0">
            <div className="flex items-end gap-3">
              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={streaming}
                placeholder="Ask a question… (Enter to send, Shift+Enter for new line)"
                className="flex-1 resize-none rounded-xl border border-gray-300 px-4 py-3 text-sm
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || streaming}
                className="bg-blue-600 text-white text-sm font-medium px-5 py-3 rounded-xl
                  hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
                  transition-colors shrink-0"
              >
                {streaming ? 'Sending…' : 'Send'}
              </button>
            </div>
          </div>
        </div>

        {/* Citations sidebar */}
        <div className="w-80 border-l border-gray-200 bg-gray-50 shrink-0 overflow-hidden flex flex-col">
          <CitationsPanel citations={citations} />
        </div>

      </div>
    </div>
  )
}
