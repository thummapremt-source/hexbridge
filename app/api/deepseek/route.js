import { NextResponse } from 'next/server'

const getModel = () => process.env.DEEPSEEK_MODEL || 'deepseek-chat'
const getApiUrl = () =>
  process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1/chat/completions'

export async function GET() {
  const configured = Boolean(process.env.DEEPSEEK_API_KEY)

  return NextResponse.json(
    {
      ok: configured,
      model: getModel(),
      apiUrl: getApiUrl(),
      message: configured
        ? 'DeepSeek is configured.'
        : 'Missing DEEPSEEK_API_KEY. Add it to your environment and restart the app.',
    },
    { status: configured ? 200 : 503 }
  )
}

export async function POST(request) {
  try {
    const apiKey = process.env.DEEPSEEK_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'Missing DEEPSEEK_API_KEY. Add it to your environment and restart the app.',
        },
        { status: 500 }
      )
    }

    const body = await request.json()
    const inputPrompt = typeof body?.prompt === 'string' ? body.prompt : ''
    const messages = Array.isArray(body?.messages)
      ? body.messages
      : [{ role: 'user', content: inputPrompt || 'Hello' }]

    const response = await fetch(getApiUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: body?.model || getModel(),
        messages,
        temperature: body?.temperature ?? 0.7,
        max_tokens: body?.max_tokens ?? 800,
        stream: false,
      }),
    })

    const text = await response.text()

    if (!response.ok) {
      let errorMessage = 'DeepSeek API request failed.'
      try {
        const parsed = JSON.parse(text)
        errorMessage = parsed?.error?.message || parsed?.message || errorMessage
      } catch {
        errorMessage = text || errorMessage
      }

      return NextResponse.json({ error: errorMessage }, { status: response.status })
    }

    let data
    try {
      data = JSON.parse(text)
    } catch {
      return NextResponse.json({ error: 'Invalid DeepSeek response.' }, { status: 500 })
    }

    const content = data?.choices?.[0]?.message?.content || ''

    return NextResponse.json({
      content,
      model: data?.model || body?.model || getModel(),
      usage: data?.usage || null,
    })
  } catch (error) {
    console.error('DeepSeek API error:', error)
    return NextResponse.json(
      {
        error: error?.message || 'Unable to reach DeepSeek at the moment.',
      },
      { status: 500 }
    )
  }
}
