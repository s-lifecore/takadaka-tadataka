import type { AIResult } from '../types'

// TODO(AI担当): Firebase AI Logic 経由に変更してAPIキーをフロントから除去する
const GEMINI_MODEL = 'gemini-3.6-flash'
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY

const RUBRIC = `
採点基準（theme: りんご）:
- 80-100: 全体的な丸みとへた部分が認識でき、りんごとはっきりわかる
- 50-79: 丸い形はあるが特徴が薄い
- 0-49: 形がほぼ判別できない

必ずJSON形式で返すこと: { "score": number, "guess": string, "reason": string }
`

export async function judgeDrawing(
  imageBase64: string,
  theme: string,
): Promise<AIResult> {
  const body = {
    contents: [
      {
        parts: [
          {
            text: `お題は「${theme}」です。この絵を採点してください。\n${RUBRIC}`,
          },
          { inline_data: { mime_type: 'image/png', data: imageBase64 } },
        ],
      },
    ],
    generationConfig: { response_mime_type: 'application/json' },
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${API_KEY}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
  )

  if (!res.ok) throw new Error(`Gemini API error: ${res.status}`)

  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
  return JSON.parse(text) as AIResult
}
