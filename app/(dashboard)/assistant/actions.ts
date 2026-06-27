'use server'

import OpenAI from 'openai'
import { getCurrentRole } from '@/lib/current-user'
import { TOOL_SCHEMAS, executeTool } from './tools'

const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini'
const MAX_TOKENS = 2048
const MAX_ITERATIONS = 5
const MAX_QUESTION_LENGTH = 500
const MAX_HISTORY = 10 // last N messages included as context

export type AssistantMessage = { role: 'user' | 'assistant'; content: string }

export type AssistantResult =
  | { success: true; answer: string }
  | { success: false; error: string }

export async function askAssistant(
  messages: AssistantMessage[],
): Promise<AssistantResult> {
  try {
    // 1. Ensure authenticated
    const role = await getCurrentRole()

    // 2. Validate — last message must be a non-empty user turn
    if (!messages.length) return { success: false, error: 'errGeneric' }
    const lastMsg = messages[messages.length - 1]
    if (lastMsg.role !== 'user' || !lastMsg.content.trim()) {
      return { success: false, error: 'errGeneric' }
    }
    if (lastMsg.content.trim().length > MAX_QUESTION_LENGTH) {
      return { success: false, error: 'errLong' }
    }

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

READ-ONLY RULES:
- You are READ-ONLY. You can only read and answer questions. You cannot perform any actions.
- BEFORE calling any tool, check: if the user is asking you to PERFORM an action (издай/issue, изтрий/delete, анулирай/cancel, запиши/record, приеми/receive, плати/pay, принтирай/print, или подобни), IMMEDIATELY refuse without calling any tool. Say clearly that you are read-only and cannot perform that action.
- Never create, edit, delete, issue, cancel, receive, pay, export, download, or print anything.
- Respond in the same language as the user's question (Bulgarian or English).
- Currency in this system is EUR (€).

DATA RULES:
- For any StockFlow data question (inventory, products, low stock, orders, invoices, customers, movements, deliveries, stock value), ALWAYS call the relevant tool before answering. Never answer from memory or assumption.
- Never say "none found", "no results", "nothing is below minimum", or similar unless the relevant tool was actually called and returned an empty result or count: 0.
- Only answer based on data returned by the tools. Do not invent or assume quantities, invoices, customers, payments, or locations.
- If you do not have data from a tool for a question, call the appropriate tool to get it.

FOLLOW-UP RULES:
- Use the conversation history to understand follow-up questions.
- If the user sends a short reply like "да" (yes), "yes", "покажи ги" (show them), "дай подробности" (give details), "кои са те?" (which ones?), "още" (more), "show them", "list them": look at the previous assistant message to understand what topic was being discussed, then call the appropriate tool and provide the details.
- Never treat a short follow-up as a new unrelated question — always infer the context from the conversation history.

INVOICE AND PAYMENT STATUS MAPPING:
- "платени фактури" / "paid invoices" → call get_invoices with payment_status: "paid"
- "неплатени фактури" / "unpaid invoices" → call get_invoices with payment_status: "unpaid"
- "частично платени" / "partially paid" → call get_invoices with payment_status: "partially_paid"
- "издадени фактури" / "issued invoices" → call get_invoices with status: "issued"
- "чернови" / "draft invoices" → call get_invoices with status: "draft"
- "анулирани" / "cancelled invoices" → call get_invoices with status: "cancelled"
- Invoice document status (draft/issued/cancelled) and payment status (unpaid/partially_paid/paid) are separate fields.

LOW-STOCK RULES:
- For any question about low stock, "под минимум", "на изчерпване", running low, or restocking: ALWAYS call get_low_stock.
- If get_low_stock returns count > 0, list all items with their product name, available quantity, minimum quantity, and shortage.
- Only say "no low-stock products" if the tool returned count: 0 and low_stock_items is empty.

EXPORT RULES:
- NEVER output data in CSV format, even if the user explicitly asks. CSV, Excel, and file exports are not supported.
- If the user asks for CSV, Excel, export, or file download: refuse IMMEDIATELY without calling any tool. Say clearly that you cannot export files and can only display information in text.
- Do not format answers as tables with comma-separated values, pipes, or raw delimiters.
- Do not dump large raw tables. Summarize and answer clearly.
- When tool results are limited to 50 rows, mention that the results may be incomplete.`

    // 6. Build OpenAI message array with history (capped to avoid context bloat)
    const oaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      // Include the last MAX_HISTORY messages for follow-up context
      ...messages.slice(-MAX_HISTORY).map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ]

    // 7. Tool-use loop
    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const response = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        max_tokens: MAX_TOKENS,
        tools: TOOL_SCHEMAS,
        tool_choice: 'auto',
        messages: oaiMessages,
      })

      const choice = response.choices[0]
      if (!choice) break

      if (choice.finish_reason === 'stop') {
        return { success: true, answer: choice.message.content || 'No answer generated.' }
      }

      if (choice.finish_reason === 'tool_calls' && choice.message.tool_calls?.length) {
        oaiMessages.push({
          role: 'assistant',
          content: choice.message.content,
          tool_calls: choice.message.tool_calls,
        })

        for (const toolCall of choice.message.tool_calls) {
          if (toolCall.type !== 'function') continue

          let args: Record<string, unknown> = {}
          try {
            args = JSON.parse(toolCall.function.arguments || '{}')
          } catch {
            args = {}
          }

          const result = await executeTool(toolCall.function.name, args)

          oaiMessages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(result),
          })
        }
        continue
      }

      if (choice.message.content) {
        return { success: true, answer: choice.message.content }
      }
      break
    }

    return { success: false, error: 'errTimeout' }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[assistant] error:', msg.replace(/sk-[a-zA-Z0-9\-_]+/g, '[REDACTED]'))
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
