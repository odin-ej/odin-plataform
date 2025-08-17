"use client";
import React, { useState, useEffect } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";
// import { cn } from "@/lib/utils";

export interface ValueSlide {
  title: string;
  description: string;
}

interface ValueCarouselProps {
  slides: ValueSlide[];
}

const ValueCarousel = ({ slides }: ValueCarouselProps) => {
  const [api, setApi] = useState<CarouselApi | undefined>();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;

    const onSelect = () => setCurrent(api.selectedScrollSnap());
    api.on("select", onSelect);

    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  return (
    <div className="w-full py-6 text-white">
      <Carousel setApi={setApi} className="w-full">
        <CarouselContent className={cn("px-2", slides.length < 3 && "justify-center")}>
          {slides.map((slide, index) => (
            <CarouselItem
              key={index}
              className="basis-full sm:basis-1/2 lg:basis-1/3 flex justify-center"
            >
              <div className="w-full lg:max-w-none rounded-xl border-2 border-[#0126fb]/30 bg-[#010d26] h-full px-6 py-6 text-center shadow-md flex flex-col justify-center">
                <h3 className="text-xl font-bold text-yellow-400 mb-2">
                  {slide.title}
                </h3>
                <p className="text-sm text-white">{slide.description}</p>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {/* Indicadores (opcional) */}
      {/* <div className="flex justify-center mt-4 space-x-2">
        {Array.from({
          length: Math.ceil(slides.length / 3),
        }).map((_, index) => (
          <button
            key={index}
            onClick={() => api?.scrollTo(index)}
            className={cn(
              "h-2 w-2 rounded-full transition-colors",
              current === index
                ? "bg-yellow-400"
                : "bg-gray-600 hover:bg-gray-400"
            )}
          />
        ))}
      </div> */}
    </div>
  );
};

export default ValueCarousel;
