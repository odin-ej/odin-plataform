"use client";
import React, { useState, useEffect } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";
import { LinkPoster } from "@prisma/client";
import LinkPosterCard from "./LinkPosterCard";

interface LinkPosterCarouselProps {
  slides: LinkPoster[];
}

const LinkPosterCarousel = ({ slides }: LinkPosterCarouselProps) => {
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
    <div className="w-full">
      <Carousel setApi={setApi} className="w-full">
        <CarouselContent
          className={cn("px-2", slides.length < 4 && "justify-center")}
        >
          {slides.map((slide, index) => (
            <CarouselItem
              key={index}
              className="basis-full sm:basis-1/2 lg:basis-1/3 xl:basis-1/4 flex justify-center"
            >
              <LinkPosterCard linkPoster={slide} />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </div>
  );
};

export default LinkPosterCarousel;
