import React, { useState } from 'react';
import { Header } from './Header';
import { Ruler, Eye, FileText, Accessibility, Heart, Ear, ChevronDown } from 'lucide-react';

const indicesList = [
  {
    id: "altura",
    title: "I - Altura, peso mínimo e máximo",
    icon: <Ruler size={20} className="text-[#050F41]" />,
    items: [
      "Altura: CN: 1,54m a 1,95m. Demais: 1,54m (mulheres) / 1,60m (homens) a 2,00m.",
      "IMC: Entre 18 e 30."
    ]
  },
  {
    id: "acuidade",
    title: "II - Acuidade visual",
    icon: <Eye size={20} className="text-[#050F41]" />,
    items: [
      "CN, EN, EFOMM, EAM, CAP, CPA, CPFN: 20/100 corrigida para 20/20 em cada olho.",
      "CSM, QC, T, CN e CEM: 20/400 corrigida para 20/20 em cada olho.",
      "SMV Praças (até 25 anos): 20/100 corrigida para 20/20 em cada olho.",
      "SMV Praças (> 25 anos): 20/400 corrigida para 20/20 em cada olho.",
      "SMV Oficiais: 20/400 corrigida para 20/20 em cada olho."
    ]
  },
  {
    id: "senso",
    title: "III - Senso cromático",
    icon: <Eye size={20} className="text-[#050F41]" />,
    items: [
      "Pesquisa de discromatopsia realizada exclusivamente através das Pranchas de Ishihara (modelos com 24 ou 38 pranchas)."
    ]
  },
  {
    id: "dentes",
    title: "IV - Dentes",
    icon: <FileText size={20} className="text-[#050F41]" />,
    items: [
      "Mínimo de 20 dentes naturais, hígidos ou tratados, com pelo menos 4 molares opostos 2 a 2."
    ]
  },
  {
    id: "motilidade",
    title: "V - Limites mínimos de motilidade",
    icon: <Accessibility size={20} className="text-[#050F41]" />,
    items: [
      "OMBRO: Elevação 90° Abdução 90°",
      "COTOVELO: Flexão 100° Extensão 15°",
      "PUNHO: Alcance total a 15°",
      "MÃO: Pronossupinação a 90°",
      "DEDOS: Formação de pinça digital.",
      "QUADRIL: Flexão 90°. Extensão 10°",
      "JOELHO: Extensão total. Flexão 90°",
      "TORNOZELO: Dorsiflexo 10°. Flexão plantar 10°"
    ]
  },
  {
    id: "cardio",
    title: "VI - Índices cardiovasculares",
    icon: <Heart size={20} className="text-[#050F41]" />,
    items: [
      "Pressão Arterial: < 140/90 mmHg.",
      "Frequência Cardíaca: < 120 bpm."
    ]
  },
  {
    id: "audicao",
    title: "VII - Índice audiométrico",
    icon: <Ear size={20} className="text-[#050F41]" />,
    items: [
      "Candidatos CN, EN, EFOMM, EAM, CAP, CPA, CPFN e SMV Praças até 25 anos: Perdas de até 40dB em qualquer frequência",
      "Demais candidatos: Perdas maiores que 40dB em frequências até 3000 Hz; Nas frequências de 4000 a 8000 Hz, perdas maiores que 40 dB e menores ou iguais a 70dB, desde que satisfeitas as seguintes condições: - Seja unilateral; - Apresente otoscopia normal; - Índice de Reconhecimento da Fala (IRF) para monossílabos maior ou igual a 88%; e - Apresente Limiar de Reconhecimento da Fala (LRF) menor ou igual a 50 dB."
    ]
  }
];

// Condições de inaptidão — Anexo N (DGPM-406, 9ª Revisão), agrupadas por índice.
const ANEXO_N_INAPTIDAO: { Índice: string; Valor: string }[] = [
  { "Índice": "Cabeça e Pescoço", "Valor": "deformações" },
  { "Índice": "Cabeça e Pescoço", "Valor": "perdas extensas de substância" },
  { "Índice": "Cabeça e Pescoço", "Valor": "cicatrizes deformantes ou aderentes" },
  { "Índice": "Cabeça e Pescoço", "Valor": "contraturas musculares anormais" },
  { "Índice": "Cabeça e Pescoço", "Valor": "cisto branquial" },
  { "Índice": "Cabeça e Pescoço", "Valor": "higroma cístico de pescoço e fístulas" },
  { "Índice": "Ouvido e Audição", "Valor": "Deformidades significativas ou agenesia das orelhas" },
  { "Índice": "Ouvido e Audição", "Valor": "anormalidades do conduto auditivo e tímpano, exceto as desprovidas de potencialidade mórbida" },
  { "Índice": "Ouvido e Audição", "Valor": "infecções crônicas recidivantes" },
  { "Índice": "Ouvido e Audição", "Valor": "otite média crônica" },
  { "Índice": "Ouvido e Audição", "Valor": "labirintopatias" },
  { "Índice": "Ouvido e Audição", "Valor": "tumores" },
  { "Índice": "Olhos e Visão", "Valor": "Ceratocone" },
  { "Índice": "Olhos e Visão", "Valor": "glaucoma" },
  { "Índice": "Olhos e Visão", "Valor": "infecções e processos inflamatórios, excetuando conjuntivites agudas e hordéolo" },
  { "Índice": "Olhos e Visão", "Valor": "ulcerações" },
  { "Índice": "Olhos e Visão", "Valor": "tumores, excetuando cisto benigno palpebral" },
  { "Índice": "Olhos e Visão", "Valor": "opacificações" },
  { "Índice": "Olhos e Visão", "Valor": "sequelas de traumatismo ou de queimaduras" },
  { "Índice": "Olhos e Visão", "Valor": "doenças congênitas e deformidades congênitas ou adquiridas, incluindo desvios dos eixos visuais" },
  { "Índice": "Olhos e Visão", "Valor": "anormalidades funcionais significativas e diminuição da acuidade visual além da tolerância permitida" },
  { "Índice": "Olhos e Visão", "Valor": "lesões retinianas" },
  { "Índice": "Olhos e Visão", "Valor": "doenças neurológicas ou musculares oculares" },
  { "Índice": "Olhos e Visão", "Valor": "discromatopsia para as cores verde e vermelha" },
  { "Índice": "Boca, Nariz, Laringe, Faringe, Traqueia e Esôfago", "Valor": "Anormalidades estruturais congênitas ou não" },
  { "Índice": "Boca, Nariz, Laringe, Faringe, Traqueia e Esôfago", "Valor": "desvio acentuado de septo nasal" },
  { "Índice": "Boca, Nariz, Laringe, Faringe, Traqueia e Esôfago", "Valor": "mutilações" },
  { "Índice": "Boca, Nariz, Laringe, Faringe, Traqueia e Esôfago", "Valor": "tumores" },
  { "Índice": "Boca, Nariz, Laringe, Faringe, Traqueia e Esôfago", "Valor": "atresias e retrações" },
  { "Índice": "Boca, Nariz, Laringe, Faringe, Traqueia e Esôfago", "Valor": "fístulas congênitas ou adquiridas" },
  { "Índice": "Boca, Nariz, Laringe, Faringe, Traqueia e Esôfago", "Valor": "infecções crônicas ou recidivantes" },
  { "Índice": "Boca, Nariz, Laringe, Faringe, Traqueia e Esôfago", "Valor": "deficiências funcionais na mastigação, deglutição, respiração, fonação, fala" },
  { "Índice": "Boca, Nariz, Laringe, Faringe, Traqueia e Esôfago", "Valor": "nódulos, pólipos e cistos vocais, fendas glóticas, paralisia de prega vocal, refluxo laringofaríngeo intenso e alterações na fisiologia vocal para Sargento Músico" },
  { "Índice": "Aparelho Estomatognático", "Valor": "Estado sanitário bucal deficiente" },
  { "Índice": "Aparelho Estomatognático", "Valor": "cáries" },
  { "Índice": "Aparelho Estomatognático", "Valor": "restaurações e próteses insatisfatórias" },
  { "Índice": "Aparelho Estomatognático", "Valor": "doença periodontal não controlada pelo autocuidado" },
  { "Índice": "Aparelho Estomatognático", "Valor": "gengivite com ou sem presença de cálculo" },
  { "Índice": "Aparelho Estomatognático", "Valor": "infecções, cistos, neoplasias" },
  { "Índice": "Aparelho Estomatognático", "Valor": "restos radiculares" },
  { "Índice": "Aparelho Estomatognático", "Valor": "deformidades estruturais como fissuras labiais ou labiopalatinas não reabilitadas" },
  { "Índice": "Aparelho Estomatognático", "Valor": "sequelas deformantes de síndromes ou de alterações do desenvolvimento maxilo-facial" },
  { "Índice": "Aparelho Estomatognático", "Valor": "má-oclusão de origem dentária ou esquelética com comprometimento funcional" },
  { "Índice": "Aparelho Estomatognático", "Valor": "ausência de contatos interoclusais em regiões de molares, tolerando-se a presença de próteses" },
  { "Índice": "Aparelho Estomatognático", "Valor": "ausência dentária na bateria labial sem reabilitação" },
  { "Índice": "Aparelho Estomatognático", "Valor": "menos de dez dentes naturais em uma das arcadas" },
  { "Índice": "Pele e Tecido Celular Subcutâneo ou Conjuntivo", "Valor": "Infecções crônicas ou recidivantes, inclusive a acne com processo inflamatório agudo ou dermatose que comprometa o barbear" },
  { "Índice": "Pele e Tecido Celular Subcutâneo ou Conjuntivo", "Valor": "micoses, infectadas ou cronificadas" },
  { "Índice": "Pele e Tecido Celular Subcutâneo ou Conjuntivo", "Valor": "parasitoses cutâneas extensas" },
  { "Índice": "Pele e Tecido Celular Subcutâneo ou Conjuntivo", "Valor": "eczemas alérgicos" },
  { "Índice": "Pele e Tecido Celular Subcutâneo ou Conjuntivo", "Valor": "expressões cutâneas das doenças autoimunes, excetuando-se vitiligo, manifestações das doenças alérgicas" },
  { "Índice": "Pele e Tecido Celular Subcutâneo ou Conjuntivo", "Valor": "ulcerações e edemas" },
  { "Índice": "Pele e Tecido Celular Subcutâneo ou Conjuntivo", "Valor": "cicatrizes deformantes, que poderão vir a comprometer a capacidade laborativa" },
  { "Índice": "Pele e Tecido Celular Subcutâneo ou Conjuntivo", "Valor": "afecções em que haja contraindicação à exposição solar prolongada" },
  { "Índice": "Pele e Tecido Celular Subcutâneo ou Conjuntivo", "Valor": "tatuagens que façam alusão a ideologia terrorista ou extremista ou na região da cabeça, do rosto e da face anterior do pescoço" },
  { "Índice": "Pele e Tecido Celular Subcutâneo ou Conjuntivo", "Valor": "sinais ou sintomas de esclerose sistêmica, esclerodermia, poliomiosite, dermatomiosite, doença mista do tecido conjuntivo, síndrome de Sjögren e síndrome antifosfolipide" },
  { "Índice": "Pulmões e Parede Torácica", "Valor": "Deformidade relevante congênita ou adquirida da caixa torácica com prejuízo da função respiratória" },
  { "Índice": "Pulmões e Parede Torácica", "Valor": "infecções bacterianas ou micóticas" },
  { "Índice": "Pulmões e Parede Torácica", "Valor": "distúrbios ventilatórios, obstrutivos ou restritivos, hiperreatividade brônquica, história de crises de broncoespasmo ainda na adolescência" },
  { "Índice": "Pulmões e Parede Torácica", "Valor": "fístula e fibrose pulmonar difusa" },
  { "Índice": "Pulmões e Parede Torácica", "Valor": "tumores malignos e benignos dos pulmões e pleura" },
  { "Índice": "Pulmões e Parede Torácica", "Valor": "anormalidades radiológicas, exceto se insignificantes e desprovidas de potencialidade mórbida e sem comprometimento funcional" },
  { "Índice": "Sistema Cardiovascular e Síndromes Vasculíticas", "Valor": "Anormalidades congênitas, ressalvadas CIA, a CIV e a PCA corrigidas cirurgicamente, que não promovam repercussão hemodinâmica ou adquiridas" },
  { "Índice": "Sistema Cardiovascular e Síndromes Vasculíticas", "Valor": "infecções, inflamações, arritmias, doenças do pericárdio, miocárdio, endocárdio e da circulação intrínseca do coração" },
  { "Índice": "Sistema Cardiovascular e Síndromes Vasculíticas", "Valor": "anormalidades do feixe de condução ressalvado o bloqueio de ramo direito de primeiro grau" },
  { "Índice": "Sistema Cardiovascular e Síndromes Vasculíticas", "Valor": "doenças orovalvares" },
  { "Índice": "Sistema Cardiovascular e Síndromes Vasculíticas", "Valor": "síndrome de pré-excitação" },
  { "Índice": "Sistema Cardiovascular e Síndromes Vasculíticas", "Valor": "hipotensão arterial com sintomas" },
  { "Índice": "Sistema Cardiovascular e Síndromes Vasculíticas", "Valor": "hipertensão arterial" },
  { "Índice": "Sistema Cardiovascular e Síndromes Vasculíticas", "Valor": "níveis tensionais arteriais acima dos índices mínimos exigidos" },
  { "Índice": "Sistema Cardiovascular e Síndromes Vasculíticas", "Valor": "doenças venosas, arteriais e linfáticas" },
  { "Índice": "Sistema Cardiovascular e Síndromes Vasculíticas", "Valor": "sinais ou sintomas de vasculites sistêmicas, primárias ou secundárias" },
  { "Índice": "Abdome e Trato Gastrointestinal", "Valor": "Anormalidades da parede, exceto as diastases dos retos abdominais, desde que não comprometam a capacidade laboral" },
  { "Índice": "Abdome e Trato Gastrointestinal", "Valor": "visceromegalias" },
  { "Índice": "Abdome e Trato Gastrointestinal", "Valor": "infecções, esquistossomose e outras parasitoses graves" },
  { "Índice": "Abdome e Trato Gastrointestinal", "Valor": "micoses profundas" },
  { "Índice": "Abdome e Trato Gastrointestinal", "Valor": "história de cirurgias que alterem de forma significativa a função gastrointestinal" },
  { "Índice": "Abdome e Trato Gastrointestinal", "Valor": "doenças hepáticas e pancreáticas, exceto as desprovidas de potencialidade mórbida" },
  { "Índice": "Abdome e Trato Gastrointestinal", "Valor": "doenças inflamatórias intestinais ou quaisquer distúrbios que comprometam, de forma significativa, a função do sistema" },
  { "Índice": "Aparelho Geniturinário", "Valor": "Anormalidades congênitas ou adquiridas da genitália, rins e vias urinárias, exceto fimose e as desprovidas de potencialidade mórbida" },
  { "Índice": "Aparelho Geniturinário", "Valor": "litíases (cálculos)" },
  { "Índice": "Aparelho Geniturinário", "Valor": "alterações demonstradas no exame de urina, cuja potencialidade mórbida não possa ser descartada" },
  { "Índice": "Aparelho Osteomioarticular e Doenças Reumatológicas", "Valor": "Escoliose apresentando mais de 13 graus Cobb" },
  { "Índice": "Aparelho Osteomioarticular e Doenças Reumatológicas", "Valor": "Lordose acentuada, com ângulo de Cobb com mais de 60 graus" },
  { "Índice": "Aparelho Osteomioarticular e Doenças Reumatológicas", "Valor": "Hipercifose que ao estudo radiológico apresente mais de 45 graus Cobb ou com angulação menor, haja acunhamento de mais de 5 graus, em perfil" },
  { "Índice": "Aparelho Osteomioarticular e Doenças Reumatológicas", "Valor": "Genu Recurvatum com mais de 20 graus aferidos por goniômetro" },
  { "Índice": "Aparelho Osteomioarticular e Doenças Reumatológicas", "Valor": "Genu Varum que apresente distância bicondilar superior a 7 cm" },
  { "Índice": "Aparelho Osteomioarticular e Doenças Reumatológicas", "Valor": "Genu Valgum que apresente distância bimaleolar superior a 7 cm" },
  { "Índice": "Aparelho Osteomioarticular e Doenças Reumatológicas", "Valor": "Megapófises da penúltima ou última vértebra lombar" },
  { "Índice": "Aparelho Osteomioarticular e Doenças Reumatológicas", "Valor": "espinha bífida com repercussão neurológica" },
  { "Índice": "Aparelho Osteomioarticular e Doenças Reumatológicas", "Valor": "Discrepância no comprimento dos membros inferiores superior a 10 mm para candidatos até 21 anos e superior a 15 mm para os demais" },
  { "Índice": "Aparelho Osteomioarticular e Doenças Reumatológicas", "Valor": "alterações degenerativas da coluna vertebral" },
  { "Índice": "Aparelho Osteomioarticular e Doenças Reumatológicas", "Valor": "presença de material de síntese não tolerado" },
  { "Índice": "Aparelho Osteomioarticular e Doenças Reumatológicas", "Valor": "próteses articulares de qualquer espécie" },
  { "Índice": "Aparelho Osteomioarticular e Doenças Reumatológicas", "Valor": "passado de cirurgias envolvendo articulações" },
  { "Índice": "Aparelho Osteomioarticular e Doenças Reumatológicas", "Valor": "doenças ou anormalidades dos ossos e articulações, congênitas ou adquiridas, inflamatórias, infecciosas, neoplásticas e traumáticas" },
  { "Índice": "Aparelho Osteomioarticular e Doenças Reumatológicas", "Valor": "sinais ou sintomas de lupos eritematoso sistêmico, artrite reumatoide, e outras doenças reumatológicas" },
  { "Índice": "Doenças Metabólicas e Endócrinas", "Valor": "Diabetes Mellitus" },
  { "Índice": "Doenças Metabólicas e Endócrinas", "Valor": "tumores hipotalâmicos e hipofisários" },
  { "Índice": "Doenças Metabólicas e Endócrinas", "Valor": "disfunção hipofisária e tireoidiana" },
  { "Índice": "Doenças Metabólicas e Endócrinas", "Valor": "tumores da tireoide" },
  { "Índice": "Doenças Metabólicas e Endócrinas", "Valor": "tumores de suprarrenal e suas disfunções congênitas ou adquiridas" },
  { "Índice": "Doenças Metabólicas e Endócrinas", "Valor": "hipogonadismo primário ou secundário" },
  { "Índice": "Doenças Metabólicas e Endócrinas", "Valor": "distúrbios do metabolismo do cálcio e fósforo, de origem endócrina" },
  { "Índice": "Doenças Metabólicas e Endócrinas", "Valor": "erros inatos do metabolismo" },
  { "Índice": "Doenças Metabólicas e Endócrinas", "Valor": "desenvolvimento anormal, em desacordo com a idade cronológica" },
  { "Índice": "Doenças Metabólicas e Endócrinas", "Valor": "obesidade" },
  { "Índice": "Sangue e Órgãos Hematopoiéticos", "Valor": "Alterações significativas do sangue e órgãos hematopoiéticos e/ou aquelas em que seja necessária investigação complementar" },
  { "Índice": "Doenças Neurológicas", "Valor": "Distúrbios neuromusculares, incluindo miastenia gravis" },
  { "Índice": "Doenças Neurológicas", "Valor": "afecções neurológicas" },
  { "Índice": "Doenças Neurológicas", "Valor": "anormalidades congênitas ou adquiridas" },
  { "Índice": "Doenças Neurológicas", "Valor": "ataxias, incoordenações, tremores, paresias e paralisias, atrofias, fraquezas musculares" },
  { "Índice": "Doenças Neurológicas", "Valor": "passado de crises convulsivas que tenham demandado tratamento neurológico" },
  { "Índice": "Doenças Neurológicas", "Valor": "epilepsias e doenças desmielinizantes, incluindo esclerose múltipla" },
  { "Índice": "Doenças Psiquiátricas", "Valor": "evidência atual ou a história pregressa de doença psiquiátrica" },
  { "Índice": "Doenças Psiquiátricas", "Valor": "uso pregresso ou atual de substâncias psicoativas ilícitas" },
  { "Índice": "Doenças Psiquiátricas", "Valor": "exame toxicológico positivo para substâncias psicoativas ilícitas" },
  { "Índice": "Tumores e Neoplasias", "Valor": "Qualquer história atual ou pregressa de tumor maligno" },
  { "Índice": "Tumores e Neoplasias", "Valor": "tumores benignos, dependendo da localização, repercussão funcional, potencial evolutivo" },
  { "Índice": "Tumores e Neoplasias", "Valor": "presença de sequelas decorrentes da neoplasia maligna, que gerem comprometimento da capacidade laboral" },
  { "Índice": "Condições Ginecológicas", "Valor": "Lesões de colo, corpo e trompas uterinos, ovários, vulva, vagina, alterações mamárias e outras anormalidades adquiridas, exceto se insignificantes e/ou desprovidas de potencialidade mórbida" },
  { "Índice": "Outras condições", "Valor": "Doenças ou condições detectadas no momento da avaliação médico-pericial potencialmente impeditivas" },
  { "Índice": "Outras condições", "Valor": "Qualquer condição que demande tratamento cirúrgico para sua correção" },
  { "Índice": "Outras condições", "Valor": "vigência de pós-operatório cujo restabelecimento ultrapasse o prazo limite para o resultado" },
  { "Índice": "Outras condições", "Valor": "História pregressa de cirurgia sem a devida comprovação" },
  { "Índice": "Outras condições", "Valor": "Doenças, condições ou alterações de exames complementares que demandem investigação clínica que ultrapasse o prazo máximo estipulado" },
  { "Índice": "Outras condições", "Valor": "sorologia positiva para o HIV sem a comprovação de portador assintomático" }
];

const slugify = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const inaptidaoCategories = Array.from(new Set(ANEXO_N_INAPTIDAO.map(r => r["Índice"]))).map(indice => ({
  id: slugify(indice),
  title: indice,
  items: ANEXO_N_INAPTIDAO.filter(r => r["Índice"] === indice).map(r => r.Valor),
}));

export const ConcursosGuide: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'indices' | 'inaptidao'>('indices');
  const [activeIndice, setActiveIndice] = useState<string>("altura");
  const [activeInaptidao, setActiveInaptidao] = useState<string>("cabeca");

  const currentIndice = indicesList.find(i => i.id === activeIndice);
  const currentInaptidao = inaptidaoCategories.find(i => i.id === activeInaptidao);

  return (
    <div className="flex flex-col h-full bg-[#F3F5F7]">
      <Header title="Índices Mínimos - ANEXO N" />
      <div className="p-4 space-y-4 max-w-2xl mx-auto w-full flex-1">
        <div className="text-center mb-1">
          <h2 className="text-base font-heading font-bold text-[#050F41]">PADRÕES PSICOFÍSICOS ADMISSIONAIS</h2>
          <p className="text-xs text-gray-500 font-body mt-1">Índices mínimos e condições incapacitantes para ingresso.</p>
        </div>

        <div className="bg-gray-200/60 p-1 rounded-xl flex shadow-inner border border-transparent">
          <button 
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'indices' ? 'bg-[#050F41] text-white shadow-sm' : 'text-gray-600 hover:bg-white/30'}`}
            onClick={() => setActiveTab('indices')}
          >
            Índices Mínimos
          </button>
          <button 
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'inaptidao' ? 'bg-red-700 text-white shadow-sm' : 'text-gray-600 hover:bg-white/30'}`}
            onClick={() => setActiveTab('inaptidao')}
          >
            Inaptidão
          </button>
        </div>

        {activeTab === 'indices' && (
          <div className="space-y-3.5 animate-fade-in">
            <div className="relative">
              <select 
                className="w-full bg-white border border-gray-200 text-gray-700 py-3 px-4 rounded-xl font-medium focus:outline-none text-sm shadow-sm appearance-none cursor-pointer font-body"
                value={activeIndice}
                onChange={(e) => setActiveIndice(e.target.value)}
              >
                {indicesList.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
              </select>
              <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            {currentIndice && (
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200/60">
                <ul className="space-y-3.5">
                  {currentIndice.items.map((item, idx) => (
                    <li key={idx} className="flex gap-3 text-gray-700 font-body text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#050F41] shrink-0 mt-2" />
                      <span className="leading-relaxed text-justify flex-1">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {activeTab === 'inaptidao' && (
          <div className="space-y-3.5 animate-fade-in">
            <div className="relative">
              <select 
                className="w-full bg-white border border-gray-200 text-gray-700 py-3 px-4 rounded-xl font-medium focus:outline-none text-sm shadow-sm appearance-none cursor-pointer font-body"
                value={activeInaptidao}
                onChange={(e) => setActiveInaptidao(e.target.value)}
              >
                {inaptidaoCategories.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
              </select>
              <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            {currentInaptidao && (
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200/60">
                <ul className="space-y-3.5">
                  {currentInaptidao.items.map((item, idx) => (
                    <li key={idx} className="flex gap-3 text-gray-700 font-body text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-700 shrink-0 mt-2" />
                      <span className="leading-relaxed text-justify flex-1">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
