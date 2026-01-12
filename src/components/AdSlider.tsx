import { FC, useEffect, useState, useCallback } from 'react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";

interface Ad {
  id: string;
  title: string;
  media_url: string;
  media_type: string;
  link?: string | null;
  link_url?: string | null;
}

interface AdSliderProps {
  ads: Ad[];
  autoPlay?: boolean;
  autoPlayInterval?: number;
}

const AdSlider: FC<AdSliderProps> = ({ 
  ads, 
  autoPlay = true, 
  autoPlayInterval = 4000 
}) => {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!api) return;

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap());

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  useEffect(() => {
    if (!api || !autoPlay) return;

    const intervalId = setInterval(() => {
      api.scrollNext();
    }, autoPlayInterval);

    return () => clearInterval(intervalId);
  }, [api, autoPlay, autoPlayInterval]);

  const scrollTo = useCallback((index: number) => {
    api?.scrollTo(index);
  }, [api]);

  if (ads.length === 0) return null;

  const handleAdClick = (ad: Ad) => {
    const linkUrl = ad.link_url || ad.link;
    if (linkUrl) {
      window.open(linkUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const getAdLink = (ad: Ad) => ad.link_url || ad.link;

  return (
    <div className="w-full py-4">
      <div className="relative">
        <Carousel
          setApi={setApi}
          opts={{
            align: "start",
            loop: true,
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-2 md:-ml-4">
            {ads.map((ad) => (
              <CarouselItem key={ad.id} className="pl-2 md:pl-4 basis-full sm:basis-1/2 lg:basis-1/3">
                <div
                  onClick={() => handleAdClick(ad)}
                  className={`relative rounded-xl overflow-hidden aspect-video group ${getAdLink(ad) ? 'cursor-pointer' : ''}`}
                >
                  {ad.media_type === 'video' ? (
                    <video
                      src={ad.media_url}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      autoPlay
                      loop
                      muted
                      playsInline
                    />
                  ) : (
                    <img
                      src={ad.media_url}
                      alt={ad.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-foreground/90 font-light tracking-wide text-[10px] md:text-xs truncate font-display">
                      {ad.title}
                    </p>
                  </div>
                  {getAdLink(ad) && (
                    <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <span className="text-foreground font-semibold text-sm bg-primary/80 px-4 py-2 rounded-full">
                        Kunjungi
                      </span>
                    </div>
                  )}
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
        
        {/* Navigation arrows outside carousel */}
        {count > 1 && (
          <div className="flex justify-center gap-4 mt-3">
            <button
              onClick={() => api?.scrollPrev()}
              className="p-2 rounded-full bg-card/80 border border-border hover:bg-card hover:border-primary/50 transition-all duration-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-foreground">
                <path d="m15 18-6-6 6-6"/>
              </svg>
            </button>
            <button
              onClick={() => api?.scrollNext()}
              className="p-2 rounded-full bg-card/80 border border-border hover:bg-card hover:border-primary/50 transition-all duration-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-foreground">
                <path d="m9 18 6-6-6-6"/>
              </svg>
            </button>
          </div>
        )}
      </div>
      
      {/* Dots Indicator */}
      {count > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {Array.from({ length: count }).map((_, index) => (
            <button
              key={index}
              onClick={() => scrollTo(index)}
              className={`relative h-2 rounded-full transition-all duration-300 ${
                current === index 
                  ? 'w-8 bg-primary' 
                  : 'w-2 bg-primary/30 hover:bg-primary/50'
              }`}
            >
              {current === index && (
                <span className="absolute inset-0 rounded-full bg-primary animate-pulse" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdSlider;
