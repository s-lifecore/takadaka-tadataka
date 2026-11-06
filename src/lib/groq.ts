import type { AIResult } from '../types'

export async function judgeDrawing(imageBase64: string, theme: string): Promise<AIResult> {
  let response: Response
  try {
    response = await fetch('/api/judge-drawing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64, theme }),
      signal: AbortSignal.timeout(105_000),
    })
  } catch {
    throw new Error('採点サーバーに接続できませんでした。時間をおいて再度お試しください')
  }
  let data
  try {
    data = await response.json()
  } catch {
    throw new Error('採点APIに接続できません。サーバーと /api の接続設定を確認してください')
  }
  if (!response.ok) throw new Error(data?.error || 'AI判定に失敗しました')
  if (
    !data ||
    typeof data.score !== 'number' ||
    !Number.isFinite(data.score) ||
    data.score < 0 ||
    data.score > 100 ||
    typeof data.reason !== 'string' ||
    !data.reason.trim() ||
    [...data.reason].length > 80
  ) {
    throw new Error('AIの回答形式が不正です')
  }
  return { score: Number(data.score.toFixed(5)), reason: data.reason }
}
