// src/types/ai.ts

// AIの採点結果
export type AIResult = {
  score: number;  // 0～100の一致度（%）
  reason: string; // AIの採点理由
};

// AI判定に必要な入力
export type AIInput = {
  theme: string;
  imageBase64: string;
};