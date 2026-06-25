// Extracción de texto de PDFs en el navegador (sin servicios externos ni IA).
//
// Se usa en el importador de ensayos PAES: el texto extraído se vuelca al
// editor de "Importar desde texto" para que el admin lo revise y ajuste antes
// de cargarlo. No interpreta ni reproduce contenido oficial DEMRE: solo lee el
// PDF que el usuario decide subir, bajo su responsabilidad.
//
// pdfjs se carga con import() dinámico para NO engordar el bundle principal:
// solo se descarga cuando el admin realmente sube un PDF.

let _pdfjs = null;

async function getPdfjs() {
  if (_pdfjs) return _pdfjs;
  const pdfjs = await import('pdfjs-dist');
  // eslint-disable-next-line import/no-unresolved -- import virtual de Vite (?url): lo resuelve el bundler, no eslint
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  _pdfjs = pdfjs;
  return pdfjs;
}

// Reconstruye líneas a partir de los items posicionados (x, y) de una página.
// pdfjs entrega fragmentos sueltos; los agrupamos por coordenada vertical y
// separamos en líneas/párrafos según el salto en Y.
function itemsToText(items) {
  let out = '';
  let lastY = null;
  let lastXEnd = null;
  for (const it of items) {
    const str = it.str || '';
    if (!str) {
      if (it.hasEOL) { out += '\n'; lastY = null; lastXEnd = null; }
      continue;
    }
    const x = it.transform[4];
    const y = it.transform[5];
    if (lastY === null) {
      out += str;
    } else if (Math.abs(y - lastY) > 3) {
      out += (Math.abs(y - lastY) > 16 ? '\n\n' : '\n') + str;
    } else {
      const gap = lastXEnd != null ? x - lastXEnd : 0;
      out += (gap > 1 ? ' ' : '') + str;
    }
    lastY = y;
    lastXEnd = x + (it.width || 0);
    if (it.hasEOL) { out += '\n'; lastY = null; lastXEnd = null; }
  }
  return out;
}

// Extrae el texto de un File/Blob PDF. onProgress(pagina, total) es opcional.
export async function extractPdfText(file, { onProgress } = {}) {
  const pdfjs = await getPdfjs();
  const data = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data }).promise;
  try {
    const pages = [];
    for (let p = 1; p <= pdf.numPages; p += 1) {
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      pages.push(itemsToText(content.items));
      page.cleanup?.();
      onProgress?.(p, pdf.numPages);
    }
    return pages
      .join('\n\n')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  } finally {
    if (typeof pdf.destroy === 'function') pdf.destroy();
  }
}
