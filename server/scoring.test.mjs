import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { createScoringMiddleware, scoreDrawing } from './scoring.mjs'

const imageBase64 = (await readFile(new URL('../public/ai-test-samples/apple_good.png', import.meta.url))).toString('base64')
const input = { theme: 'りんご', imageBase64 }
const valid = { score: 85, reason: '丸みが似ていますが、上部のくぼみを表現するとさらに良くなります。' }
const success = data => Response.json({ choices: [{ message: { content: JSON.stringify(data) } }] })

test('Hugging Faceに画像・採点基準を送り、従来の結果形式を返す', async () => {
  const result = await scoreDrawing(input, {
    apiKey: 'test-secret',
    model: 'test-vision',
    fetchImpl: async (url, options) => {
      assert.equal(url, 'https://router.huggingface.co/v1/chat/completions')
      assert.equal(options.headers.Authorization, 'Bearer test-secret')
      const body = JSON.parse(options.body)
      assert.equal(body.model, 'test-vision')
      assert.equal(body.response_format.type, 'json_object')
      assert.match(body.messages[1].content[0].text, /りんご/)
      assert.equal(body.messages[1].content[1].image_url.url, `data:image/png;base64,${imageBase64}`)
      assert.equal(body.temperature, 0)
      return success(valid)
    },
  })
  assert.deepEqual(result, valid)
})

test('503と通信失敗は再試行し、最大3回で終了する', async () => {
  for (const failure of ['503', 'network']) {
    let calls = 0
    const waits = []
    await assert.rejects(scoreDrawing(input, {
      apiKey: 'test', sleep: async ms => { waits.push(ms) },
      fetchImpl: async () => {
        calls++
        if (failure === 'network') throw new Error('network failed')
        return new Response('unavailable', { status: 503 })
      },
    }), err => err.status === (failure === '503' ? 503 : 504))
    assert.equal(calls, 3)
    assert.equal(waits.length, 2)
    assert.ok(waits[1] > waits[0])
  }
})

test('一時的な503の後に成功する', async () => {
  let calls = 0
  assert.deepEqual(await scoreDrawing(input, {
    apiKey: 'test', sleep: async () => {},
    fetchImpl: async () => ++calls === 1 ? new Response('', { status: 503 }) : success(valid),
  }), valid)
  assert.equal(calls, 2)
})

test('認証失敗・利用上限・モデル設定エラーは再試行しない', async () => {
  for (const status of [400, 401, 402, 403, 404, 429]) {
    let calls = 0
    await assert.rejects(scoreDrawing(input, {
      apiKey: 'secret', fetchImpl: async () => { calls++; return new Response('secret upstream error', { status }) },
    }), err => err.status === (status === 402 ? 402 : status === 429 ? 429 : 502) && !err.message.includes('secret'))
    assert.equal(calls, 1)
  }
})

test('不正なJSON・点数・理由を採点結果として返さない', async () => {
  for (const value of [{ score: 101, reason: '形' }, { score: 0.5, reason: '形' }, { score: 50, reason: '' }, { score: 50, reason: 'あ'.repeat(81) }, null]) {
    await assert.rejects(scoreDrawing(input, { apiKey: 'test', fetchImpl: async () => success(value) }), err => err.status === 502)
  }
  await assert.rejects(scoreDrawing(input, { apiKey: 'test', fetchImpl: async () => Response.json({ choices: [{ message: { content: 'not JSON' } }] }) }), err => err.status === 502)
})

test('不正な入力とキー未設定では外部APIを呼ばない', async () => {
  let calls = 0
  const options = { apiKey: 'test', fetchImpl: async () => { calls++; return success(valid) } }
  for (const value of [null, { ...input, theme: '' }, { ...input, theme: 'a'.repeat(201) }, { ...input, imageBase64: 'notPNG' }, { ...input, imageBase64: 'a'.repeat(4 * 1024 * 1024 + 4) }]) {
    await assert.rejects(scoreDrawing(value, options), err => err.status === 400)
  }
  await assert.rejects(scoreDrawing(input, { ...options, apiKey: '' }), err => err.status === 503)
  assert.equal(calls, 0)
})

test('HTTPエンドポイントの成功・エラー・ルーティング', async t => {
  const handle = createScoringMiddleware({ apiKey: 'server-secret', fetchImpl: async () => success(valid) })
  const server = createServer((req, res) => { void handle(req, res, () => { res.statusCode = 404; res.end() }) })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  t.after(() => new Promise(resolve => server.close(resolve)))
  const url = `http://127.0.0.1:${server.address().port}/api/judge-drawing`
  const headers = { 'Content-Type': 'application/json' }
  const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(input) })
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('cache-control'), 'no-store')
  assert.deepEqual(await response.json(), valid)
  assert.equal((await fetch(url)).status, 405)
  assert.equal((await fetch(url, { method: 'POST', body: '{}' })).status, 415)
  assert.equal((await fetch(url, { method: 'POST', headers, body: '{' })).status, 400)
  assert.equal((await fetch(url, { method: 'POST', headers: { ...headers, 'Sec-Fetch-Site': 'cross-site' }, body: '{}' })).status, 403)
  assert.equal((await fetch(url + '/missing')).status, 404)
})
