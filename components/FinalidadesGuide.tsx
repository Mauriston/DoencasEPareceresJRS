import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Header } from './Header';

const FINALIDADES: Record<string, string> = {
  "Auxílio invalidez de militar inativo": "Verifica se o militar considerado inválido necessita de internação permanente em instituição apropriada e/ou de assistência ou cuidados permanentes de enfermagem, conforme a MP nº 2.215-10/2001 e Lei nº 11.421/2006.",
  "Isenção de pagamento de imposto de renda": "Verifica se o militar inativo ou pensionista é portador de doenças especificadas em lei ou se a reforma foi motivada por acidente em serviço ou doença profissional, conforme Lei nº 7.713/1988.",
  "Pensão militar para beneficiário inválido": "Verifica se o periciado encontra-se inválido para o trabalho, de acordo com as Leis nº 3.765/1960, 6.880/1980 e alterações subsequentes.",
  "Pensão de ex-combatente para beneficiário inválido": "Verifica se o periciado encontra-se inválido, ou seja, incapaz total e permanentemente para o trabalho, conforme a Lei nº 8.059/1990.",
  "Pensão especial à viúva de militar": "Verifica se a viúva é inválida por ser portadora de doenças específicas como Tuberculose Ativa, Alienação Mental, Neoplasia Maligna, entre outras listadas na Lei nº 3.738/1960.",
  "Revisão de reforma relacionada ao serviço": "Verifica se o militar reformado por acidente ou moléstia decorrente de atividade militar teve agravamento clínico gerando invalidez total, com nexo de causalidade.",
  "Revisão de reforma para portadores de SIDA/AIDS": "Verifica se o militar reformado por infecção pelo HIV sofreu agravamento posterior evoluindo para invalidez total e permanente.",
  "Revisão de reforma por idade-limite": "Verifica se o militar já reformado por idade apresenta-se inválido em decorrência de doenças do inciso V do art. 108 da Lei nº 6.880/1980, conforme Parecer 07/2006.",
  "Reforma de militar RM1": "Verifica se o militar da Reserva Remunerada encontra-se incapaz definitivamente para o Serviço Ativo da Marinha (SAM), estando ou não inválido, conforme a Lei nº 6.880/1980.",
  "Dependência de familiar de militar": "Verifica se o periciado está inválido (incapaz total e permanentemente para o trabalho) conforme o art. 50 da Lei nº 6.880/1980 e Lei nº 13.954/2019.",
  "Verificação Post-mortem de ex-militar": "Inspeção documental para verificar se o militar falecido na ativa era portador, naquela data, de doença que resultaria na sua incapacidade definitiva para o SAM, com total e permanente impossibilidade para todo e qualquer trabalho (invalidez).",
  "IS para verificação de preexistência de invalidez": "Estabelece a partir de que data o periciado preencheu critérios para invalidez definitiva em relação a um evento ou ato administrativo.",
  "IS para verificação de preexistência de doença especificada em Lei": "Visa estabelecer a data em que o inspecionado preencheu os critérios para enquadramento em condição prevista em Lei conforme a Portaria Normativa nº 3.551/2021.",
  "IS para verificação de preexistência de incapacidade definitiva para o SAM": "Estabelece a partir de que data o periciado preencheu os critérios para incapacidade definitiva para o Serviço Ativo da Marinha (SAM), por doença grave prevista em Lei ou não."
};

export const FinalidadesGuide: React.FC = () => {
  const finalidadesKeys = Object.keys(FINALIDADES);
  const [selectedKey, setSelectedKey] = useState<string>(finalidadesKeys[0]);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <Header title="Finalidades" />
      
      <div className="p-4 space-y-4 animate-fade-in overflow-auto pb-24 h-full">
        {/* Card Branco Principal - Igual ao início de Portaria */}
        <div id="finalidades-card" className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col space-y-5">
          <div className="text-center pb-2 border-b border-gray-100">
            <h2 className="text-lg font-bold text-navy font-heading leading-tight uppercase">FINALIDADES DA INSPEÇÃO DE SAÚDE (IS)</h2>
            <p className="text-[11px] text-gray-500 font-body mt-1 uppercase tracking-wider font-bold">
              Consulte os objetivos e fundamentações das Avaliações Médico-Periciais
            </p>
          </div>

          {/* Seletor Dropdown Especial estilo Premium */}
          <div className="flex flex-col space-y-2">
            <label htmlFor="finalidade-select" className="text-xs font-bold text-navy uppercase tracking-wider">
              Selecione a Finalidade do Benefício:
            </label>
            <div className="relative">
              <select
                id="finalidade-select"
                value={selectedKey}
                onChange={(e) => setSelectedKey(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm font-semibold rounded-lg p-3 pr-10 focus:outline-none focus:ring-1 focus:ring-navy focus:border-navy appearance-none cursor-pointer transition-all font-body shadow-inner"
              >
                {finalidadesKeys.map((key) => (
                  <option key={key} value={key} className="text-gray-800 font-medium font-body bg-white py-1">
                    {key}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-navy">
                <ChevronDown size={18} />
              </div>
            </div>
          </div>

          {/* Box de Definição estilizada */}
          <div id="definition-box" className="p-4 bg-gray-50 rounded-lg border border-gray-100 shadow-sm flex flex-col space-y-3">
            <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
              <span className="material-symbols-outlined text-gold" style={{ fontSize: '20px' }}>
                info
              </span>
              <h3 className="font-heading font-bold text-navy text-[13px] uppercase tracking-wider">
                Definição e Critérios
              </h3>
            </div>
            
            <p className="text-gray-800 font-body text-sm leading-relaxed text-justify mt-2 font-medium">
              {FINALIDADES[selectedKey]}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
