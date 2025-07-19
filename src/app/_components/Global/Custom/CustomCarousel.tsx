"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";
import CircularProgress from "./CircularProgress";

// --- Props e Estrutura de Dados para cada Slide ---
export interface SlideData {
  subtitle: string;
  progress: number;
  valueText: string;
  mainText: string;
  date: string;
}

interface CustomCarouselProps {
  title: string | string[];
  type?: "title-in" | "title-out";
  slides?: SlideData[]; // Prop agora é opcional
}

/**
 * Um componente de Carrossel dinâmico e reutilizável.
 */
const CustomCarousel = ({
  title,
  type = "title-out",
  slides = [],
}: CustomCarouselProps) => {
  // CORREÇÃO: Valor padrão adicionado
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    if (!api) {
      return;
    }

    const onSelect = () => {
      setCurrent(api.selectedScrollSnap());
    };

    api.on("select", onSelect);

    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  const scrollTo = useCallback(
    (index: number) => {
      api?.scrollTo(index);
    },
    [api]
  );

  // Se não houver slides, não renderiza nada para evitar erros
  if (slides.length === 0) {
    return null;
  }

  return (
    <div className="flex w-full flex-col justify-between rounded-2xl border-2 border-[#0126fb]/30 bg-[#010d26] p-6 text-white shadow-lg">
      {type === "title-out" && typeof title === "string" && (
        <h3 className="text-center text-2xl font-bold text-[#0126fb]">
          {title}
        </h3>
      )}

      <Carousel setApi={setApi} className="w-full flex-1">
        <CarouselContent className="h-full">
          {slides.map((slide, index) => (
            <CarouselItem
              key={index}
              className={cn(
                "flex flex-col justify-center",
                type === "title-in" && "items-center"
              )}
            >
              {typeof slide.progress === "number" && slide.valueText && (
                <div className="flex flex-1 mt-4 items-center justify-around gap-4 px-4">
                  <CircularProgress
                    progress={slide.progress}
                    valueText={slide.valueText}
                  />
                  {/* CORREÇÃO: Tamanho do texto aumentado para maior impacto */}
                  <p className="hidden md:block md:text-3xl text-5xl font-bold text-white text-center leading-tight">
                    {slide.mainText}
                  </p>
                </div>
              )}
              {type === "title-in" && Array.isArray(title) && (
                <h3 className="text-center block text-2xl font-bold text-[#0126fb]">
                  {title[index]}
                </h3>
              )}
              <div
                className={cn(
                  "flex mt-4 px-2",
                  slide.date
                    ? "items-end justify-between"
                    : "items-center justify-center",
                  type === "title-in" && "text-center flex-1 w-full"
                )}
              >
                <p
                  className={cn("text-sm sm:text-lg font-semibold text-center")}
                >
                  {slide.subtitle}
                </p>
                {slide.date && (
                  <p className="hidden sm:block text-sm text-gray-400">
                    {slide.date}
                  </p>
                )}
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      <div className="flex justify-center space-x-2 pt-2 mt-4">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => scrollTo(index)}
            className={cn(
              "h-2 w-2 rounded-full transition-colors",
              current === index
                ? "bg-[#0126fb]"
                : "bg-gray-600 hover:bg-gray-400"
            )}
            aria-label={`Ir para o slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default CustomCarousel;
