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

export async function judgeDrawing(imageBase64: string, theme: string): Promise<AIResult> {
  if (!API_KEY?.trim()) {
    throw new Error('Gemini APIキーが未設定です。VITE_GEMINI_API_KEYを設定してください。')
  }
  const body = {
    contents: [
      {
        parts: [
          { text: `お題は「${theme}」です。この絵を採点してください。\n${RUBRIC}` },
          { inline_data: { mime_type: 'image/png', data: imageBase64 } },
        ],
      },
    ],
    generationConfig: { response_mime_type: 'application/json' },
  }

  let res: Response
  for (let attempt = 0; ; attempt++) {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': API_KEY },
        body: JSON.stringify(body),
      },
    )
    if (res.status !== 503 || attempt >= 2) break
    // 混雑時だけ最大2回再試行し、連続リクエストを避ける。
    await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** attempt + Math.random() * 500))
  }

  if (res.status === 503) {
    throw new Error(
      'Geminiが一時的に混雑しているため採点できませんでした（503）。少し時間を置いて、この結果ページを再読み込みしてください。',
    )
  }
  if (!res.ok) {
    const messages: Record<number, string> = {
      400: '採点リクエストに問題があります。画像やAPIの設定を確認してください。',
      401: 'Geminiの認証に失敗しました。APIキーの設定を確認してください。',
      403: 'Geminiを利用する権限がありません。APIキーや利用権限の設定を確認してください。',
      404: '採点に使用するGeminiのモデルが見つかりません。モデル名や利用可能なモデルを確認してください。',
      408: 'Geminiへのリクエストが時間切れになりました。少し時間を置いて、この結果ページを再読み込みしてください。',
      429: 'Geminiの利用上限に達したため採点できませんでした。少し時間を置いて、この結果ページを再読み込みしてください。',
      500: 'Gemini内部でエラーが発生しました。少し時間を置いて、この結果ページを再読み込みしてください。',
      502: 'Geminiとの通信でエラーが発生しました。少し時間を置いて、この結果ページを再読み込みしてください。',
      504: 'Geminiからの応答が時間切れになりました。少し時間を置いて、この結果ページを再読み込みしてください。',
    }
    const message =
      messages[res.status] ??
      'Geminiでエラーが発生したため採点できませんでした。少し時間を置いて、この結果ページを再読み込みしてください。'
    throw new Error(`${message}（${res.status}）`)
  }

  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
  return JSON.parse(text) as AIResult
}
