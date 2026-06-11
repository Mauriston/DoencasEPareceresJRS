import React, { useState } from 'react';
import { Header } from './Header';
import { Ruler, Eye, FileText, Accessibility, Heart, Ear, ChevronDown, CheckCircle2, AlertTriangle } from 'lucide-react';

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
      "TORNOZELO: Dorsiflexão 10°. Flexão plantar 10°"
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
      "Demais candidatos: Perdas maiores que 40dB em frequências até 3000 Hz; Nas frequências de 4000 a 8000 Hz, perdas maiores que 40 dB e menores ou iguais a 70dB , desde que satisfeitas as seguintes condições: - Seja unilateral; - Apresente otoscopia normal; - Índice de Reconhecimento da Fala (IRF) para monossílabos maior ou igual a 88%; e - Apresente Limiar de Reconhecimento da Fala (LRF) menor ou igual a 50 dB."
    ]
  }
];

const inaptidaoCategories = [
  { id: "cabeca", title: "Cabeça e Pescoço", items: ["deformações", "perdas extensas de substância", "cicatrizes deformantes ou aderentes", "contraturas musculares anormais", "cisto branquial", "higroma cístico de pescoço e fístulas"] },
  { id: "ouvido", title: "Ouvido e Audição", items: ["Deformidades significativas ou agenesia das orelhas", "anormalidades do conduto auditivo e tímpano, exceto as desprovidas de potencialidade mórbida", "infecções crónicas recidivantes", "otite média crónica", "labirintopatias", "tumores"] },
  { id: "olhos", title: "Olhos e Visão", items: ["Ceratocone", "glaucoma", "infecções e processos inflamatórios, excetuando conjuntivites agutas e hordéolo", "ulcerações", "tumores, excetuando cisto benigno palpebral", "opacificações", "sequelas de traumatismo ou de queimaduras", "doenças congénitas e deformidades congénitas ou adquiridas, incluindo desvios dos eixos visuais", "anormalidades functionalidades significativas e diminuição da acuidade visual além da tolerância permitida", "lesões retinianas", "doenças neurológicas ou musculares oculares", "discromatopsia para as cores verde e vermelha"] },
  { id: "boca", title: "Boca, Nariz, Laringe, Faringe, Traqueia e Esófago", items: ["Anormalidades estruturais congénitas ou não", "desvio acentuado de septo nasal", "mutilações", "tumores", "atresias e retrações", "fístulas congénitas ou adquiridas", "infecções crónicas ou recidivantes", "deficiências funcionais na mastigação, deglutição, respiração, fonação, fala", "nódulos, pólipos e cistos vocais, fendas glóticas, paralisia de prega vocal, refluxo laringofaríngeo intenso e alterações na fisiologia vocal para Sargento Músico"] },
  { id: "estomato", title: "Aparelho Estomatognático", items: ["Estado sanitário bucal deficiente", "cáries", "restaurações e próteses insatisfatórias", "doença periodontal não controlada pelo autocuidado", "gengivite com ou sem presença de cálculo", "infecções, cistos, neoplasias", "restos radiculares", "deformidades estruturais como fissuras labiais ou labiopalatinas não reabilitadas", "sequelas deformantes de síndromes ou de alterações do desenvolvimento maxilo-facial", "má-oclusão de origem dentária ou esquelética com comprometimento funcional", "ausência de contatos interoclusais em regiões de molares, tolerando-se a presença de próteses", "ausência dentária na bateria labial sem reabilitação", "menos de dez dentes naturais em uma das arcadas"] },
  { id: "pele", title: "Pele e Tecido Celular Subcutâneo ou Conjuntivo", items: ["Infecções crónicas ou recidivantes, inclusive a acne com processo inflamatório agudo ou dermatose que comprometa o barbear", "micoses, infectadas ou cronificadas", "parasitoses cutâneas extensas", "eczemas alérgicos", "expressões cutâneas das doenças autoimunes, excetuando-se vitiligo, manifestações das doenças alérgicas", "ulcerações e edemas", "cicatrizes deformantes, que poderão vir a comprometer a capacidade laborativa", "afeções em que haja contraindicação à exposição solar prolongada", "tatuagens que façam alusão a ideologia terrorista ou extremista ou na região da cabeça, do rosto e da face anterior do pescoço", "sinais ou sintomas de esclerose sistémica, esclerodermia, poliomiosite, dermatomiosite, doença mista do tecido conjuntivo, síndrome de Sjögren e síndrome antifosfolípide"] },
  { id: "pulmoes", title: "Pulmões e Parede Torácica", items: ["Deformidade relevante congénita ou adquirida da caixa torácica com prejuízo da função respiratória", "infecções bacterianas ou micóticas", "distúrbios ventilatórios, obstrutivos ou restritivos, hiperreatividade brónquica, história de crises de broncoespasmo ainda na adolescência", "fístula e fibrose pulmonar difusa", "tumores malignos e benignos dos pulmões e pleura", "anormalidades radiológicas, exceto se insignificantes e desprovidas de potencialidade mórbida e sem comprometimento funcional"] },
  { id: "cardio_vasc", title: "Sistema Cardiovascular e Síndromes Vasculíticas", items: ["Anormalidades congénitas, ressalvadas CIA, a CIV e a PCA corrigidas cirurgicamente, que não promovam repercussão hemodinâmica ou adquiridas", "infecções, inflamações, arritmias, doenças do pericárdio, miocárdio, endocárdio e da circulação intrínseca do coração", "anormalidades do feixe de condução ressalvado o bloqueio de ramo direito de primeiro grau", "doenças orovalvares", "síndrome de pré-excitação", "hipotensão arterial com sintomas", "hipertensão arterial", "níveis tensionais arteriais acima dos índices mínimos exigidos", "doenças venosas, arteriais e linfáticas", "sinais ou sintomas de vasculites sistémicas, primárias ou secundárias"] },
  { id: "abdome", title: "Abdome e Trato Gastrointestinal", items: ["Anormalidades da parede, exceto as diastases dos retos abdominais, desde que não comprometam a capacidade laboral", "visceromegalias", "infecções, esquistossomose e outras parasitoses graves", "micoses profundas", "história de cirurgias que alterem de forma significativa a função gastrointestinal", "doenças hepáticas e pancreáticas, exceto as desprovidas de potencialidade mórbida", "doenças inflamatórias intestinais ou quaisquer distúrbios que comprometam, de forma significativa, a função do sistema"] },
  { id: "genito", title: "Aparelho Geniturinário", items: ["Anormalidades congénitas ou adquiridas da genitália, rins e vias urinárias, exceto fimose e as desprovidas de potencialidade mórbida", "litíases (cálculos)", "alterações demonstradas no exame de urina, cuja potencialidade mórbida não possa ser descartada"] },
  { id: "osteo", title: "Aparelho Osteomioarticular e Doenças Reumatológicas", items: ["Escoliose apresentando mais de 13 graus Cobb", "Lordose acentuada, com ângulo de Cobb com mais de 60 graus", "Hipercifose que ao estudo radiológico apresente mais de 45 graus Cobb ou com angulação menor, haja acunhamento de mais de 5 graus, em perfil", "Genu Recurvatum com mais de 20 graus aferidos por goniómetro", "Genu Varum que apresente distância bicondilar superior a 7 cm", "Genu Valgum que apresente distância bimaleolar superior a 7 cm", "Megapófises da penúltima ou última vértebra lombar", "espinha bífida com repercussão neurológica", "Discrepância no comprimento dos membros inferiores superior a 10 mm para candidatos até 21 anos e superior a 15 mm para os demais", "alterações degenerativas da coluna vertebral", "presença de material de síntese não tolerado (articulares)", "próteses articulares de qualquer espécie", "passado de cirurgias envolvendo articulações", "doenças ou anormalidades dos ossos e articulações, congénitas ou adquiridas, inflamatórias, infecciosas, neoplásicas e traumáticas", "sinais ou sintomas de lupos eritematoso sistémico, artrite reumatoide, e outras doenças reumatológicas"] },
  { id: "metabolicas", title: "Doenças Metabólicas e Endócrinas", items: ["Diabetes Mellitus", "tumores hipotalâmicos e hipofisários", "disfunção hipofisária e tireoidiana", "tumores da tireoide", "tumores de suprarrenal e suas disfunções congénitas ou adquiridas", "hipogonadismo primário ou secundário", "distúrbios do metabolismo do cálcio e fósforo, de origem endócrina", "erros inatos do metabolismo", "desenvolvimento anormal, em desacordo com a idade cronológica", "obesidade"] },
  { id: "sangue", title: "Sangue e Órgãos Hematopoiéticos", items: ["Alterações significativas do sangue e órgãos hematopoiéticos e/ou aquelas em que seja necessária investigação complementar"] },
  { id: "neuro", title: "Doenças Neurológicas", items: ["Distúrbios neuromusculares, incluindo miastenia gravis", "afecções neurológicas", "anormalidades congénitas ou adquiridas", "ataxias, incoordenações, tremores, paresias e paralisias, atrofias, fraquezas musculares", "passado de crises convulsivas que tenham demandado tratamento neurológico", "epilepsias e doenças desmielinizantes, incluindo esclerose múltipla"] },
  { id: "psiqui", title: "Doenças Psiquiátricas", items: ["evidência atual ou a história pregressa de doença psiquiátrica", "uso pregresso ou atual de substâncias psychoativas ilícitas", "exame toxicológico positivo para substâncias psychoativas ilícitas"] },
  { id: "tumores", title: "Tumores e Neoplasias", items: ["Qualquer história atual ou pregressa de tumor maligno", "tumores benignos, dependendo da localização, repercussão funcional, potencial evolutivo", "presença de sequelas decorrentes da neoplasia maligna, que gerem comprometimento da capacidade laboral"] },
  { id: "gineco", title: "Condições Ginecológicas", items: ["Lesões de colo, corpo e trompas uterinos, ovários, vulva, vagina, alterações mamárias e outras anormalidades adquiridas, exceto se insignificantes e/ou desprovidas de potencialidade mórbida"] },
  { id: "outras", title: "Outras condições", items: ["Doenças ou condições detectadas no momento da avaliação médico-pericial potencialmente impeditivas", "Qualquer condição que demande tratamento cirúrgico para sua correção", "vigência de pós-operatório cujo restabelecimento ultrapasse o prazo limite para o resultado", "História pregressa de cirurgia sem a devida comprovação", "Doenças, condições ou alterações de exames complementares que demandem investigação clínica que ultrapasse o prazo máximo estipulado", "sorologia positiva para o HIV sem a comprovação de portador assintomático"] }
];

export const ConcursosGuide: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'indices' | 'inaptidao'>('indices');
  const [activeIndice, setActiveIndice] = useState<string>("altura");
  const [activeInaptidao, setActiveInaptidao] = useState<string>("cabeca");

  const currentIndice = indicesList.find(i => i.id === activeIndice);
  const currentInaptidao = inaptidaoCategories.find(i => i.id === activeInaptidao);

  return (
    <div className="flex flex-col h-full bg-[#F3F5F7]">
      <Header title="Concursos - ANEXO N" />
      <div className="p-4 space-y-4 max-w-2xl mx-auto w-full flex-1">
        
        <div className="text-center mb-1">
          <h2 className="text-base font-heading font-bold text-[#050F41]">PADRÕES PSICOFÍSICOS ADMISSIONAIS</h2>
          <p className="text-xs text-gray-500 font-body mt-1">Índices mínimos e condições incapacitantes para ingresso.</p>
        </div>

        {/* M3 Segmented Buttons Layout */}
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
                {/* Removido o cabeçalho repetitivo com ícone de alerta e padronizado em Lista Discreta e Harmonizada */}
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