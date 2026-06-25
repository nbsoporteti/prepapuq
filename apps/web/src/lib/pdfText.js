// Extracción de texto de PDFs en el navegador (sin servicios externos ni IA).
//
// Se usa en el importador de ensayos PAES: el texto extraído se vuelca al
// editor de "Importar desde texto" para que el admin lo revise y ajuste antes
// de cargarlo. No interpreta ni reproduce contenido oficial DEMRE: solo lee el
// PDF que el usuario decide subir, bajo su responsabilidad.
//
// pdfjs se carga con import() dinámico para NO engordar el bundle principal:
// solo se descarga cuando el admin realmente sube un PDF.

// pdf.js v4+/v6 usa Promise.withResolvers (Chrome 119+/Firefox 121+/Safari
// 17.4+). En navegadores apenas más viejos no existe y la extracción falla con
// "Promise.withResolvers is not a function"; este polyfill mínimo lo cubre.
if (typeof Promise !== 'undefined' && typeof Promise.withResolvers !== 'function') {
  Promise.withResolvers = function withResolvers() {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

let _pdfjs = null;

async function getPdfjs() {
  if (_pdfjs) return _pdfjs;
  // Build "legacy" (transpilado) para máxima compatibilidad de navegadores.
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  // eslint-disable-next-line import/no-unresolved -- import virtual de Vite (?url): lo resuelve el bundler, no eslint
  const worker = await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url');
  // Cache-bust (?v=2): antes del fix de nginx, este .mjs quedó cacheado como
  // application/octet-stream con Cache-Control immutable (1 año), y el navegador
  // seguía usando esa copia con MIME malo aunque el server ya lo corrigió. Una
  // URL nueva lo obliga a re-pedirlo (ahora se sirve como text/javascript).
  pdfjs.GlobalWorkerOptions.workerSrc = `${worker.default}?v=2`;
  _pdfjs = pdfjs;
  return pdfjs;
}

// Reconstruye el texto de una página a partir de los items posicionados (x, y)
// que entrega pdf.js. Maneja el layout a DOS COLUMNAS típico de los folletos
// DEMRE: si detecta dos columnas, lee la izquierda completa y luego la derecha,
// en vez de intercalar líneas de ambas (que es lo que dejaba las preguntas "mal
// armadas": el `A) ...` de la derecha se pegaba al enunciado de la izquierda).
function pageToText(items, pageWidth) {
  const glyphs = [];
  for (const it of items) {
    const str = it.str || '';
    if (!str) continue;
    glyphs.push({ str, x: it.transform[4], y: it.transform[5], w: it.width || 0 });
  }
  if (!glyphs.length) return '';

  const split = detectColumnSplit(glyphs, pageWidth);
  if (split == null) return glyphsToText(glyphs);

  const left = [];
  const right = [];
  for (const g of glyphs) {
    if (g.x + g.w / 2 < split) left.push(g);
    else right.push(g);
  }
  return [glyphsToText(left), glyphsToText(right)].filter((t) => t.trim()).join('\n\n');
}

// ¿La página está a 2 columnas? Devuelve la X del canal central (gutter) por
// donde cortar, o null si es de una sola columna. Busca, en el tercio central,
// una banda vertical casi vacía con bastante texto a ambos lados (un gutter
// real). Es conservador: ante la duda, trata la página como de una columna.
function detectColumnSplit(glyphs, pageWidth) {
  if (!pageWidth || glyphs.length < 30) return null;
  const BINS = 50;
  const hist = new Array(BINS).fill(0);
  for (const g of glyphs) {
    let b = Math.floor(((g.x + g.w / 2) / pageWidth) * BINS);
    if (b < 0) b = 0;
    if (b >= BINS) b = BINS - 1;
    hist[b] += 1;
  }
  const n = glyphs.length;
  const lo = Math.floor(BINS * 0.35);
  const hi = Math.ceil(BINS * 0.65);
  let best = null;
  for (let b = lo; b <= hi; b += 1) {
    if (hist[b] > n * 0.01) continue; // el canal debe estar casi vacío
    let leftMass = 0;
    let rightMass = 0;
    for (let k = 0; k < b; k += 1) leftMass += hist[k];
    for (let k = b + 1; k < BINS; k += 1) rightMass += hist[k];
    if (leftMass > n * 0.3 && rightMass > n * 0.3) {
      const dist = Math.abs(b - BINS / 2);
      if (!best || dist < best.dist) best = { b, dist };
    }
  }
  return best ? ((best.b + 0.5) / BINS) * pageWidth : null;
}

// Ordena glifos arriba→abajo / izquierda→derecha, los agrupa en líneas por la
// coordenada vertical y reconstruye el texto con sus saltos de línea y párrafo.
function glyphsToText(glyphs) {
  const sorted = [...glyphs].sort((a, b) => {
    const dy = b.y - a.y;
    if (Math.abs(dy) > 3) return dy; // distinta línea: la de más arriba primero
    return a.x - b.x; // misma línea: de izquierda a derecha
  });

  const lines = [];
  let cur = null;
  for (const g of sorted) {
    if (cur && Math.abs(g.y - cur.lastY) <= 3) {
      cur.items.push(g);
      cur.lastY = g.y;
    } else {
      cur = { topY: g.y, lastY: g.y, items: [g] };
      lines.push(cur);
    }
  }

  let out = '';
  let prevY = null;
  for (const line of lines) {
    let text = '';
    let lastXEnd = null;
    for (const g of line.items) {
      const gap = lastXEnd != null ? g.x - lastXEnd : 0;
      text += (lastXEnd != null && gap > 1 ? ' ' : '') + g.str;
      lastXEnd = g.x + g.w;
    }
    if (prevY != null) out += prevY - line.topY > 16 ? '\n\n' : '\n';
    out += text;
    prevY = line.topY;
  }
  return out;
}

// Quita encabezados/pies que corren en casi todas las páginas y los números de
// página sueltos arriba/abajo de cada hoja: si no, se cuelan dentro del
// enunciado de la última pregunta de cada página.
function stripBoilerplate(pages) {
  const norm = (s) => s.trim().toLowerCase().replace(/\s+/g, ' ');
  const isPageNum = (s) => /^\s*(?:p[áa]g(?:ina)?\.?\s*)?\d{1,3}\s*$/i.test(s);

  let result = pages;
  if (pages.length >= 3) {
    const counts = new Map();
    for (const pg of pages) {
      const seen = new Set();
      for (const line of pg.split('\n')) {
        const t = line.trim();
        if (!t || t.length > 80) continue;
        const k = norm(t);
        if (seen.has(k)) continue; // contar una vez por página
        seen.add(k);
        counts.set(k, (counts.get(k) || 0) + 1);
      }
    }
    const threshold = Math.max(3, Math.ceil(pages.length * 0.3));
    const boiler = new Set();
    for (const [k, c] of counts) if (c >= threshold) boiler.add(k);
    if (boiler.size) {
      result = result.map((pg) => pg.split('\n').filter((l) => !boiler.has(norm(l))).join('\n'));
    }
  }

  return result.map((pg) => {
    const ls = pg.split('\n');
    while (ls.length && isPageNum(ls[0])) ls.shift();
    while (ls.length && isPageNum(ls[ls.length - 1])) ls.pop();
    return ls.join('\n');
  });
}

// Abre un PDF y devuelve el documento pdf.js. El llamador es responsable de
// destruirlo (doc.destroy()). Permite extraer el texto Y renderizar páginas
// (para recortar figuras) sin volver a abrir el archivo.
export async function loadPdf(file) {
  const pdfjs = await getPdfjs();
  const data = await file.arrayBuffer();
  return pdfjs.getDocument({ data }).promise;
}

// Extrae el texto de un documento ya abierto. onProgress(pagina, total) opcional.
export async function extractTextFromDoc(pdf, { onProgress } = {}) {
  const pages = [];
  for (let p = 1; p <= pdf.numPages; p += 1) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1 });
    pages.push(pageToText(content.items, viewport.width));
    page.cleanup?.();
    onProgress?.(p, pdf.numPages);
  }
  return stripBoilerplate(pages)
    .join('\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Renderiza una página a PNG (dataURL) para recortar figuras. scale 2 ≈ nítido.
// Devuelve { dataUrl, width, height } en píxeles del canvas renderizado.
export async function renderPdfPage(pdf, pageNum, scale = 2) {
  const page = await pdf.getPage(pageNum);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext('2d');
  await page.render({ canvasContext: ctx, viewport }).promise;
  page.cleanup?.();
  return { dataUrl: canvas.toDataURL('image/png'), width: canvas.width, height: canvas.height };
}

// Extrae el texto de un File/Blob PDF (abre y cierra el documento).
export async function extractPdfText(file, { onProgress } = {}) {
  const pdf = await loadPdf(file);
  try {
    return await extractTextFromDoc(pdf, { onProgress });
  } finally {
    if (typeof pdf.destroy === 'function') pdf.destroy();
  }
}
