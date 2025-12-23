import * as React from "react";
import { X, GripHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface MobileBottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** Height as percentage of viewport (default: 80) */
  height?: number;
}

export function MobileBottomSheet({
  open,
  onClose,
  title,
  children,
  height = 80,
}: MobileBottomSheetProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragOffset, setDragOffset] = React.useState(0);
  const sheetRef = React.useRef<HTMLDivElement>(null);
  const startY = React.useRef(0);

  // Handle touch start
  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    setIsDragging(true);
  };

  // Handle touch move
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;
    if (diff > 0) {
      setDragOffset(diff);
    }
  };

  // Handle touch end
  const handleTouchEnd = () => {
    setIsDragging(false);
    // If dragged more than 100px down, close the sheet
    if (dragOffset > 100) {
      onClose();
    }
    setDragOffset(0);
  };

  // Close on escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  // Prevent body scroll when open
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/50 transition-opacity md:hidden",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-2xl shadow-lg transition-transform duration-300 ease-out md:hidden",
          open ? "translate-y-0" : "translate-y-full"
        )}
        style={{
          height: `${height}vh`,
          transform: open ? `translateY(${dragOffset}px)` : "translateY(100%)",
        }}
      >
        {/* Drag handle */}
        <div
          className="flex items-center justify-center py-3 cursor-grab active:cursor-grabbing"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <GripHorizontal className="h-5 w-8 text-muted-foreground/50" />
        </div>

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-4 pb-3 border-b border-border">
            <h2 className="font-serif text-lg font-semibold text-foreground">
              {title}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4" style={{ maxHeight: `calc(${height}vh - 80px)` }}>
          {children}
        </div>

        {/* Safe area for devices with home indicator */}
        <div className="h-safe-area-inset-bottom bg-background" />
      </div>
    </>
  );
}

export default MobileBottomSheet;
