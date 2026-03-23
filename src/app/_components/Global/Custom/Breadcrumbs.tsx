'use client';

import React, { Fragment } from 'react';
// import Link from 'next/link'; // Removido para compatibilidade
import { ChevronRight } from 'lucide-react';

// Define a estrutura de cada item do breadcrumb
interface BreadcrumbItem {
  label: string;
  href?: string; // O link é opcional, o último item não terá um
}

// Define as props que o componente Breadcrumbs aceita
interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

/**
 * Um componente de Breadcrumbs reutilizável que gera uma trilha de navegação.
 * @param {BreadcrumbItem[]} items - Um array de objetos que representam cada passo no caminho.
 */
const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items }) => {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-gray-500">
      <ol className="flex items-center space-x-2">
        {items.map((item, index) => {
          const isLastItem = index === items.length - 1;

          return (
            <Fragment key={item.label}>
              <li>
                {item.href && !isLastItem ? (
                  // CORREÇÃO: Substituído o Link do Next.js por uma tag <a> padrão.
                  <a
                    href={item.href}
                    className="transition-colors hover:text-gray-900 dark:hover:text-gray-100"
                  >
                    {item.label}
                  </a>
                ) : (
                  // Último item, não clicável e com cor de destaque
                  <span
                    className={isLastItem ? 'font-medium text-gray-900 dark:text-gray-100' : ''}
                    aria-current={isLastItem ? 'page' : undefined}
                  >
                    {item.label}
                  </span>
                )}
              </li>
              {!isLastItem && (
                // Separador entre os itens
                <li aria-hidden="true">
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </li>
              )}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;