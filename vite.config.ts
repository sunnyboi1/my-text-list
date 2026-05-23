import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import type { IncomingMessage, ServerResponse } from 'node:http'

function apiPlugin() {
  return {
    name: 'api-server',
    configureServer(server: any) {
      server.middlewares.use('/api/chat', async (req: IncomingMessage, res: ServerResponse) => {
        if (req.method === 'OPTIONS') {
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
          res.statusCode = 204
          res.end()
          return
        }
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end('Method Not Allowed')
          return
        }

        let body = ''
        req.on('data', (chunk: Buffer) => { body += chunk.toString() })
        req.on('end', async () => {
          try {
            const { default: Anthropic } = await import('@anthropic-ai/sdk')
            const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
            const { messages, scenarios } = JSON.parse(body)

            res.setHeader('Content-Type', 'text/event-stream')
            res.setHeader('Cache-Control', 'no-cache')
            res.setHeader('Connection', 'keep-alive')
            res.setHeader('Access-Control-Allow-Origin', '*')

            const scenarioContext = scenarios.length > 0
              ? scenarios.map((s: any) =>
                  `### ${s.title}${s.isChosen ? ' [CHOSEN PATH]' : ''}\n${s.description}\n**Pros:** ${s.pros.filter(Boolean).join(', ') || 'none listed'}\n**Cons:** ${s.cons.filter(Boolean).join(', ') || 'none listed'}\n**Reasoning:** ${s.reasoning || 'none listed'}`
                ).join('\n\n')
              : 'No scenarios added yet.'

            const stream = await client.messages.stream({
              model: 'claude-opus-4-7',
              max_tokens: 2048,
              system: `You are a thoughtful advisor helping the user think through major life decisions on their vision board / timeline. You have full context of their scenarios below. Be honest, incisive, and supportive. Ask good questions. Help them see patterns, risks, and possibilities they might be missing.\n\nCurrent scenarios:\n\n${scenarioContext}`,
              messages,
            })

            for await (const chunk of stream) {
              if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
                res.write(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`)
              }
            }

            res.write('data: [DONE]\n\n')
            res.end()
          } catch (err: any) {
            console.error('API error:', err)
            res.statusCode = 500
            res.end(`data: ${JSON.stringify({ error: err.message || 'Unknown error' })}\n\n`)
          }
        })
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), apiPlugin()],
})
