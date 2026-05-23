import express from 'express'
import Anthropic from '@anthropic-ai/sdk'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3000

app.use(express.json())
app.use(express.urlencoded({ extended: false }))

const getCookie = (req, name) => {
  const cookies = req.headers.cookie?.split(';') || []
  const match = cookies.find(c => c.trim().startsWith(name + '='))
  return match ? decodeURIComponent(match.split('=')[1].trim()) : null
}

const loginPage = (error = false) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Vision Board</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #0f0f13;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    .card {
      background: #1a1a24;
      border: 1px solid #2a2a38;
      border-radius: 16px;
      padding: 40px;
      width: 100%;
      max-width: 360px;
    }
    h1 {
      color: #fff;
      font-size: 1.4rem;
      font-weight: 600;
      margin-bottom: 8px;
    }
    p {
      color: #888;
      font-size: 0.9rem;
      margin-bottom: 28px;
    }
    input {
      width: 100%;
      padding: 12px 16px;
      background: #0f0f13;
      border: 1px solid ${error ? '#e05a5a' : '#2a2a38'};
      border-radius: 10px;
      color: #fff;
      font-size: 1rem;
      outline: none;
      margin-bottom: 12px;
      transition: border-color 0.2s;
    }
    input:focus { border-color: #6366f1; }
    .error { color: #e05a5a; font-size: 0.85rem; margin-bottom: 12px; }
    button {
      width: 100%;
      padding: 12px;
      background: #6366f1;
      color: #fff;
      border: none;
      border-radius: 10px;
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.2s;
    }
    button:hover { background: #4f52d3; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Vision Board</h1>
    <p>Enter your password to continue.</p>
    <form method="POST" action="/auth">
      <input type="password" name="password" placeholder="Password" autofocus autocomplete="current-password" />
      ${error ? '<div class="error">Incorrect password, try again.</div>' : ''}
      <button type="submit">Continue</button>
    </form>
  </div>
</body>
</html>`

const AUTH_ENABLED = !!process.env.APP_PASSWORD
const SERVER_START = new Date().toISOString()

app.get('/healthz', (_req, res) => {
  res.json({ ok: true, authEnabled: AUTH_ENABLED, startedAt: SERVER_START })
})

app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
  next()
})

app.use((req, res, next) => {
  if (!AUTH_ENABLED) return next()
  if (req.path === '/auth') return next()

  const token = getCookie(req, 'auth_token')
  if (token === process.env.APP_PASSWORD) return next()

  res.status(401).send(loginPage())
})

app.post('/auth', (req, res) => {
  const password = process.env.APP_PASSWORD
  if (!password) return res.redirect('/')

  if (req.body.password === password) {
    const secure = req.secure || req.headers['x-forwarded-proto'] === 'https'
    res.setHeader('Set-Cookie', `auth_token=${encodeURIComponent(password)}; Path=/; HttpOnly; SameSite=Strict${secure ? '; Secure' : ''}`)
    res.redirect('/')
  } else {
    res.status(401).send(loginPage(true))
  }
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
  console.log(`Auth: ${AUTH_ENABLED ? 'ENABLED (APP_PASSWORD set)' : 'DISABLED (no APP_PASSWORD env var)'}`)
  console.log(`Build: ${new Date().toISOString()}`)
})
