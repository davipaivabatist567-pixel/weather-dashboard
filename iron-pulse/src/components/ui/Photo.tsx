"use client";

import { useEffect, useRef, useState } from "react";
import { photos, photoSrc, photoSrcSet, type PhotoKey } from "@/data/photos";

type PhotoProps = {
  name: PhotoKey;
  /** Largura em que a foto aparece (atributo `sizes`), para o navegador baixar o tamanho certo. */
  sizes: string;
  priority?: boolean;
  className?: string;
};

/**
 * Foto que preenche o elemento pai (que precisa ter posição e tamanho definidos).
 * Se a imagem não carregar, entra um fundo grafite com textura no lugar, nunca o ícone de imagem quebrada.
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
        className={`absolute inset-0 block bg-coal bg-[radial-gradient(90%_70%_at_80%_10%,rgb(198_255_0/0.12),transparent_60%),repeating-linear-gradient(135deg,rgb(255_255_255/0.035)_0_2px,transparent_2px_14px)] ${className}`}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- exportação estática: as larguras saem do script de fotos
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
      style={{ objectPosition: photos[name].position }}
      className={`absolute inset-0 h-full w-full object-cover ${className}`}
    />
  );
}
