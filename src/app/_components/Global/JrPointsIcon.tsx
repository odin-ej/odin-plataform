/* eslint-disable @next/next/no-img-element */
import React from 'react';
import { cn } from '@/lib/utils'; // Supondo que você tem esta função utilitária
// Define as props para o componente SVG, permitindo que ele aceite classes, etc.
type JrPointIconProps = React.SVGProps<SVGSVGElement>

/**
 * Um componente SVG que representa o logótipo da plataforma,
 * utilizando uma máscara para criar o efeito de recorte de forma precisa.
 */
export const JrPointIconWhite = ({
  className,
}: JrPointIconProps) => {
  return (
    <img src={'/jrpointsiconwhite.png'} alt='Jr Points' className={cn(className, 'object-cover')}  />
  );
};


export const JrPointIconBlue = ({ className }: JrPointIconProps) => {
  return (
    <img
      src="/jrpointsiconblue.png"
      alt="JR Points"
      className={cn(
        className,
        "h-auto w-auto max-w-[64px] max-h-[64px] sm:max-w-[96px] sm:max-h-[96px] md:max-w-[128px] md:max-h-[128px] sm:aspect-[1/1] object-contain"
      )}
    />
  );
};
