// src/lib/gemini.ts

import {
  getAI,
  getGenerativeModel,
  GoogleAIBackend,
  Schema,
} from "firebase/ai";

import { app } from "./firebase";

import { createScoringPrompt } from "./aiPrompt";

import type {
  AIResult,
  AIInput,
} from "../types/ai";


// ① Firebase AI Logicを初期化
const ai = getAI(app, {
  backend: new GoogleAIBackend(),
});


// ② AIから返してもらうJSON形式を指定
const responseSchema = Schema.object({
  properties: {
    score: Schema.integer(),
    reason: Schema.string(),
  },
});


// ③ 使用するGeminiモデルを設定
const modelName =
  import.meta.env.VITE_GEMINI_MODEL ||
  "gemini-2.5-flash";

const model = getGenerativeModel(ai, {
  model: modelName,

  generationConfig: {
    responseMimeType: "application/json",
    responseSchema: responseSchema,
    temperature: 0,
  },
});


// ④ AIの回答が正しいデータか確認する
function validateResult(data: unknown): AIResult {

  if (
    typeof data !== "object" ||
    data === null
  ) {
    throw new Error("AIの回答形式が不正です");
  }

  const obj = data as Record<string, unknown>;

  // scoreの確認
  if (
    typeof obj.score !== "number" ||
    !Number.isInteger(obj.score) ||
    obj.score < 0 ||
    obj.score > 100
  ) {
    throw new Error("AIのスコアが不正です");
  }

  // reasonの確認
  if (
    typeof obj.reason !== "string" ||
    obj.reason.trim().length === 0
  ) {
    throw new Error("AIの採点理由が不正です");
  }

  return {
    score: obj.score,
    reason: obj.reason,
  };
}


// ⑤ AI判定を実行する関数
export async function judgeDrawing({
  theme,
  imageBase64,
}: AIInput): Promise<AIResult> {

  // 入力の確認
  if (!theme.trim()) {
    throw new Error("お題が設定されていません");
  }

  if (!imageBase64.trim()) {
    throw new Error("画像がありません");
  }

  // PNGのData URLからBase64部分を取り出す
  const base64 = imageBase64.trim().replace(
    /^data:image\/png;base64,/,
    ""
  );

  // Base64形式であることを確認
  if (
    !base64 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)
  ) {
    throw new Error("PNG画像の形式が不正です");
  }

  // プロンプト作成
  const prompt = createScoringPrompt(theme);

  // Geminiにお題と画像を送信
  const response = await model.generateContent([
    prompt,
    {
      inlineData: {
        mimeType: "image/png",
        data: base64,
      },
    },
  ]);

  // Geminiの返答を取得
  const text = response.response.text();

  // JSONとして解析
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(
      "Geminiの回答をJSONとして読み取れません"
    );
  }

  // データの形式を検証して返す
  return validateResult(parsed);
}
