import type { ChatMessage } from '../types'

export async function askAbigailLlm(
  history: ChatMessage[],
  userName: string,
): Promise<string> {
  const response = await fetch(`${import.meta.env.BASE_URL}api/abigail`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userName,
      messages: history.slice(-18).map((message) => ({
        role: message.role,
        text: message.text,
      })),
    }),
  })

  const data = (await response.json()) as { reply?: string; error?: string }
  if (!response.ok || !data.reply) {
    throw new Error(data.error || `LLM request failed (${response.status})`)
  }
  return data.reply
}
