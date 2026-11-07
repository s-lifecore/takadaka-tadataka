import assert from 'node:assert/strict'
import test from 'node:test'

import { scoreDrawing } from './groq.js'

const imageBase64 = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  Buffer.alloc(16),
]).toString('base64')
const input = { theme: 'りんご', imageBase64 }
const valid = { score: 85.123456, reason: '全体の丸みがりんごらしく伝わっているよ。' }
const success = (value: unknown) =>
  Response.json({ choices: [{ message: { content: JSON.stringify(value) } }] })

test('Groqに画像と採点基準を送り、採点結果を返す', async () => {
  const result = await scoreDrawing(input, {
    apiKey: 'test-secret',
    model: 'test-vision',
    fetchImpl: async (url, options) => {
      assert.equal(url, 'https://api.groq.com/openai/v1/chat/completions')
      assert.equal(
        options?.headers && new Headers(options.headers).get('Authorization'),
        'Bearer test-secret',
      )
      const body = JSON.parse(String(options?.body))
      assert.equal(body.model, 'test-vision')
      assert.equal(body.response_format.type, 'json_object')
      assert.match(body.messages[1].content[0].text, /りんご/)
      assert.equal(body.messages[1].content[1].image_url.url, `data:image/png;base64,${imageBase64}`)
      return success(valid)
    },
  })
  assert.deepEqual(result, { score: 85.12346, reason: valid.reason })
})

test('一時的な失敗を最大3回まで再試行する', async () => {
  let calls = 0
  const waits: number[] = []
  await assert.rejects(
    scoreDrawing(input, {
      apiKey: 'test-secret',
      sleep: async (milliseconds) => {
        waits.push(milliseconds)
      },
      fetchImpl: async () => {
        calls += 1
        return new Response('unavailable', { status: 503 })
      },
    }),
    (error: unknown) => error instanceof Error && 'status' in error && error.status === 503,
  )
  assert.equal(calls, 3)
  assert.deepEqual(waits, [1000, 2000])
})

test('認証失敗や利用上限では再試行しない', async () => {
  for (const status of [401, 402, 403, 429]) {
    let calls = 0
    await assert.rejects(
      scoreDrawing(input, {
        apiKey: 'test-secret',
        fetchImpl: async () => {
          calls += 1
          return new Response('upstream error', { status })
        },
      }),
      (error: unknown) => error instanceof Error && 'status' in error,
    )
    assert.equal(calls, 1)
  }
})

test('不正な入力とキー未設定ではGroqを呼び出さない', async () => {
  let calls = 0
  const fetchImpl = async () => {
    calls += 1
    return success(valid)
  }
  await assert.rejects(
    scoreDrawing({ ...input, theme: '' }, { apiKey: 'test-secret', fetchImpl }),
    (error: unknown) => error instanceof Error && 'status' in error && error.status === 400,
  )
  await assert.rejects(
    scoreDrawing(input, { apiKey: '', fetchImpl }),
    (error: unknown) => error instanceof Error && 'status' in error && error.status === 503,
  )
  assert.equal(calls, 0)
})

test('不正なAI回答を保存可能な結果として返さない', async () => {
  await assert.rejects(
    scoreDrawing(input, {
      apiKey: 'test-secret',
      fetchImpl: async () => success({ score: 101, reason: '不正な点数' }),
    }),
    (error: unknown) => error instanceof Error && 'status' in error && error.status === 502,
  )
})
