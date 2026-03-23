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
    const canvas = await html2canvas(iframeDoc.body, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      width: 680,
      windowWidth: 760,
    });

    const imgData = canvas.toDataURL("image/png");
    const imgW = canvas.width;
    const imgH = canvas.height;

    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;
    const contentWidth = pageWidth - margin * 2;
    const contentHeight = pageHeight - margin * 2;

    // アスペクト比を保持してA4幅にフィット
    const ratio = contentWidth / imgW;
    const totalHeight = imgH * ratio;

    if (totalHeight <= contentHeight) {
      doc.addImage(imgData, "PNG", margin, margin, contentWidth, totalHeight);
    } else {
      // 複数ページに分割（ソース画像上の1ページ分の高さ）
      const pageSlicePx = contentHeight / ratio;
      let srcY = 0;
      let page = 0;

      while (srcY < imgH) {
        if (page > 0) doc.addPage();

        const sliceH = Math.min(pageSlicePx, imgH - srcY);
        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = imgW;
        sliceCanvas.height = sliceH;
        const ctx = sliceCanvas.getContext("2d")!;
        ctx.drawImage(canvas, 0, srcY, imgW, sliceH, 0, 0, imgW, sliceH);

        const sliceData = sliceCanvas.toDataURL("image/png");
        const sliceScaledH = sliceH * ratio;
        doc.addImage(sliceData, "PNG", margin, margin, contentWidth, sliceScaledH);

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
