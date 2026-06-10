import React, { useState } from 'react';
import { Header } from './Header';
import { Ruler, Eye, FileText, Accessibility, Heart, Ear, ChevronDown, CheckCircle2, AlertTriangle } from 'lucide-react';

const indicesList = [
  {
    id: "altura",
    title: "I - Altura, peso mínimo e máximo",
    icon: <Ruler size={24} className="text-navy" />,
    items: [
      "Altura: CN: 1,54m a 1,95m. Demais: 1,54m (mulheres) / 1,60m (homens) a 2,00m.",
      "IMC: Entre 18 e 30."
    ]
  },
  {
    id: "acuidade",
    title: "II - Acuidade visual",
    icon: <Eye size={24} className="text-navy" />,
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
    icon: <Eye size={24} className="text-navy" />,
    items: [
      "Pesquisa de discromatopsia realizada exclusivamente através das Pranchas de Ishihara (modelos com 24 ou 38 pranchas)."
    ]
  },
  {
    id: "dentes",
    title: "IV - Dentes",
    icon: <FileText size={24} className="text-navy" />,
    items: [
      "Mínimo de 20 dentes naturais, hígidos ou tratados, com pelo menos 4 molares opostos 2 a 2."
    ]
  },
  {
    id: "motilidade",
    title: "V - Limites mínimos de motilidade",
    icon: <Accessibility size={24} className="text-navy" />,
    items: [
      "OMBRO: Elevação 90º Abdução 90º.",
      "COTOVELO: Flexão 100º Extensão 15º.",
      "PUNHO: Alcance total a 15º.",
      "MÃO: Pronossupinação a 90º.",
      "DEDOS: Formação de pinça digital.",
      "QUADRIL: Flexão 90º. Extensão 10º.",
      "JOELHO: Extensão total. Flexão 90º.",
      "TORNOZELO: Dorsiflexão 10º. Flexão plantar 10º."
    ]
  },
  {
    id: "cardio",
    title: "VI - Índices cardiovasculares",
    icon: <Heart size={24} className="text-navy" />,
    items: [
      "Pressão Arterial: < 140/90 mmHg.",
      "Frequência Cardíaca: < 120 bpm."
    ]
  },
  {
    id: "audicao",
    title: "VII - Índice audiométrico",
    icon: <Ear size={24} className="text-navy" />,
    items: [
      "Candidatos CN, EN, EFOMM, EAM, CAP, CPA, CPFN e SMV Praças até 25 anos: Perdas de até 40dB em qualquer frequência",
      "Demais candidatos: Perdas maiores que 40dB em frequências até 3000 Hz; Nas frequências de 4000 a 8000 Hz, perdas maiores que 40 dB e menores ou iguais a 70dB , desde que satisfeitas as seguintes condições: - Seja unilateral; - Apresente otoscopia normal; - Índice de Reconhecimento da Fala (IRF) para monossílabos maior ou igual a 88%; e - Apresente Limiar de Reconhecimento da Fala (LRF) menor ou igual a 50 dB."
    ]
  }
];

const inaptidaoCategories = [
  { id: "cabeca", title: "Cabeça e Pescoço", items: ["deformações", "perdas extensas de substância", "cicatrizes deformantes ou aderentes", "contraturas musculares anormais", "cisto branquial", "higroma cístico de pescoço e fístulas"] },
  { id: "ouvido", title: "Ouvido e Audição", items: ["Deformidades significativas ou agenesia das orelhas", "anormalidades do conduto auditivo e tímpano, exceto as desprovidas de potencialidade mórbida", "infecções crônicas recidivantes", "otite média crônica", "labirintopatias", "tumores"] },
  { id: "olhos", title: "Olhos e Visão", items: ["Ceratocone", "glaucoma", "infecções e processos inflamatórios, excetuando conjuntivites agudas e hordéolo", "ulcerações", "tumores, excetuando cisto benigno palpebral", "opacificações", "sequelas de traumatismo ou de queimaduras", "doenças congênitas e deformidades congênitas ou adquiridas, incluindo desvios dos eixos visuais", "anormalidades funcionais significativas e diminuição da acuidade visual além da tolerância permitida", "lesões retinianas", "doenças neurológicas ou musculares oculares", "discromatopsia para as cores verde e vermelha"] },
  { id: "boca", title: "Boca, Nariz, Laringe, Faringe, Traqueia e Esôfago", items: ["Anormalidades estruturais congênitas ou não", "desvio acentuado de septo nasal", "mutilações", "tumores", "atresias e retrações", "fístulas congênitas ou adquiridas", "infecções crônicas ou recidivantes", "deficiências funcionais na mastigação, deglutição, respiração, fonação, fala", "nódulos, pólipos e cistos vocais, fendas glóticas, paralisia de prega vocal, refluxo laringofaríngeo intenso e alterações na fisiologia vocal para Sargento Músico"] },
  { id: "estomato", title: "Aparelho Estomatognático", items: ["Estado sanitário bucal deficiente", "cáries", "restaurações e próteses insatisfatórias", "doença periodontal não controlada pelo autocuidado", "gengivite com ou sem presença de cálculo", "infecções, cistos, neoplasias", "restos radiculares", "deformidades estruturais como fissuras labiais ou labiopalatinas não reabilitadas", "sequelas deformantes de síndromes ou de alterações do desenvolvimento maxilo-facial", "má-oclusão de origem dentária ou esquelética com comprometimento funcional", "ausência de contatos interoclusais em regiões de molares, tolerando-se a presença de próteses", "ausência dentária na bateria labial sem reabilitação", "menos de dez dentes naturais em uma das arcadas"] },
  { id: "pele", title: "Pele e Tecido Celular Subcutâneo ou Conjuntivo", items: ["Infecções crônicas ou recidivantes, inclusive a acne com processo inflamatório agudo ou dermatose que comprometa o barbear", "micoses, infectadas ou cronificadas", "parasitoses cutâneas extensas", "eczemas alérgicos", "expressões cutâneas das doenças autoimunes, excetuando-se vitiligo, manifestações das doenças alérgicas", "ulcerações e edemas", "cicatrizes deformantes, que poderão vir a comprometer a capacidade laborativa", "afecções em que haja contraindicação à exposição solar prolongada", "tatuagens que façam alusão a ideologia terrorista ou extremista ou na região da cabeça, do rosto e da face anterior do pescoço", "sinais ou sintomas de esclerose sistêmica, esclerodermia, poliomiosite, dermatomiosite, doença mista do tecido conjuntivo, síndrome de Sjögren e síndrome antifosfolipide"] },
  { id: "pulmoes", title: "Pulmões e Parede Torácica", items: ["Deformidade relevante congênita ou adquirida da caixa torácica com prejuízo da função respiratória", "infecções bacterianas ou micóticas", "distúrbios ventilatórios, obstrutivos ou restritivos, hiperreatividade brônquica, história de crises de broncoespasmo ainda na adolescência", "fístula e fibrose pulmonar difusa", "tumores malignos e benignos dos pulmões e pleura", "anormalidades radiológicas, exceto se insignificantes e desprovidas de potencialidade mórbida e sem comprometimento funcional"] },
  { id: "cardio_vasc", title: "Sistema Cardiovascular e Síndromes Vasculíticas", items: ["Anormalidades congênitas, ressalvadas CIA, a CIV e a PCA corrigidas cirurgicamente, que não promovam repercussão hemodinâmica ou adquiridas", "infecções, inflamações, arritmias, doenças do pericárdio, miocárdio, endocárdio e da circulação intrínseca do coração", "anormalidades do feixe de condução ressalvado o bloqueio de ramo direito de primeiro grau", "doenças orovalvares", "síndrome de pré-excitação", "hipotensão arterial com sintomas", "hipertensão arterial", "níveis tensionais arteriais acima dos índices mínimos exigidos", "doenças venosas, arteriais e linfáticas", "sinais ou sintomas de vasculites sistêmicas, primárias ou secundárias"] },
  { id: "abdome", title: "Abdome e Trato Gastrointestinal", items: ["Anormalidades da parede, exceto as diastases dos retos abdominais, desde que não comprometam a capacidade laboral", "visceromegalias", "infecções, esquistossomose e outras parasitoses graves", "micoses profundas", "história de cirurgias que alterem de forma significativa a função gastrointestinal", "doenças hepáticas e pancreáticas, exceto as desprovidas de potencialidade mórbida", "doenças inflamatórias intestinais ou quaisquer distúrbios que comprometam, de forma significativa, a função do sistema"] },
  { id: "genito", title: "Aparelho Geniturinário", items: ["Anormalidades congênitas ou adquiridas da genitália, rins e vias urinárias, exceto fimose e as desprovidas de potencialidade mórbida", "litíases (cálculos)", "alterações demonstradas no exame de urina, cuja potencialidade mórbida não possa ser descartada"] },
  { id: "osteo", title: "Aparelho Osteomioarticular e Doenças Reumatológicas", items: ["Escoliose apresentando mais de 13 graus Cobb", "Lordose acentuada, com ângulo de Cobb com mais de 60 graus", "Hipercifose que ao estudo radiológico apresente mais de 45 graus Cobb ou com angulação menor, haja acunhamento de mais de 5 graus, em perfil", "Genu Recurvatum com mais de 20 graus aferidos por goniômetro", "Genu Varum que apresente distância bicondilar superior a 7 cm", "Genu Valgum que apresente distância bimaleolar superior a 7 cm", "Megapófises da penúltima ou última vértebra lombar", "espinha bífida com repercussão neurológica", "Discrepância no comprimento dos membros inferiores superior a 10 mm para candidatos até 21 anos e superior a 15 mm para os demais", "alterações degenerativas da coluna vertebral", "presença de material de síntese não tolerado (articulares)", "próteses articulares de qualquer espécie", "passado de cirurgias envolvendo articulações", "doenças ou anormalidades dos ossos e articulações, congênitas ou adquiridas, inflamatórias, infecciosas, neoplásticas e traumáticas", "sinais ou sintomas de lupos eritematoso sistêmico, artrite reumatoide, e outras doenças reumatológicas"] },
  { id: "metabolicas", title: "Doenças Metabólicas e Endócrinas", items: ["Diabetes Mellitus", "tumores hipotalâmicos e hipofisários", "disfunção hipofisária e tireoidiana", "tumores da tireoide", "tumores de suprarrenal e suas disfunções congênitas ou adquiridas", "hipogonadismo primário ou secundário", "distúrbios do metabolismo do cálcio e fósforo, de origem endócrina", "erros inatos do metabolismo", "desenvolvimento anormal, em desacordo com a idade cronológica", "obesidade"] },
  { id: "sangue", title: "Sangue e Órgãos Hematopoiéticos", items: ["Alterações significativas do sangue e órgãos hematopoiéticos e/ou aquelas em que seja necessária investigação complementar"] },
  { id: "neuro", title: "Doenças Neurológicas", items: ["Distúrbios neuromusculares, incluindo miastenia gravis", "afecções neurológicas", "anormalidades congênitas ou adquiridas", "ataxias, incoordenações, tremores, paresias e paralisias, atrofias, fraquezas musculares", "passado de crises convulsivas que tenham demandado tratamento neurológico", "epilepsias e doenças desmielinizantes, incluindo esclerose múltipla"] },
  { id: "psiqui", title: "Doenças Psiquiátricas", items: ["evidência atual ou a história pregressa de doença psiquiátrica", "uso pregresso ou atual de substâncias psicoativas ilícitas", "exame toxicológico positivo para substâncias psicoativas ilícitas"] },
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
    <div className="flex flex-col h-full bg-gray-50">
      <Header title="Concursos - ANEXO N" />
      <div className="p-4 space-y-4 animate-fade-in overflow-auto pb-24">
        
        <div className="text-center mb-2">
          <h2 className="text-xl font-bold text-navy font-heading leading-tight">PADRÕES PSICOFÍSICOS ADMISSIONAIS</h2>
          <p className="text-sm text-gray-600 font-body mt-2 leading-snug">Índices mínimos e condições de inaptidão nas Inspeções de Saúde com finalidade de Ingresso.</p>
        </div>

        <div className="bg-white rounded-lg p-1 shadow-sm border border-gray-100 flex mb-2">
          <button 
            className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${activeTab === 'indices' ? 'bg-navy text-white' : 'text-gray-500 hover:bg-gray-50'}`}
            onClick={() => setActiveTab('indices')}
          >
            Índices Mínimos
          </button>
          <button 
            className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${activeTab === 'inaptidao' ? 'bg-red-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
            onClick={() => setActiveTab('inaptidao')}
          >
            Inaptidão
          </button>
        </div>

        {activeTab === 'indices' && (
          <div className="space-y-4 animate-fade-in">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-navy">Selecione a Categoria</label>
              <div className="relative">
                <select 
                  className="w-full bg-white border border-gray-200 text-gray-700 py-3 px-4 pr-10 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-navy focus:border-transparent font-medium"
                  value={activeIndice}
                  onChange={(e) => setActiveIndice(e.target.value)}
                >
                  {indicesList.map(item => (
                    <option key={item.id} value={item.id}>{item.title}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                  <ChevronDown size={20} />
                </div>
              </div>
            </div>

            {currentIndice && (
              <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-navy mb-4 flex items-center gap-2">
                  <div className="p-2 bg-navy/5 rounded-lg">
                    {currentIndice.icon}
                  </div>
                  <span className="font-heading text-[16px] leading-[25px]">{currentIndice.title}</span>
                </h3>
                <ul className="space-y-3">
                  {currentIndice.items.map((item, idx) => (
                    <li key={idx} className="flex gap-3 text-gray-700 font-body items-start">
                      <CheckCircle2 className="text-navy mt-0.5 shrink-0" size={18} />
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {activeTab === 'inaptidao' && (
          <div className="space-y-4 animate-fade-in">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-navy">Selecione o Sistema/Grupo</label>
              <div className="relative">
                <select 
                  className="w-full bg-white border border-gray-200 text-gray-700 py-3 px-4 pr-10 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-navy focus:border-transparent font-medium"
                  value={activeInaptidao}
                  onChange={(e) => setActiveInaptidao(e.target.value)}
                >
                  {inaptidaoCategories.map(item => (
                    <option key={item.id} value={item.id}>{item.title}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                  <ChevronDown size={20} />
                </div>
              </div>
            </div>

            {currentInaptidao && (
              <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-navy mb-4 flex items-center gap-2">
                  <div className="p-2 bg-navy/5 rounded-lg shrink-0">
                    <AlertTriangle size={24} className="text-navy" />
                  </div>
                  <span className="font-heading text-[16px] leading-[25px]">{currentInaptidao.title}</span>
                </h3>
                <ul className="space-y-3">
                  {currentInaptidao.items.map((item, idx) => (
                    <li key={idx} className="flex gap-3 text-gray-700 font-body items-start">
                      <span className="shrink-0 mt-2 w-1.5 h-1.5 rounded-full bg-navy" />
                      <span className="leading-relaxed">{item}</span>
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
}
