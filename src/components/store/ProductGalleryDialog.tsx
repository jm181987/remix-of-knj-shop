import { useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface ProductGalleryDialogProps {
  images: string[];
  productName: string;
  initialIndex?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProductGalleryDialog({
  images,
  productName,
  initialIndex = 0,
  open,
  onOpenChange,
}: ProductGalleryDialogProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") goToPrevious();
    if (e.key === "ArrowRight") goToNext();
  };

  if (images.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-[100vw] w-screen h-screen max-h-screen p-0 bg-background border-none rounded-none"
        onKeyDown={handleKeyDown}
      >
        <VisuallyHidden>
          <DialogTitle>{productName}</DialogTitle>
        </VisuallyHidden>
        
        {/* Close button */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 z-50 h-10 w-10 rounded-full bg-background/80 flex items-center justify-center hover:bg-background transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Main image container - uses flex to center image and leave space for thumbnails */}
        <div className="flex flex-col h-full w-full">
          <div className="flex-1 flex items-center justify-center p-4 pb-24 min-h-0">
            <img
              src={images[currentIndex]}
              alt={`${productName} - ${currentIndex + 1}`}
              className="h-full w-auto object-contain"
            />
          </div>

          {/* Navigation arrows */}
          {images.length > 1 && (
            <>
              <button
                onClick={goToPrevious}
                className="absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-background/80 flex items-center justify-center hover:bg-background transition-colors shadow-lg z-20"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                onClick={goToNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-background/80 flex items-center justify-center hover:bg-background transition-colors shadow-lg z-20"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          {/* Bottom bar with thumbnails and counter */}
          <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center gap-2 p-4 bg-gradient-to-t from-background via-background/80 to-transparent">
            {/* Thumbnail strip */}
            {images.length > 1 && (
              <div className="flex gap-2 p-2 bg-background/60 backdrop-blur-sm rounded-lg max-w-[90%] overflow-x-auto">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    className={`flex-shrink-0 h-14 w-14 rounded-md overflow-hidden transition-all ${
                      idx === currentIndex
                        ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                        : "opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={img}
                      alt={`Thumbnail ${idx + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Image counter */}
            <div className="bg-background/80 backdrop-blur-sm px-4 py-1.5 rounded-full text-sm font-medium">
              {currentIndex + 1} / {images.length}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
