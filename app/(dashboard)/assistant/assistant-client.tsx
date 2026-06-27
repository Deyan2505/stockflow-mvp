'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { Send, Bot } from 'lucide-react'
import { askAssistant, type AssistantMessage } from './actions'
import { useT } from '@/lib/i18n'

type Message = {
  role: 'user' | 'assistant'
  text: string
  isError?: boolean
}

export function AssistantClient() {
  const { t } = useT()
  const s = t.assistant

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isPending, startTransition] = useTransition()
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = (question: string) => {
    const q = question.trim()
    if (!q || isPending) return

    setInput('')

    // Build history from current messages BEFORE updating state.
    // Exclude error messages — they are UI-only and not real conversation turns.
    const history: AssistantMessage[] = messages
      .filter((m) => !m.isError)
      .map((m) => ({ role: m.role, content: m.text }))

    // Full message array passed to the server: history + new question
    const payload: AssistantMessage[] = [...history, { role: 'user', content: q }]

    // Add user message to UI
    setMessages((prev) => [...prev, { role: 'user', text: q }])

    startTransition(async () => {
      const result = await askAssistant(payload)

      if (result.success) {
        setMessages((prev) => [...prev, { role: 'assistant', text: result.answer }])
      } else {
        const errorText =
          result.error === 'errNotConfigured' ? s.errNotConfigured :
          result.error === 'errTimeout'       ? s.errTimeout :
          result.error === 'errLong'          ? s.errLong :
          s.errGeneric
        setMessages((prev) => [...prev, { role: 'assistant', text: errorText, isError: true }])
      }
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend(input)
    }
  }

  const handleSuggestion = (text: string) => {
    setInput(text)
    textareaRef.current?.focus()
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{s.title}</h1>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{s.subtitle}</p>
          </div>
        </div>
      </div>

      {/* Conversation area */}
      <div className="flex-1 overflow-y-auto rounded-xl border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900">
        {messages.length === 0 ? (
          /* Empty state with suggestions */
          <div className="flex h-full flex-col items-center justify-center px-6 py-12">
            <Bot className="mb-4 h-10 w-10 text-gray-300 dark:text-gray-700" />
            <p className="mb-6 text-center text-sm text-gray-400 dark:text-gray-500">
              {s.subtitle}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {s.suggestions.map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestion(suggestion)}
                  className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-600 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-blue-600 dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4 p-6">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : msg.isError
                        ? 'border border-red-100 bg-red-50 text-red-700 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-400'
                        : 'border border-gray-100 bg-gray-50 text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>
              </div>
            ))}

            {isPending && (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="mt-4 flex items-end gap-3">
        <textarea
          ref={textareaRef}
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={s.placeholder}
          disabled={isPending}
          className="flex-1 resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500"
          style={{ maxHeight: '120px', overflowY: 'auto' }}
          onInput={(e) => {
            const el = e.currentTarget
            el.style.height = 'auto'
            el.style.height = Math.min(el.scrollHeight, 120) + 'px'
          }}
        />
        <button
          onClick={() => handleSend(input)}
          disabled={isPending || !input.trim()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:opacity-40"
          title={isPending ? s.sending : s.send}
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
