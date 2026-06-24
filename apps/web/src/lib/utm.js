// Lectura de parámetros UTM desde la URL y persistencia ligera en sessionStorage
// para que sobrevivan a navegaciones internas dentro de la SPA. Sin tracking
// invasivo: solo guardamos los UTM hasta que el usuario cierra la pestaña.

const KEY = 'prepa:utm';
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];

const readPersisted = () => {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (_e) {
    return null;
  }
};

const writePersisted = (utm) => {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(utm));
  } catch (_e) {}
};

/**
 * Devuelve los UTM actuales: primero lee la URL, si no encuentra cae al
 * sessionStorage. La primera carga con UTM también los persiste.
 */
export const getUtmParams = () => {
  if (typeof window === 'undefined') return {};

  const params = new URLSearchParams(window.location.search);
  const fromUrl = {};
  let hasAny = false;
  for (const k of UTM_KEYS) {
    const v = params.get(k);
    if (v) {
      fromUrl[k] = v;
      hasAny = true;
    }
  }
  if (hasAny) {
    writePersisted(fromUrl);
    return fromUrl;
  }
  return readPersisted() || {};
};

/**
 * Devuelve el referer del documento si existe y no es nuestro propio origin
 * (filtra navegación interna).
 */
export const getReferer = () => {
  if (typeof document === 'undefined') return '';
  const ref = document.referrer || '';
  if (!ref) return '';
  try {
    const origin = new URL(ref).origin;
    if (origin === window.location.origin) return '';
  } catch (_e) {}
  return ref.slice(0, 500);
};
