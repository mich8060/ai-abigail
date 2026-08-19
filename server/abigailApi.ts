import { existsSync, readFileSync } from 'node:fs'
import https from 'node:https'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'
import { openaiMessages, type ChatTurn } from './abigailChat.ts'

type Options = {
  apiKey: string
  model: string
}

type ChatBody = {
  messages?: ChatTurn[]
  userName?: string
}

type OpenAIResponse = {
  error?: { message?: string }
  choices?: Array<{ message?: { content?: string | null } }>
}

function certificateAuthorities(): Buffer[] | undefined {
  const files = [
    '/etc/ssl/cert.pem',
    '/etc/ssl/certs/ca-certificates.crt',
    process.env.SSL_CERT_FILE,
    process.env.NODE_EXTRA_CA_CERTS,
  ]
  const certs = files
    .filter((file): file is string => typeof file === 'string' && existsSync(file))
    .map((file) => readFileSync(file))

  return certs.length > 0 ? certs : undefined
}

const ca = certificateAuthorities()

async function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer | string) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload))
}

function chatCompletion(
  apiKey: string,
  model: string,
  messages: Array<{ role: string; content: string }>,
): Promise<{ status: number; data: OpenAIResponse }> {
  const body = JSON.stringify({
    model,
    temperature: 0.85,
    messages,
  })

  return new Promise((resolve, reject) => {
    const request = https.request(
      {
        hostname: 'api.openai.com',
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'Content-Length': Buffer.byteLength(body),
        },
        ca,
      },
      (response) => {
        const chunks: Buffer[] = []
        response.on('data', (chunk: Buffer) => chunks.push(chunk))
        response.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8')
          try {
            resolve({
              status: response.statusCode ?? 500,
              data: JSON.parse(raw) as OpenAIResponse,
            })
          } catch {
            reject(new Error('OpenAI sent something that was not JSON.'))
          }
        })
      },
    )
    request.on('error', reject)
    request.write(body)
    request.end()
  })
}

export function abigailApiPlugin(options: Options): Plugin {
  const handle = async (
    req: IncomingMessage,
    res: ServerResponse,
    next: () => void,
  ): Promise<void> => {
    const url = req.url?.split('?')[0]
    if (url !== '/api/abigail') {
      next()
      return
    }

    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'POST only.' })
      return
    }

    if (!options.apiKey) {
      sendJson(res, 503, { error: 'Missing OPENAI_API_KEY in .env' })
      return
    }

    try {
      const parsed = JSON.parse(await readBody(req)) as ChatBody
      const history = Array.isArray(parsed.messages) ? parsed.messages : []
      const messages = openaiMessages(parsed.userName, history)

      const { status, data } = await chatCompletion(
        options.apiKey,
        options.model,
        messages,
      )

      if (status < 200 || status >= 300) {
        sendJson(res, 502, {
          error: data.error?.message || 'OpenAI request failed',
        })
        return
      }

      const reply = data.choices?.[0]?.message?.content?.trim()
      if (!reply) {
        sendJson(res, 502, { error: 'Empty reply' })
        return
      }

      sendJson(res, 200, { reply })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Abigail tripped over the API.'
      sendJson(res, 500, { error: message })
    }
  }

  return {
    name: 'abigail-api',
    configureServer(server) {
      server.middlewares.use(handle)
    },
    configurePreviewServer(server) {
      server.middlewares.use(handle)
    },
  }
}
