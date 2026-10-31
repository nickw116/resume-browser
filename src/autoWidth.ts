/**
 * 按文本长度估算表格列宽 —— 避免固定列宽把内容截断（吞字）。
 * 中日韩字符按两倍宽度估算，拉丁字符按常规宽度估算。
 */

/** 判定是否为宽字符（中日韩 / 全角） */
function isWide(ch: string): boolean {
  const code = ch.codePointAt(0) ?? 0;
  return (
    (code >= 0x1100 && code <= 0x115f) ||
    (code >= 0x2e80 && code <= 0xa4cf) ||
    (code >= 0xac00 && code <= 0xd7a3) ||
    (code >= 0xf900 && code <= 0xfaff) ||
    (code >= 0xfe30 && code <= 0xfe4f) ||
    (code >= 0xff00 && code <= 0xff60) ||
    (code >= 0xffe0 && code <= 0xffe6)
  );
}

/** 文本像素宽度估算 */
export function textWidth(text: string, cjk = 13, latin = 7): number {
  let w = 0;
  for (const ch of text ?? "") {
    w += isWide(ch) ? cjk : latin;
  }
  return w;
}

export interface AutoWidthOptions {
  /** 最小宽度 */
  min?: number;
  /** 最大宽度 */
  max?: number;
  /** 左右内边距 */
  pad?: number;
  cjk?: number;
  latin?: number;
}

/** 单段文本 → 列宽 */
export function autoWidth(text: string, opts: AutoWidthOptions = {}): number {
  const { min = 72, max = 260, pad = 28, cjk = 13, latin = 7 } = opts;
  return Math.min(max, Math.max(min, textWidth(text, cjk, latin) + pad));
}

/** 一列数据的最大文本长度 → 列宽 */
export function columnWidth<T>(
  rows: T[],
  get: (row: T) => string | null | undefined,
  header = "",
  opts: AutoWidthOptions = {},
): number {
  let longest = header;
  let longestWidth = textWidth(longest);
  for (const row of rows ?? []) {
    const t = get(row) ?? "";
    const w = textWidth(t);
    if (w > longestWidth) {
      longestWidth = w;
      longest = t;
    }
  }
  return autoWidth(longest, opts);
}
