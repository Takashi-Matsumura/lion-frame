import { jsPDF } from "jspdf";

// ── Markdown → PDF ──

const MD_STYLES = `
  body {
    margin: 0; padding: 40px;
    background: #ffffff;
    font-family: -apple-system, BlinkMacSystemFont, 'Hiragino Sans', 'Noto Sans JP', sans-serif;
    font-size: 14px; line-height: 1.7; color: #1a1a1a;
  }
  h1 { font-size: 24px; font-weight: 700; margin: 16px 0 8px; border-bottom: 1px solid #e0e0e0; padding-bottom: 6px; }
  h2 { font-size: 20px; font-weight: 700; margin: 14px 0 6px; border-bottom: 1px solid #e0e0e0; padding-bottom: 4px; }
  h3 { font-size: 17px; font-weight: 600; margin: 12px 0 4px; }
  p { margin: 8px 0; }
  code { background: #f0f0f0; padding: 1px 4px; border-radius: 3px; font-size: 0.9em; font-family: 'SF Mono', 'Fira Code', monospace; }
  pre { background: #f5f5f5; padding: 12px; border-radius: 6px; overflow-x: auto; margin: 10px 0; }
  pre code { background: none; padding: 0; }
  blockquote { border-left: 3px solid #ccc; padding-left: 12px; color: #555; margin: 10px 0; font-style: italic; }
  ul, ol { padding-left: 24px; margin: 8px 0; }
  li { margin: 3px 0; }
  hr { border: none; border-top: 1px solid #ddd; margin: 16px 0; }
  table { border-collapse: collapse; width: 100%; margin: 10px 0; }
  th, td { border: 1px solid #ddd; padding: 6px 10px; text-align: left; }
  th { background: #f5f5f5; font-weight: 600; }
  strong { font-weight: 700; }
  em { font-style: italic; }
  a { color: #2563eb; text-decoration: underline; }
`;

// 改ページ不可の要素セレクタ
const AVOID_BREAK_SELECTORS = "h1, h2, h3, h4, h5, h6, table, blockquote, pre, li";
// 見出し要素（直後での改ページを避ける）
const HEADING_TAGS = new Set(["H1", "H2", "H3", "H4", "H5", "H6"]);

interface BreakPoint {
  top: number;    // canvas px (scaled)
  bottom: number; // canvas px (scaled)
  isHeading: boolean;
}

/** iframe内のブロック要素の位置を収集（canvas座標系） */
function collectBreakPoints(body: HTMLElement, scale: number): BreakPoint[] {
  const points: BreakPoint[] = [];
  const elements = body.querySelectorAll(AVOID_BREAK_SELECTORS);

  for (const el of elements) {
    const htmlEl = el as HTMLElement;
    const top = htmlEl.offsetTop * scale;
    const bottom = (htmlEl.offsetTop + htmlEl.offsetHeight) * scale;
    points.push({ top, bottom, isHeading: HEADING_TAGS.has(el.tagName) });
  }

  // topでソート
  points.sort((a, b) => a.top - b.top);
  return points;
}

/**
 * 安全な改ページ位置を見つける
 * - スライス末尾が要素の途中に来る場合、その要素の前（top）で切る
 * - 見出しがスライス末尾付近にある場合、見出しの前で切る
 * - 安全な位置が見つからない場合（巨大な要素）はそのまま切る
 */
function findSafeBreak(
  srcY: number,
  defaultSliceH: number,
  breakPoints: BreakPoint[],
  pageSlicePx: number,
): number {
  const sliceBottom = srcY + defaultSliceH;
  const minSlice = pageSlicePx * 0.4; // 最低40%は使う

  let bestBreak = defaultSliceH;

  for (const bp of breakPoints) {
    // この要素がスライス範囲外なら無視
    if (bp.bottom <= srcY) continue;
    if (bp.top >= sliceBottom) break;

    // 要素がスライス末尾をまたぐ場合 → 要素の前で切る
    if (bp.top > srcY && bp.top < sliceBottom && bp.bottom > sliceBottom) {
      const candidate = bp.top - srcY;
      if (candidate >= minSlice) {
        bestBreak = candidate;
        break;
      }
    }

    // 見出しがスライス末尾の近く(下20%)にある場合 → 見出しの前で切る
    if (bp.isHeading && bp.top > srcY) {
      const threshold = srcY + defaultSliceH * 0.8;
      if (bp.top >= threshold && bp.top < sliceBottom) {
        const candidate = bp.top - srcY;
        if (candidate >= minSlice) {
          bestBreak = candidate;
          break;
        }
      }
    }
  }

  return bestBreak;
}

/**
 * マークダウンをPDFとしてエクスポート
 * iframe で完全分離 → html2canvas でキャプチャ → jsPDF
 */
export async function exportMarkdownToPdf(
  content: string,
  title: string
): Promise<void> {
  const [{ marked }, html2canvasModule] = await Promise.all([
    import("marked"),
    import("html2canvas"),
  ]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const html2canvas = ((html2canvasModule as any).default ?? html2canvasModule) as (
    element: HTMLElement,
    options?: Record<string, unknown>
  ) => Promise<HTMLCanvasElement>;

  const html = await marked.parse(content);

  // iframe でアプリのCSS（oklch等）から完全に分離
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;left:0;top:0;width:760px;height:1px;border:none;z-index:99999;opacity:0;pointer-events:none;";
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument!;
  iframeDoc.open();
  iframeDoc.write(`<!DOCTYPE html><html><head><style>${MD_STYLES}</style></head><body>${html}</body></html>`);
  iframeDoc.close();

  // iframeのレイアウト確定を待つ
  await new Promise((r) => setTimeout(r, 100));

  // iframe内のbodyの実際の高さに合わせてリサイズ
  const bodyHeight = iframeDoc.body.scrollHeight;
  iframe.style.height = `${bodyHeight}px`;
  await new Promise((r) => setTimeout(r, 50));

  try {
    const scale = 1.5;
    const canvas = await html2canvas(iframeDoc.body, {
      scale,
      useCORS: true,
      backgroundColor: "#ffffff",
      width: 680,
      windowWidth: 760,
    });

    const imgW = canvas.width;
    const imgH = canvas.height;

    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;
    const contentWidth = pageWidth - margin * 2;
    const contentHeight = pageHeight - margin * 2;

    // CSS px → canvas px の比率
    const ratio = contentWidth / imgW;
    const totalHeight = imgH * ratio;

    if (totalHeight <= contentHeight) {
      const imgData = canvas.toDataURL("image/jpeg", 0.85);
      doc.addImage(imgData, "JPEG", margin, margin, contentWidth, totalHeight);
    } else {
      // スマートスライス: 要素境界を考慮した改ページ
      const pageSlicePx = contentHeight / ratio;
      const breakPoints = collectBreakPoints(iframeDoc.body, scale);

      let srcY = 0;
      let page = 0;

      while (srcY < imgH) {
        if (page > 0) doc.addPage();

        let sliceH = Math.min(pageSlicePx, imgH - srcY);

        // ページ末尾が要素の途中に来る場合、手前の安全な位置で切る
        if (srcY + sliceH < imgH) {
          sliceH = findSafeBreak(srcY, sliceH, breakPoints, pageSlicePx);
        }

        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = imgW;
        sliceCanvas.height = sliceH;
        const ctx = sliceCanvas.getContext("2d")!;
        ctx.drawImage(canvas, 0, srcY, imgW, sliceH, 0, 0, imgW, sliceH);

        const sliceData = sliceCanvas.toDataURL("image/jpeg", 0.85);
        const sliceScaledH = sliceH * ratio;
        doc.addImage(sliceData, "JPEG", margin, margin, contentWidth, sliceScaledH);

        srcY += sliceH;
        page++;
      }
    }

    doc.save(`${title}.pdf`);
  } finally {
    document.body.removeChild(iframe);
  }
}

// ── Excalidraw → PDF ──

export async function exportExcalidrawToPdf(
  content: string,
  title: string
): Promise<void> {
  if (!content) return;

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

  const imgUrl = URL.createObjectURL(blob);
  const img = new Image();

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = imgUrl;
  });

  const doc = new jsPDF({
    orientation: img.width > img.height ? "landscape" : "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  const maxW = pageWidth - margin * 2;
  const maxH = pageHeight - margin * 2;

  const ratio = Math.min(maxW / img.width, maxH / img.height);
  const w = img.width * ratio;
  const h = img.height * ratio;
  const x = (pageWidth - w) / 2;
  const y = (pageHeight - h) / 2;

  doc.addImage(imgUrl, "PNG", x, y, w, h);
  doc.save(`${title}.pdf`);

  URL.revokeObjectURL(imgUrl);
}
