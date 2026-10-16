// Ficheiro: components/ui/icons.tsx
// Uma só biblioteca de ícones no app: Material Symbols (já usada na navegação
// e nos botões). Este módulo expõe os nomes que antes vinham do lucide-react
// com a mesma assinatura (`size`, `className`), de modo que as telas trocam só
// o import — e o app deixa de carregar duas famílias de ícones com traços e
// tamanhos diferentes. Tamanhos do DS: 20 em botão, 24 em navegação.
import React from 'react';

export interface IconProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Tamanho em px (padrão 24, como o lucide). */
  size?: number;
  // Props herdadas do lucide, aceitas e ignoradas:
  strokeWidth?: number;
  fill?: string;
}

export const Icon: React.FC<IconProps & { name: string }> = ({ name, size = 24, className = '', style, strokeWidth: _s, fill: _f, ...rest }) => (
  <span
    aria-hidden="true"
    className={`material-symbols-outlined leading-none select-none ${className}`}
    style={{ fontSize: size, width: size, height: size, ...style }}
    {...rest}
  >
    {name}
  </span>
);

const make = (name: string): React.FC<IconProps> => {
  const Comp: React.FC<IconProps> = props => <Icon name={name} {...props} />;
  Comp.displayName = `Icon(${name})`;
  return Comp;
};

export const Accessibility = make('accessibility_new');
export const AlertCircle = make('error');
export const ArrowLeft = make('arrow_back');
export const ArrowUp = make('arrow_upward');
export const Book = make('book');
export const BookOpen = make('menu_book');
export const Brain = make('psychology');
export const Calendar = make('calendar_today');
export const Camera = make('photo_camera');
export const CheckCircle = make('check_circle');
export const CheckCircle2 = make('check_circle');
export const ChevronDown = make('expand_more');
export const ChevronRight = make('chevron_right');
export const Crop = make('crop');
export const Download = make('download');
export const Ear = make('hearing');
export const Eye = make('visibility');
export const EyeOff = make('visibility_off');
export const FileText = make('description');
export const Gavel = make('gavel');
export const GraduationCap = make('school');
export const Heart = make('favorite');
export const HeartPulse = make('cardiology');
export const Image = make('image');
export const Info = make('info');
export const Loader2 = make('progress_activity');
export const MonitorPlay = make('slideshow');
export const MoreVertical = make('more_vert');
export const Paperclip = make('attach_file');
export const Play = make('play_arrow');
export const PlayCircle = make('play_circle');
export const Radiation = make('radiology');
export const RefreshCw = make('refresh');
export const Ribbon = make('immunology');
export const RotateCcw = make('restart_alt');
export const Ruler = make('straighten');
export const Scale = make('balance');
export const Search = make('search');
export const Share2 = make('share');
export const Smartphone = make('smartphone');
export const Sparkles = make('auto_awesome');
export const Stethoscope = make('stethoscope');
export const User = make('person');
export const X = make('close');
export const XCircle = make('cancel');
