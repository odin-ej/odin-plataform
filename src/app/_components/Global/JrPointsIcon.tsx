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
        "h-auto w-auto max-w-[60px] max-h-[60px] sm:max-w-[100px] sm:max-h-[100px] md:max-w-[150px] md:max-h-[150px] sm:aspect-[1/1] object-contain"
      )}
    />
  );
};
