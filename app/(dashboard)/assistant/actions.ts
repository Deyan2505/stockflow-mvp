'use server'

import Anthropic from '@anthropic-ai/sdk'
import { getCurrentRole } from '@/lib/current-user'
import { TOOL_SCHEMAS, executeTool } from './tools'

const MODEL = 'claude-haiku-4-5-20251001'
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

    // 3. Check API key
    if (!process.env.ANTHROPIC_API_KEY) {
      return { success: false, error: 'errNotConfigured' }
    }

    // 4. Create Anthropic client server-side only
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

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
    const messages: Anthropic.Messages.MessageParam[] = [
      { role: 'user', content: trimmed },
    ]

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: systemPrompt,
        tools: TOOL_SCHEMAS,
        messages,
      })

      if (response.stop_reason === 'end_turn') {
        const textBlock = response.content.find((b) => b.type === 'text')
        const answer = textBlock?.type === 'text' ? textBlock.text : ''
        return { success: true, answer: answer || 'No answer generated.' }
      }

      if (response.stop_reason === 'tool_use') {
        // Append assistant's response to the conversation
        messages.push({ role: 'assistant', content: response.content })

        // Execute all tool calls and collect results
        const toolResults: Anthropic.Messages.ToolResultBlockParam[] = []

        for (const block of response.content) {
          if (block.type === 'tool_use') {
            const result = await executeTool(
              block.name,
              block.input as Record<string, unknown>,
            )
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: JSON.stringify(result),
            })
          }
        }

        messages.push({ role: 'user', content: toolResults })
        continue
      }

      // Unexpected stop reason — extract any text and return
      const textBlock = response.content.find((b) => b.type === 'text')
      if (textBlock?.type === 'text' && textBlock.text) {
        return { success: true, answer: textBlock.text }
      }
      break
    }

    return { success: false, error: 'errTimeout' }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    // Log real error server-side for debugging — no secrets printed
    console.error('[assistant] askAssistant error:', msg.replace(/sk-ant-[^\s"]+/g, '[REDACTED]'))
    // Map known setup/billing issues to a clean user-facing error
    if (
      msg.includes('ANTHROPIC_API_KEY') ||
      msg.includes('authentication') ||
      msg.includes('credit balance') ||
      msg.includes('too low') ||
      msg.includes('upgrade') ||
      msg.includes('invalid x-api-key')
    ) {
      return { success: false, error: 'errNotConfigured' }
    }
    return { success: false, error: 'errGeneric' }
  }
}
