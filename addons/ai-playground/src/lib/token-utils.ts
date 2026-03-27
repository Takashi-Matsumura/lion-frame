/**
 * テキストのトークン数を推定する
 * 日本語: ~1.5文字/トークン、英語: ~4文字/トークン、混在: ~2文字/トークン
 */
export function estimateTokenCount(text: string): number {
  if (!text) return 0;

  const japaneseChars = (text.match(/[\u3000-\u9fff\uf900-\ufaff]/g) || []).length;
  const totalChars = text.length;

  if (japaneseChars > totalChars * 0.3) {
    // 日本語が多い場合
    return Math.ceil(totalChars / 1.5);
  } else if (japaneseChars > totalChars * 0.1) {
    // 混在の場合
    return Math.ceil(totalChars / 2);
  } else {
    // 英語が多い場合
    return Math.ceil(totalChars / 4);
  }
}
