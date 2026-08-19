import { openaiMessages, type ChatTurn } from './server/abigailChat.ts'

type Env = {
  OPENAI_API_KEY: string
  OPENAI_MODEL?: string
}

function isAllowedOrigin(origin: string | null): origin is string {
  if (!origin) return false
  if (origin === 'https://mich8060.github.io') return true
  return /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)
}

function corsHeaders(origin: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': isAllowedOrigin(origin) ? origin : 'https://mich8060.github.io',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin')
    const headers = corsHeaders(origin)

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers })
    }

    if (!isAllowedOrigin(origin)) {
      return Response.json({ error: 'Forbidden' }, { status: 403, headers })
    }

    if (request.method !== 'POST') {
      return Response.json({ error: 'POST only.' }, { status: 405, headers })
    }

    if (!env.OPENAI_API_KEY) {
      return Response.json({ error: 'Missing OPENAI_API_KEY' }, { status: 503, headers })
    }

    const url = new URL(request.url)
    if (url.pathname !== '/' && url.pathname !== '/api/abigail') {
      return Response.json({ error: 'Not found' }, { status: 404, headers })
    }

    try {
      const parsed = (await request.json()) as {
        userName?: string
        messages?: ChatTurn[]
      }
      const history = Array.isArray(parsed.messages) ? parsed.messages : []
      const messages = openaiMessages(parsed.userName, history)
      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: env.OPENAI_MODEL || 'gpt-4o-mini',
          temperature: 0.85,
          messages,
        }),
      })
      const data = (await openaiResponse.json()) as {
        error?: { message?: string }
        choices?: Array<{ message?: { content?: string | null } }>
      }

      if (!openaiResponse.ok) {
        return Response.json(
          { error: data.error?.message || 'OpenAI request failed' },
          { status: 502, headers },
        )
      }

      const reply = data.choices?.[0]?.message?.content?.trim()
      if (!reply) {
        return Response.json({ error: 'Empty reply' }, { status: 502, headers })
      }

      return Response.json({ reply }, { headers })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Abigail tripped over the API.'
      return Response.json({ error: message }, { status: 500, headers })
    }
  },
}
