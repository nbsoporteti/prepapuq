import React from 'react';
import katex from 'katex';

// Renderiza texto con fórmulas LaTeX intercaladas. Sintaxis:
//   $...$    fórmula en línea            →  el área es $\pi r^2$
//   $$...$$  fórmula centrada en bloque  →  $$\frac{-b\pm\sqrt{b^2-4ac}}{2a}$$
//
// El texto fuera de las fórmulas se renderiza como texto plano (escapado por
// React). Solo el HTML que produce KaTeX se inyecta como markup, y KaTeX no
// emite <script> ni HTML arbitrario, así que no abre una vía de XSS desde lo
// que pega el profe. Los saltos de línea se preservan con `whitespace-pre-line`
// en el contenedor.

const MATH_RE = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;

function renderKatex(tex, displayMode) {
  try {
    return katex.renderToString(tex, { displayMode, throwOnError: false, strict: false });
  } catch (_e) {
    return null;
  }
}

// Devuelve un array de nodos (strings + spans KaTeX) listo para usar como hijos.
export function renderRich(text) {
  const src = String(text ?? '');
  if (!src) return null;
  if (src.indexOf('$') === -1) return src; // atajo: sin fórmulas, texto tal cual

  const nodes = [];
  let last = 0;
  let key = 0;
  let m;
  MATH_RE.lastIndex = 0;
  while ((m = MATH_RE.exec(src)) !== null) {
    if (m.index > last) nodes.push(src.slice(last, m.index));
    const display = m[1] != null;
    const tex = (display ? m[1] : m[2]).trim();
    const html = renderKatex(tex, display);
    if (html) {
      nodes.push(
        <span
          key={`k${key++}`}
          className={display ? 'my-1 block overflow-x-auto' : ''}
          dangerouslySetInnerHTML={{ __html: html }}
        />,
      );
    } else {
      nodes.push(m[0]); // fórmula inválida: dejamos el texto crudo
    }
    last = MATH_RE.lastIndex;
  }
  if (last < src.length) nodes.push(src.slice(last));
  return nodes;
}

// Envoltorio. `as` elige el tag contenedor (por defecto <span>).
export function RichText({ children, className = '', as: Tag = 'span' }) {
  return <Tag className={className}>{renderRich(children)}</Tag>;
}

export default RichText;
