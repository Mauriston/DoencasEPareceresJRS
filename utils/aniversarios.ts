// Ficheiro: utils/aniversarios.ts
// Aniversariantes (usuários com dataNascimento AAAA-MM-DD): lista do mês, idade, nome sem o posto e a
// mensagem de parabéns para o WhatsApp (*negrito*, _itálico_). Usado pelo card da Início (Admin) e pelo
// push diário das 07h (server.ts, /api/agendador/aniversariantes).

export interface PessoaAniversario {
  id: string;
  usuario: string;
  dataNascimento?: string;
  celular?: string;
  ativo?: boolean;
}

export interface Aniversariante<T extends PessoaAniversario = PessoaAniversario> {
  pessoa: T;
  dia: number;
  /** Idade que completa no aniversário deste ano. */
  idade: number;
  ehHoje: boolean;
}

const RE_DATA = /^(\d{4})-(\d{2})-(\d{2})$/;

const partes = (iso?: string) => {
  const m = RE_DATA.exec(iso ?? '');
  return m ? { ano: +m[1], mes: +m[2], dia: +m[3] } : null;
};

/** "CT JÚLIO CÉSAR" → "JÚLIO CÉSAR"; "1SG-EF DAYVISON" → "DAYVISON". O login é sempre "POSTO NOME". */
export const nomeSemPosto = (usuario: string): string => {
  const t = usuario.trim().split(/\s+/);
  return t.length > 1 ? t.slice(1).join(' ') : t[0] ?? '';
};

/** Aniversariantes (ativos) do mês de `hojeIso` (AAAA-MM-DD), por dia. 29/02 cai em 28/02 nos anos não bissextos. */
export const aniversariantesDoMes = <T extends PessoaAniversario>(pessoas: T[], hojeIso: string): Aniversariante<T>[] => {
  const hoje = partes(hojeIso);
  if (!hoje) return [];
  const bissexto = (a: number) => (a % 4 === 0 && a % 100 !== 0) || a % 400 === 0;
  return pessoas
    .filter(p => p.ativo !== false)
    .flatMap(p => {
      const n = partes(p.dataNascimento);
      if (!n || n.mes !== hoje.mes) return [];
      const dia = n.mes === 2 && n.dia === 29 && !bissexto(hoje.ano) ? 28 : n.dia;
      return [{ pessoa: p, dia, idade: hoje.ano - n.ano, ehHoje: dia === hoje.dia }];
    })
    .sort((a, b) => a.dia - b.dia || nomeSemPosto(a.pessoa.usuario).localeCompare(nomeSemPosto(b.pessoa.usuario), 'pt-BR'));
};

export interface ProximoAniversario<T extends PessoaAniversario = PessoaAniversario> {
  pessoa: T;
  /** Data do próximo aniversário (AAAA-MM-DD), hoje incluído. */
  data: string;
  /** Idade que completa nessa data. */
  idade: number;
  /** 0 = hoje. */
  dias: number;
}

/** Os `n` próximos aniversários (ativos), a partir de hoje (inclusive), atravessando a virada do ano. */
export const proximosAniversarios = <T extends PessoaAniversario>(pessoas: T[], hojeIso: string, n = 4): ProximoAniversario<T>[] => {
  const hoje = partes(hojeIso);
  if (!hoje) return [];
  const bissexto = (a: number) => (a % 4 === 0 && a % 100 !== 0) || a % 400 === 0;
  const utc = (a: number, m: number, d: number) => Date.UTC(a, m - 1, d);
  const t0 = utc(hoje.ano, hoje.mes, hoje.dia);
  return pessoas
    .filter(p => p.ativo !== false)
    .flatMap(p => {
      const nasc = partes(p.dataNascimento);
      if (!nasc) return [];
      const dataNoAno = (a: number) => (nasc.mes === 2 && nasc.dia === 29 && !bissexto(a) ? 28 : nasc.dia);
      let ano = hoje.ano;
      if (utc(ano, nasc.mes, dataNoAno(ano)) < t0) ano += 1;
      const dia = dataNoAno(ano);
      const dias = Math.round((utc(ano, nasc.mes, dia) - t0) / 86_400_000);
      const data = `${ano}-${String(nasc.mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
      return [{ pessoa: p, data, idade: ano - nasc.ano, dias }];
    })
    .sort((a, b) => a.dias - b.dias || nomeSemPosto(a.pessoa.usuario).localeCompare(nomeSemPosto(b.pessoa.usuario), 'pt-BR'))
    .slice(0, n);
};

export const mensagemParabens = (usuario: string, idade: number): string =>
  `*${nomeSemPosto(usuario)}, PARABÉNS!*\n\n`
  + `Que você tenha outros _${idade} anos_ de muita saúde e felicidade! Aproveite bastante o seu dia! 🥂\n\n`
  + 'FA! Mauriston.';

/** Mensagem dos demais perfis (banner): só o cabeçalho e um campo para o próprio texto. */
export const mensagemParabensLivre = (usuario: string): string => {
  const nome = nomeSemPosto(usuario);
  return `*${nome}, PARABÉNS!*\n\n_[escreva aqui a sua mensagem para ${nome}]_`;
};

/** wa.me com DDI 55 (celular gravado com ou sem máscara/DDI); null sem número válido. */
export const linkWhatsApp = (celular: string | undefined, texto: string): string | null => {
  let d = (celular ?? '').replace(/\D/g, '');
  if (d.length === 10 || d.length === 11) d = `55${d}`;
  if (d.length < 12 || d.length > 13) return null;
  return `https://wa.me/${d}?text=${encodeURIComponent(texto)}`;
};

export const linkWhatsAppParabens = (celular: string | undefined, usuario: string, idade: number): string | null =>
  linkWhatsApp(celular, mensagemParabens(usuario, idade));

/** Data de hoje (AAAA-MM-DD) no fuso de Recife — o servidor roda em UTC. */
export const hojeEmRecife = (agora = new Date()): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Recife', year: 'numeric', month: '2-digit', day: '2-digit' }).format(agora);
