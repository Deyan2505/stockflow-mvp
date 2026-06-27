'use server'

import OpenAI from 'openai'
import { getCurrentRole } from '@/lib/current-user'
import { TOOL_SCHEMAS, executeTool } from './tools'

const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini'
const MAX_TOKENS = 2048
const MAX_ITERATIONS = 5
const MAX_QUESTION_LENGTH = 500

export type AssistantResult =
  | { success: true; answer: string }
  | { success: false; error: string }

export async function askAssistant(question: string): Promise<AssistantResult> {
  try {
    // 1. Ensure authenticated — getCurrentRole throws if not
    const role = await getCurrentRole()

    // 2. Validate input
    const trimmed = question.trim()
    if (!trimmed) return { success: false, error: 'errGeneric' }
    if (trimmed.length > MAX_QUESTION_LENGTH) return { success: false, error: 'errLong' }

    // 3. Check API key — server-side only, never NEXT_PUBLIC_
    if (!process.env.OPENAI_API_KEY) {
      return { success: false, error: 'errNotConfigured' }
    }

    // 4. Create OpenAI client server-side only
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    // 5. System prompt
    const today = new Date().toISOString().split('T')[0]
    const systemPrompt = `You are a read-only assistant for StockFlow, a warehouse and invoicing system for small businesses.

Current user role: ${role}
Today's date: ${today}
System: StockFlow v0.8 (WMS + Invoicing MVP)

IMPORTANT RULES:
- You are READ-ONLY. You can only read and answer questions. You cannot perform any actions.
- Never create, edit, delete, issue, cancel, receive, pay, export, download, or print anything.
- If the user asks you to perform an action, politely explain that the assistant is read-only and can only provide information.
- Respond in the same language as the user's question (Bulgarian or English).
- Only answer based on data returned by the tools. Do not invent or assume quantities, invoices, customers, payments, or locations.
- If data is not found in the tools, say that you don't know or that no matching data was found.
- Do not output CSV, Excel, downloadable files, or raw bulk data exports.
- Do not dump large raw tables. Summarize and answer clearly.
- When tool results are limited to 50 rows, mention that the results may be incomplete.
- Keep answers concise and practical for warehouse and invoicing work.
- Currency in this system is EUR (€).`

    // 6. Tool-use loop
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: trimmed },
    ]

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const response = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        max_tokens: MAX_TOKENS,
        tools: TOOL_SCHEMAS,
        tool_choice: 'auto',
        messages,
      })

      const choice = response.choices[0]
      if (!choice) break

      if (choice.finish_reason === 'stop') {
        return { success: true, answer: choice.message.content || 'No answer generated.' }
      }

      if (choice.finish_reason === 'tool_calls' && choice.message.tool_calls?.length) {
        // Append the assistant's tool-call message to the conversation
        messages.push({
          role: 'assistant',
          content: choice.message.content,
          tool_calls: choice.message.tool_calls,
        })

        // Execute every requested tool and append results
        for (const toolCall of choice.message.tool_calls) {
          if (toolCall.type !== 'function') continue

          let args: Record<string, unknown> = {}
          try {
            args = JSON.parse(toolCall.function.arguments || '{}')
          } catch {
            args = {}
          }

          const result = await executeTool(toolCall.function.name, args)

          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(result),
          })
        }
        continue
      }

      // Other finish reasons (length, content_filter) — return whatever text exists
      if (choice.message.content) {
        return { success: true, answer: choice.message.content }
      }
      break
    }

    return { success: false, error: 'errTimeout' }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    // Log safely — redact any key-like strings
    console.error('[assistant] error:', msg.replace(/sk-[a-zA-Z0-9\-_]+/g, '[REDACTED]'))
    // Map known setup/billing/auth issues to a clean user-facing error
    if (
      msg.includes('OPENAI_API_KEY') ||
      msg.includes('Incorrect API key') ||
      msg.includes('invalid_api_key') ||
      msg.includes('authentication') ||
      msg.includes('quota') ||
      msg.includes('billing') ||
      msg.includes('credit') ||
      msg.includes('rate limit') ||
      msg.includes('does not exist') ||
      msg.includes('model_not_found')
    ) {
      return { success: false, error: 'errNotConfigured' }
    }
    return { success: false, error: 'errGeneric' }
  }
}
