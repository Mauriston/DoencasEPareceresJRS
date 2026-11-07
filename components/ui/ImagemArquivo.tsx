// Ficheiro: components/ui/ImagemArquivo.tsx
// <img> para imagens do Firebase Storage: busca pelo servidor do app quando o Storage não é acessível
// na rede (ver services/arquivosStorage.ts). Enquanto carrega, não mostra imagem quebrada.
import React from 'react';
import { useUrlArquivo } from '../../services/arquivosStorage';

type Props = Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> & { src: string | undefined | null };

export const ImagemArquivo: React.FC<Props> = ({ src, alt = '', ...resto }) => {
  const { src: exibivel } = useUrlArquivo(src);
  if (!exibivel) return <span aria-hidden="true" className={resto.className} style={resto.style} />;
  return <img src={exibivel} alt={alt} {...resto} />;
};
