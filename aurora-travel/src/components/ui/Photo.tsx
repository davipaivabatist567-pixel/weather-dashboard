"use client";

import { useEffect, useRef, useState } from "react";
import { photos, photoSrc, photoSrcSet, type PhotoKey } from "@/data/photos";

type PhotoProps = {
  name: PhotoKey;
  /** Largura em que a foto aparece, para o navegador baixar o tamanho certo (atributo `sizes`). */
  sizes: string;
  priority?: boolean;
  className?: string;
};

/**
 * Foto que preenche o elemento pai (que precisa de posição e tamanho definidos).
 * Se a imagem não carregar, entra um degradê da marca no lugar, sem ícone de imagem quebrada.
 */
export function Photo({ name, sizes, priority = false, className = "" }: PhotoProps) {
  const ref = useRef<HTMLImageElement>(null);
  const [failed, setFailed] = useState(false);

  // a imagem pode falhar antes de o React assumir a página; confere ao montar
  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, []);

  if (failed) {
    return (
      <span
        role="img"
        aria-label={photos[name].alt}
        className={`absolute inset-0 block bg-navy bg-[radial-gradient(120%_80%_at_20%_0%,rgb(220_234_245/0.35),transparent_60%),radial-gradient(90%_70%_at_100%_100%,rgb(197_164_109/0.35),transparent_60%)] ${className}`}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- export estático: as larguras são geradas pelo script de fotos
    <img
      ref={ref}
      src={photoSrc(name, 1280)}
      srcSet={photoSrcSet(name)}
      sizes={sizes}
      alt={photos[name].alt}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      onError={() => setFailed(true)}
      className={`absolute inset-0 h-full w-full object-cover ${className}`}
    />
  );
}
