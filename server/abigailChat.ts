import { ABIGAIL_SYSTEM_PROMPT } from '../src/lib/prompt.ts'

export type ChatTurn = {
  role?: string
  text?: string
}

export function normalizeUserName(raw: unknown): string {
  const first = String(raw ?? '').trim().split(/\s+/)[0] ?? ''
  const cleaned = first.replace(/[^\p{L}\p{M}'-]/gu, '').slice(0, 24)
  if (!cleaned) return 'them'
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
}

export function openaiMessages(
  userName: unknown,
  history: ChatTurn[],
): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
  const who = normalizeUserName(userName)
  return [
    {
      role: 'system',
      content: `${ABIGAIL_SYSTEM_PROMPT}

THE PERSON IN THIS CHAT
Their first name is ${who}. Address them as ${who} the way you address Michael in the examples — sparingly, as a jab or a greeting, not every sentence. Do not assume they are Michael unless their name is Michael.`,
    },
    ...history.slice(-18).map((message) => ({
      role: (message.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: String(message.text ?? ''),
    })),
  ]
}
