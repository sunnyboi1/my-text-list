import express from 'express'
import Anthropic from '@anthropic-ai/sdk'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3000

app.use(express.json())

app.use((req, res, next) => {
  const password = process.env.APP_PASSWORD
  if (!password) return next()

  const auth = req.headers.authorization
  if (!auth?.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Vision Board"')
    return res.status(401).send('Authentication required')
  }

  const [, pwd] = Buffer.from(auth.slice(6), 'base64').toString().split(':')
  if (pwd !== password) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Vision Board"')
    return res.status(401).send('Invalid password')
  }

  next()
})

app.use(express.static(join(__dirname, 'dist')))

app.post('/api/chat', async (req, res) => {
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const { messages, scenarios } = req.body

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    const scenarioContext = scenarios.length > 0
      ? scenarios.map(s =>
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
  } catch (err) {
    console.error('API error:', err)
    res.status(500).end(`data: ${JSON.stringify({ error: err.message })}\n\n`)
  }
})

// SPA fallback — all unmatched routes serve the React app
app.get('*', (_req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'))
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
