import React, { useState } from 'react';
import { PlayCircle } from 'lucide-react';

/**
 * Extrae el ID de un video de YouTube desde las formas habituales:
 *   - https://www.youtube.com/watch?v=ID
 *   - https://youtu.be/ID
 *   - https://www.youtube.com/embed/ID
 *   - https://www.youtube.com/shorts/ID
 * Devuelve null si no encuentra un ID válido (11 chars).
 */
export const parseYouTubeId = (url) => {
  if (!url || typeof url !== 'string') return null;
  // ID suelto (por si guardaron solo el ID)
  if (/^[a-zA-Z0-9_-]{11}$/.test(url.trim())) return url.trim();
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /\/embed\/([a-zA-Z0-9_-]{11})/,
    /\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return null;
};

/**
 * Reproductor de YouTube con carga diferida ("lite embed"): muestra solo la
 * miniatura hasta que el usuario la activa, evitando cargar el iframe pesado de
 * YouTube por cada lección. Mejora performance y privacidad (youtube-nocookie).
 *
 * Accesible: la portada es un <button> con aria-label; al activarse monta el
 * iframe con foco gestionado por el navegador.
 */
const LeccionVideo = ({ url, titulo }) => {
  const [activo, setActivo] = useState(false);
  const videoId = parseYouTubeId(url);

  if (!videoId) {
    // Sin video válido: ofrecer el enlace crudo como fallback si existe.
    if (!url) return null;
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-primary underline underline-offset-2"
      >
        Ver video de la lección
      </a>
    );
  }

  const thumb = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  const label = titulo ? `Reproducir video: ${titulo}` : 'Reproducir video de la lección';

  return (
    <div className="relative w-full aspect-video overflow-hidden rounded-xl bg-black shadow-sm">
      {activo ? (
        <iframe
          className="absolute inset-0 h-full w-full"
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
          title={titulo || 'Video de la lección'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
        />
      ) : (
        <button
          type="button"
          onClick={() => setActivo(true)}
          aria-label={label}
          className="group absolute inset-0 h-full w-full cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <img
            src={thumb}
            alt=""
            aria-hidden="true"
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <span className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors group-hover:bg-black/40">
            <PlayCircle className="h-16 w-16 text-white drop-shadow-lg transition-transform duration-300 group-hover:scale-110" />
          </span>
        </button>
      )}
    </div>
  );
};

export default LeccionVideo;
