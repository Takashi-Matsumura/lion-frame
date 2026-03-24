// ── Excalidraw → PDF（ブラウザ印刷方式: マークダウンと同じHQ方式） ──

export async function exportExcalidrawToPdf(
  content: string,
  title: string,
  templateId?: string,
): Promise<void> {
  if (!content) return;

  const template = templateId === "__none__" ? null : await fetchTemplate(templateId);

  const { exportToBlob } = await import("@excalidraw/excalidraw");

  let data: { elements: never[]; appState: Record<string, unknown> };
  try {
    data = JSON.parse(content);
  } catch {
    return;
  }

  const elements = data.elements ?? [];
  if (elements.length === 0) return;

  const blob = await exportToBlob({
    elements,
    appState: {
      ...data.appState,
      exportWithDarkMode: false,
      exportBackground: true,
      viewBackgroundColor: "#ffffff",
    },
    files: null,
    getDimensions: () => ({ width: 1920, height: 1080, scale: 2 }),
  });

  // Blob → Data URL に変換（印刷ウィンドウで使用するため）
  const dataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });

  // テンプレート設定
  const mT = template?.marginTop ?? 10;
  const mB = template?.marginBottom ?? 10;
  const mL = template?.marginLeft ?? 10;
  const mR = template?.marginRight ?? 10;

  const hasHeader = !!(template && (template.headerLeft || template.headerCenter || template.headerRight));
  const hasFooter = !!(template && (template.footerLeft || template.footerCenter || template.footerRight));

  const styles = buildExcalidrawPrintStyles(mT, mB, mL, mR, hasHeader, hasFooter);
  const headerFooterHtml = template ? buildPrintHeaderFooterHtml(template, title) : "";

  const headerSpacerHtml = hasHeader ? `<thead><tr><td class="header-spacer"></td></tr></thead>` : "";
  const footerSpacerHtml = hasFooter ? `<tfoot><tr><td class="footer-spacer"></td></tr></tfoot>` : "";

  // 画像をページ中央に配置
  const imgHtml = `<div class="excalidraw-container"><img src="${dataUrl}" /></div>`;

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    throw new Error("ポップアップがブロックされました。ポップアップを許可してください。");
  }

  printWindow.document.open();
  printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>${styles}</style>
</head>
<body>
  ${headerFooterHtml}
  <table class="layout-table">
    ${headerSpacerHtml}
    ${footerSpacerHtml}
    <tbody><tr><td class="content-area">${imgHtml}</td></tr></tbody>
  </table>
</body>
</html>`);
  printWindow.document.close();

  await new Promise<void>((resolve) => {
    printWindow.onload = () => resolve();
    setTimeout(resolve, 500);
  });

  printWindow.print();
}

/**
 * Excalidraw 印刷用スタイル（画像を1ページに収める）
 */
function buildExcalidrawPrintStyles(mT: number, mB: number, mL: number, mR: number, hasHeader: boolean, hasFooter: boolean): string {
  const headerHeight = hasHeader ? 12 : 0;
  const footerHeight = hasFooter ? 10 : 0;

  return `
  @page {
    size: A4 landscape;
    margin: ${mT}mm ${mR}mm ${mB}mm ${mL}mm;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 0;
    background: #ffffff;
    font-family: -apple-system, BlinkMacSystemFont, 'Hiragino Sans', 'Noto Sans JP', sans-serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .layout-table { width: 100%; border-collapse: collapse; }
  .layout-table td, .layout-table th { border: none; padding: 0; vertical-align: top; }
  .layout-table thead { display: table-header-group; }
  .layout-table tfoot { display: table-footer-group; }
  .header-spacer { height: ${headerHeight}mm; }
  .footer-spacer { height: ${footerHeight}mm; }

  .pdf-header {
    position: fixed;
    top: 0; left: 0; right: 0;
    height: ${headerHeight - 2}mm;
    padding: 1mm 0;
    display: flex;
    align-items: center;
    color: #646464;
    border-bottom: 0.5px solid #c8c8c8;
  }
  .pdf-header-left { flex: 1; text-align: left; }
  .pdf-header-center { flex: 1; text-align: center; }
  .pdf-header-right { flex: 1; text-align: right; }
  .pdf-footer {
    position: fixed;
    bottom: 0; left: 0; right: 0;
    height: ${footerHeight - 2}mm;
    padding: 1mm 0;
    display: flex;
    align-items: center;
    color: #646464;
    border-top: 0.5px solid #c8c8c8;
  }
  .pdf-footer-left { flex: 1; text-align: left; }
  .pdf-footer-center { flex: 1; text-align: center; }
  .pdf-footer-right { flex: 1; text-align: right; }

  .excalidraw-container {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: calc(100vh - ${mT + mB + headerHeight + footerHeight}mm);
  }
  .excalidraw-container img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }
  `;
}

// ── テンプレート適用 ──

interface PdfTemplateData {
  id?: string;
  name?: string;
  headerLeft?: string | null;
  headerCenter?: string | null;
  headerRight?: string | null;
  footerLeft?: string | null;
  footerCenter?: string | null;
  footerRight?: string | null;
  headerFontSize: number;
  footerFontSize: number;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
}

export type { PdfTemplateData };

export async function fetchTemplate(templateId?: string): Promise<PdfTemplateData | null> {
  try {
    const url = templateId
      ? `/api/pdf/templates/${templateId}`
      : "/api/pdf/templates/default";
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return data.template ?? null;
  } catch {
    return null;
  }
}

// ── マークダウン → PDF（ブラウザ印刷エンジン方式）: ブラウザ印刷エンジン方式 ──

/**
 * CSS @page + break-inside: avoid を使ったブラウザネイティブ印刷方式
 * ブラウザの印刷レイアウトエンジンが改ページを自動処理するため、
 * テーブル行の途中での切断や見出しの孤立が発生しない
 *
 * レイアウト:
 * - @page margin でヘッダー/フッター領域を確保
 * - コンテンツは @page margin の内側に自動配置（ブラウザが管理）
 * - ヘッダー/フッターは position: fixed でページ端基準で配置
 */
function buildPrintStyles(mT: number, mB: number, mL: number, mR: number, hasHeader: boolean, hasFooter: boolean): string {
  // ヘッダー/フッター領域の高さ
  const headerHeight = hasHeader ? 12 : 0;  // mm（テキスト + 区切り線 + 余白）
  const footerHeight = hasFooter ? 10 : 0;  // mm

  return `
  @page {
    size: A4;
    margin: ${mT}mm ${mR}mm ${mB}mm ${mL}mm;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 0;
    background: #ffffff;
    font-family: -apple-system, BlinkMacSystemFont, 'Hiragino Sans', 'Noto Sans JP', sans-serif;
    font-size: 13px; line-height: 1.7; color: #1a1a1a;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* ── レイアウト用テーブル（thead/tfoot がページ毎に自動繰り返し） ── */
  .layout-table { width: 100%; border-collapse: collapse; }
  .layout-table td, .layout-table th { border: none; padding: 0; vertical-align: top; }
  .layout-table thead { display: table-header-group; }
  .layout-table tfoot { display: table-footer-group; }
  .header-spacer { height: ${headerHeight}mm; }
  .footer-spacer { height: ${footerHeight}mm; }

  /* ── ヘッダー/フッター（position: fixed で各ページに表示） ── */
  .pdf-header {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: ${headerHeight - 2}mm;
    padding: 1mm 0 1mm 0;
    display: flex;
    align-items: center;
    color: #646464;
    border-bottom: 0.5px solid #c8c8c8;
  }
  .pdf-header-left { flex: 1; text-align: left; }
  .pdf-header-center { flex: 1; text-align: center; }
  .pdf-header-right { flex: 1; text-align: right; }
  .pdf-footer {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: ${footerHeight - 2}mm;
    padding: 1mm 0 1mm 0;
    display: flex;
    align-items: center;
    color: #646464;
    border-top: 0.5px solid #c8c8c8;
  }
  .pdf-footer-left { flex: 1; text-align: left; }
  .pdf-footer-center { flex: 1; text-align: center; }
  .pdf-footer-right { flex: 1; text-align: right; }

  /* ── コンテンツスタイル ── */
  h1 { font-size: 22px; font-weight: 700; margin: 16px 0 8px; border-bottom: 1px solid #e0e0e0; padding-bottom: 6px; }
  h2 { font-size: 18px; font-weight: 700; margin: 14px 0 6px; border-bottom: 1px solid #e0e0e0; padding-bottom: 4px; }
  h3 { font-size: 16px; font-weight: 600; margin: 12px 0 4px; }
  h4 { font-size: 14px; font-weight: 600; margin: 10px 0 4px; }
  p { margin: 8px 0; }
  code { background: #f0f0f0; padding: 1px 4px; border-radius: 3px; font-size: 0.9em; font-family: 'SF Mono', 'Fira Code', monospace; }
  pre { background: #f5f5f5; padding: 12px; border-radius: 6px; overflow-x: auto; margin: 10px 0; }
  pre code { background: none; padding: 0; }
  blockquote { border-left: 3px solid #ccc; padding-left: 12px; color: #555; margin: 10px 0; font-style: italic; }
  ul, ol { padding-left: 24px; margin: 8px 0; }
  li { margin: 3px 0; }
  hr { border: none; border-top: 1px solid #ddd; margin: 16px 0; }

  /* コンテンツ内のテーブル（レイアウトテーブルと区別） */
  .content-area table { border-collapse: collapse; width: 100%; margin: 10px 0; }
  .content-area th, .content-area td { border: 1px solid #ddd; padding: 6px 10px; text-align: left; }
  .content-area th { background: #f5f5f5; font-weight: 600; }
  strong { font-weight: 700; }
  em { font-style: italic; }
  a { color: #2563eb; text-decoration: underline; }

  /* ── 改ページ制御 ── */
  h1, h2, h3, h4, h5, h6 {
    break-after: avoid;
    page-break-after: avoid;
  }
  h1, h2, h3, h4, h5, h6, .content-area tr, blockquote, pre, li, p {
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .content-area table {
    break-inside: auto;
    page-break-inside: auto;
  }
  .content-area thead { display: table-header-group; }
  `;
}

function buildPrintPlaceholder(text: string, title: string): string {
  const today = new Date().toLocaleDateString("ja-JP", {
    year: "numeric", month: "2-digit", day: "2-digit",
  });
  // HQモードではページ番号のCSS counterは使えないため、
  // %page / %total はブラウザ印刷設定のヘッダー/フッターに委ねる
  return text
    .replace(/%page/g, "")
    .replace(/%total/g, "")
    .replace(/%title/g, title)
    .replace(/%date/g, today)
    .replace(/\s*\/\s*$/g, "")   // 末尾の " / " を除去
    .replace(/^\s*\/\s*/g, "")   // 先頭の " / " を除去
    .replace(/\|\s*\|\s*/g, "|") // 空の区切りを整理
    .trim();
}

function buildPrintHeaderFooterHtml(template: PdfTemplateData, title: string): string {
  let html = "";

  const hasHeader = template.headerLeft || template.headerCenter || template.headerRight;
  const hasFooter = template.footerLeft || template.footerCenter || template.footerRight;

  if (hasHeader) {
    const hFont = `font-size: ${template.headerFontSize}pt;`;
    html += `<div class="pdf-header" style="${hFont}">`;
    html += `<div class="pdf-header-left">${template.headerLeft ? buildPrintPlaceholder(template.headerLeft, title) : ""}</div>`;
    html += `<div class="pdf-header-center">${template.headerCenter ? buildPrintPlaceholder(template.headerCenter, title) : ""}</div>`;
    html += `<div class="pdf-header-right">${template.headerRight ? buildPrintPlaceholder(template.headerRight, title) : ""}</div>`;
    html += `</div>`;
  }

  if (hasFooter) {
    const fFont = `font-size: ${template.footerFontSize}pt;`;
    html += `<div class="pdf-footer" style="${fFont}">`;
    html += `<div class="pdf-footer-left">${template.footerLeft ? buildPrintPlaceholder(template.footerLeft, title) : ""}</div>`;
    html += `<div class="pdf-footer-center">${template.footerCenter ? buildPrintPlaceholder(template.footerCenter, title) : ""}</div>`;
    html += `<div class="pdf-footer-right">${template.footerRight ? buildPrintPlaceholder(template.footerRight, title) : ""}</div>`;
    html += `</div>`;
  }

  return html;
}

/**
 * 高品質マークダウン→PDF エクスポート
 * ブラウザの印刷ダイアログ（PDF保存）を利用
 */
export async function exportMarkdownToPdfHQ(
  content: string,
  title: string,
  templateId?: string,
): Promise<void> {
  const template = templateId === "__none__" ? null : await fetchTemplate(templateId);

  const { marked } = await import("marked");
  const html = await marked.parse(content);

  // テンプレートのマージン
  const mT = template?.marginTop ?? 15;
  const mB = template?.marginBottom ?? 15;
  const mL = template?.marginLeft ?? 10;
  const mR = template?.marginRight ?? 10;

  const hasHeader = !!(template && (template.headerLeft || template.headerCenter || template.headerRight));
  const hasFooter = !!(template && (template.footerLeft || template.footerCenter || template.footerRight));

  const styles = buildPrintStyles(mT, mB, mL, mR, hasHeader, hasFooter);
  const headerFooterHtml = template ? buildPrintHeaderFooterHtml(template, title) : "";

  // 印刷用ウィンドウを開く
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    throw new Error("ポップアップがブロックされました。ポップアップを許可してください。");
  }

  // thead/tfoot がブラウザによって各ページに自動繰り返しされる
  // → ヘッダー/フッター分のスペースが各ページで確保される
  // position: fixed のヘッダー/フッターがそのスペース上に表示される
  const headerSpacerHtml = hasHeader ? `<thead><tr><td class="header-spacer"></td></tr></thead>` : "";
  const footerSpacerHtml = hasFooter ? `<tfoot><tr><td class="footer-spacer"></td></tr></tfoot>` : "";

  printWindow.document.open();
  printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>${styles}</style>
</head>
<body>
  ${headerFooterHtml}
  <table class="layout-table">
    ${headerSpacerHtml}
    ${footerSpacerHtml}
    <tbody><tr><td class="content-area">${html}</td></tr></tbody>
  </table>
</body>
</html>`);
  printWindow.document.close();

  // レンダリング完了を待つ
  await new Promise<void>((resolve) => {
    printWindow.onload = () => resolve();
    setTimeout(resolve, 500);
  });

  // 印刷ダイアログを開く（ユーザが「PDFとして保存」を選択）
  printWindow.print();
}
