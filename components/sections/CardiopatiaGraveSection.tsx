import React from 'react';

export const CardiopatiaGraveSection: React.FC = () => {
  return (
    <section id="doenca-cardiopatia" className="scroll-mt-16 pt-4 border-t border-gray-100">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-red-100 text-red-800 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs">2</div>
        <h2 className="text-sm font-bold text-navy uppercase tracking-wide">Cardiopatia Grave</h2>
      </div>

      <div className="space-y-4 text-xs leading-relaxed text-justify text-gray-600">
        <p className="font-bold text-navy uppercase text-[11px] mb-2 leading-none">4. Conceituação</p>
        <p>
          4.1. Cardiopatia grave não é um diagnóstico clínico. A sua classificação se baseia nos aspectos de gravidade das cardiopatias, colocados em perspectiva com a capacidade de exercer as funções laborativas e suas relações como prognóstico de longo prazo e a sobrevivência do inspecionado.
        </p>
        <p>
          São consideradas cardiopatias graves, as doenças cardiovasculares agudas ou crônicas que acarretam, de modo irreversível, em maior ou menor período de tempo, a perda da capacidade física e funcional do coração, ultrapassando os limites de eficiência dos mecanismos de compensação, determinando incapacidade permanente para todo e qualquer trabalho ou o risco de morte prematura, não obstante o tratamento clínico ou cirúrgico adequado.
        </p>
        
        <p>4.2. São consideradas cardiopatias graves:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>a) as cardiopatias agudas, rápidas em sua evolução para óbito ou que se tornam crônicas, caracterizadas por perda da capacidade física e funcional do coração;</li>
          <li>b) as cardiopatias crônicas, quando limitam, progressivamente, a capacidade física e funcional do coração;</li>
          <li>c) as cardiopatias agudas ou crônicas que apresentam dependência total de suporte inotrópico farmacológico ou mecânico; e</li>
          <li>d) a cardiopatia terminal: cardiopatia grave em que a expectativa de vida encontra-se extremamente reduzida.</li>
        </ul>

        <p>4.3. A limitação da capacidade física e funcional é definida pela presença de: a) insuficiência cardíaca; b) insuficiência coronariana; c) arritmias complexas; d) hipoxemia; e) manifestações de baixo débito cerebral.</p>

        <p>4.4. Classificação da New York Heart Association (NYHA):</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Classe/Grau I:</strong> sem limitação da atividade física normal;</li>
          <li><strong>Classe/Grau II:</strong> leve limitação; grandes esforços provocam sintomas;</li>
          <li><strong>Classe/Grau III:</strong> nítida limitação; pequenos esforços provocam sintomas; e</li>
          <li><strong>Classe/Grau IV:</strong> impossibilita qualquer atividade física; sintomas em repouso.</li>
        </ul>

        <p className="font-bold text-navy uppercase text-[11px] mt-6 border-t border-gray-150 pt-4">5. Afecções descritas capazes de causar cardiopatia grave</p>

        <div className="space-y-3 pl-2 border-l border-gray-200">
          <p className="font-bold text-[#050f41] text-[10.5px]">5.1. Cardiopatia Isquêmica</p>
          <p id="cardio-isquemica-aguda-ssst" className="font-bold text-[#050f41] scroll-mt-24">a) <span className="bg-yellow-100 text-navy font-bold px-1 rounded">Síndromes coronarianas agudas sem supradesnível de ST</span>: 1) baixo débito cardíaco; 2) insuficiência cardíaca aguda; 3) arritmia ventricular maligna; 4) disfunção ventricular mecânica.</p>
          <p id="cardio-isquemica-aguda-csst" className="font-bold text-[#050f41] scroll-mt-24">b) <span className="bg-yellow-100 text-navy font-bold px-1 rounded">Síndromes coronarianas agudas com supradesnível de ST ou BRE novo</span>: 1) choque cardiogênico (Killip IV); 2) insuficiência cardíaca aguda (Killip II ou III); 3) arritmia ventricular maligna; 4) complicação mecânica do IAM; 5) IAM anterior extenso; 6) BAV II grau Mobitz II; 7) BAVT.</p>
          <p id="cardio-isquemica-cronica" className="font-bold text-[#050f41] scroll-mt-24">5.1.2. <span className="bg-yellow-100 text-navy font-bold px-1 rounded">Forma crônica</span>: angina classes III e IV da CCS; disfunção ventricular progressiva; arritmias graves; ECG com zona elétrica inativa, FA, arritmias ventriculares complexas; ecocardiograma com FE ≤0,40; cinecoronarioventriculografia com lesão de tronco ≥50% ou lesões em três vasos.</p>
        </div>

        <p id="cardio-hipertensiva" className="font-bold text-[#050f41] scroll-mt-24 mt-4">5.2. <span className="bg-yellow-100 text-navy font-bold px-1 rounded">Cardiopatia Hipertensiva</span>: hipertrofia ventricular esquerda que não regride; disfunção sistólica com FE &lt;0,40; arritmias supraventriculares e ventriculares complexas; cardiopatia isquêmica grave associada.</p>

        <p className="font-bold text-gray-500 mt-4">5.3. Miocardiopatias</p>
        <p id="cardio-miocardio-hiper" className="font-bold text-[#050f41] scroll-mt-24">5.3.1. <span className="bg-yellow-100 text-navy font-bold px-1 rounded">Miocardiopatias Hipertróficas</span>: síncope, angina, IC, embolia sistêmica; FE &lt;40%; FA; síndrome WPW; arritmias ventriculares; forma obstrutiva com gradiente ≥50 mmHg.</p>
        <p id="cardio-miocardio-dilatada" className="font-bold text-[#050f41] scroll-mt-24">5.3.2. <span className="bg-yellow-100 text-navy font-bold px-1 rounded">Miocardiopatias Dilatadas</span>: fenômenos tromboembólicos; cardiomegalia importante; IC classes III e IV; FE ≤0,40; FA; arritmias ventriculares complexas.</p>
        <p id="cardio-miocardio-restritiva" className="font-bold text-[#050f41] scroll-mt-24">5.3.3. <span className="bg-yellow-100 text-navy font-bold px-1 rounded">Miocardiopatias Restritivas</span>: fenômenos tromboembólicos; cardiomegalia acentuada; IC classes III e IV.</p>
        <p id="cardio-miocardio-chagas" className="font-bold text-[#050f41] scroll-mt-24">5.3.4. <span className="bg-yellow-100 text-navy font-bold px-1 rounded">Cardiopatia Chagásica Crônica</span>: síncope; cardiomegalia; IC classes III e IV; FA; arritmias ventriculares complexas; BAV total.</p>

        <p id="cardio-arritmias" className="font-bold text-[#050f41] scroll-mt-24 mt-4">5.4. <span className="bg-yellow-100 text-navy font-bold px-1 rounded">Arritmias Cardíacas</span>: arritmias graves resistentes ao tratamento: disfunção do nó sinusal sintomática; BAV 2° grau Mobitz II; BAVT sintomático; FA com baixa resposta ventricular; taquicardias ventriculares sintomáticas; síndrome de preexcitação ventricular de alto risco.</p>

        <p id="cardio-cor-pulmonale" className="font-bold text-[#050f41] scroll-mt-24 mt-4">5.5. <span className="bg-yellow-100 text-navy font-bold px-1 rounded">Cor Pulmonale Crônico</span>: hipóxia cerebral; IC direita; angina III-IV NYHA; crises sincopais; PO2 &lt;60 mmHg; PCO2 &gt;50 mmHg; PAP sistólica &gt;60 mmHg.</p>

        <p id="cardio-congenitas" className="font-bold text-[#050f41] scroll-mt-24 mt-4">5.6. <span className="bg-yellow-100 text-navy font-bold px-1 rounded">Cardiopatias Congênitas</span>: crises hipoxêmicas; IC classes III e IV; hemoptises; arritmias malignas; doença arterial pulmonar; cardiopatias complexas.</p>

        <p id="cardio-valvopatias" className="font-bold text-[#050f41] scroll-mt-24 mt-4">5.7. <span className="bg-yellow-100 text-navy font-bold px-1 rounded">Valvopatias</span>: IM severa (FE diminuída, padrão catastrófico); EM com área &lt;1,0 cm²; IA com FE &lt;40%; EA com área &lt;0,75 cm² e síncope; próteses com disfunção severa.</p>

        <p id="cardio-pericardiopatias" className="font-bold text-[#050f41] scroll-mt-24 mt-4">5.8-5.9. <span className="bg-yellow-100 text-navy font-bold px-1 rounded">Pericardites e Aortopatias</span>: pericardites por tuberculose ou radiação com restrição diastólica; aneurismas de aorta torácica ascendente &gt;5.5 cm ou descendente &gt;6 cm; dissecções agudas tipo A ou B (Stanford).</p>

        <p className="font-bold text-navy uppercase text-[11px] mt-6 border-t border-gray-150 pt-4">6. Normas de Procedimento</p>
        <p>6.1. Portadores de Graus III ou IV da NYHA, esgotados todos os recursos terapêuticos, serão considerados portadores de cardiopatia grave.</p>
        <p>6.2. Portadores de Graus I e II somente serão considerados graves quando, fazendo uso de terapêutica específica, apresentarem progressão comprovada da patologia.</p>
        <p>6.3. A idade, atividade profissional e incapacidade de reabilitação são parâmetros complementares a considerar.</p>
        <p>6.4. Portadores de HAS e/ou lesões passíveis de correção cirúrgica com risco-benefício favorável não serão inicialmente considerados portadores de Cardiopatia Grave.</p>
        <p>6.5. Os laudos deverão conter diagnósticos etiológicos e a afirmação ou negação de cardiopatia grave para o enquadramento legal.</p>
        <p>6.6. Considera-se portador de Cardiopatia Grave quando existir doença cardíaca que acarrete o total e definitivo impedimento das condições laborativas, esgotados todos os recursos terapêuticos.</p>
      </div>
    </section>
  );
};
