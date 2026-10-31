// Ficheiro: components/ErroFatal.tsx
// Rede de segurança do app inteiro: um erro de renderização em qualquer tela
// desmontava a árvore toda e deixava só o fundo da página (tela em branco).
// Agora a mensagem aparece, com a opção de recarregar — e o texto do erro
// pode ser copiado para o diagnóstico.
import React from 'react';

interface Estado { erro: Error | null; copiado: boolean }

export class ErroFatal extends React.Component<{ children: React.ReactNode }, Estado> {
  // O projeto não instala @types/react; declara o que a classe usa do React.Component.
  declare props: { children: React.ReactNode };
  declare setState: (patch: Partial<Estado>) => void;
  state: Estado = { erro: null, copiado: false };

  static getDerivedStateFromError(erro: Error): Partial<Estado> {
    return { erro };
  }

  componentDidCatch(erro: Error, info: React.ErrorInfo) {
    console.error('Erro não tratado na interface:', erro, info.componentStack);
  }

  private detalhe() {
    const { erro } = this.state;
    return `${erro?.name}: ${erro?.message}\n${location.href}\n${navigator.userAgent}\n\n${erro?.stack ?? ''}`;
  }

  private copiar = async () => {
    try { await navigator.clipboard.writeText(this.detalhe()); this.setState({ copiado: true }); } catch { /* sem área de transferência */ }
  };

  render() {
    const { erro, copiado } = this.state;
    if (!erro) return this.props.children;
    return (
      <div className="fixed inset-0 bg-canvas flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white border border-line rounded-xl p-6 max-w-form w-full space-y-4">
          <h1 className="font-heading font-bold text-h2 text-navy">Algo deu errado ao abrir esta tela</h1>
          <p className="text-sm text-ink">Recarregue a página. Se o problema continuar, copie o detalhe do erro e envie ao administrador.</p>
          <pre className="text-xs text-wine-800 bg-wine-50 border border-line rounded-lg p-3 whitespace-pre-wrap break-words max-h-48 overflow-y-auto">{erro.name}: {erro.message}</pre>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => location.reload()} className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg bg-navy text-white text-sm font-bold">Recarregar</button>
            <button type="button" onClick={this.copiar} className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg border border-navy text-navy text-sm font-bold">{copiado ? 'Copiado' : 'Copiar detalhe do erro'}</button>
          </div>
        </div>
      </div>
    );
  }
}
