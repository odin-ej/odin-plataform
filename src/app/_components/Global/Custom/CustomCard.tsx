"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

// --- Props do Componente CustomCard ---
interface CustomCardProps {
  icon: React.ElementType;
  title: string;
  value: number | string;
  type: string;
  href?: string;
  className?: string;
  description?:string
}

/**
 * Um componente de card dinâmico e reutilizável com um design específico.
 */
const CustomCard = ({
  icon: Icon,
  title,
  value,
  description,
  href,
  className,
  type,
}: CustomCardProps) => {
  return (
    <Card
      className={cn(
        "flex flex-col justify-between rounded-2xl border-2 border-[#0126fb]/30 bg-[#010d26] p-4 text-white shadow-lg pt-6", 
        className
      )}
    >
      <CardTitle className='sr-only'></CardTitle>
      <CardContent className="p-2 flex items-center justify-center space-x-4">
        <div className='w-[30%] flex justify-center items-center'><Icon className="text-[#0126fb] w-32 h-32" /></div>
        <div className={cn("w-[70%]", type === "introduction" && "w-[100%]")}>
          {type === "link" ? (
            <>
            <h4 className="text-[#0126fb] mb-1 text-lg sm:text-xl">{title}</h4>
            <h2
            className={cn(
              "text-7xl font-semibold"
            )}
          >
            {value}
          </h2>
            </>
          ) : (
           <>
            <h2
            className={cn(
              "text-2xl sm:text-5xl font-semibold"
            )}
          >
            {title}
          </h2>
          <h4 className="text-[#f5b719] text-[8px] sm:text-xs sm:block hidden font-semibold ">{description}</h4>
           </>
          )}
         
        </div>
      </CardContent>
      {type === "link" && href && (
        <CardFooter className="p-2">
          <Link
            href={href as string}
            className="group flex w-full items-center justify-end text-xs font-semibold text-[#0126fb] transition-colors hover:text-[#f5b719]"
          >
            Ver tudo
            <ArrowRight className="ml-1 h-3 w-3 transition-transform group-hover:translate-x-1" />
          </Link>
        </CardFooter>
      )}
    </Card>
  );
};

export default CustomCard;
