import { Star } from "lucide-react";
import { cn } from "../utils/cn";

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  readOnly?: boolean;
  size?: "sm" | "md";
}

export function StarRating({ value, onChange, readOnly = false, size = "md" }: StarRatingProps) {
  const iconSize = size === "sm" ? 14 : 20;

  return (
    <div className="inline-flex items-center gap-0.5" role={readOnly ? "img" : "group"} aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= value;
        const button = (
          <Star
            className={cn(
              filled ? "fill-amber-400 text-amber-400" : "text-slate-300 dark:text-slate-600",
              !readOnly && onChange && "hover:scale-110",
            )}
            size={iconSize}
          />
        );

        if (readOnly || !onChange) {
          return (
            <span key={star} aria-hidden="true">
              {button}
            </span>
          );
        }

        return (
          <button
            aria-label={`Rate ${star} star${star === 1 ? "" : "s"}`}
            className="rounded p-0.5 transition hover:bg-amber-50 dark:hover:bg-amber-950/30"
            key={star}
            onClick={() => onChange(star)}
            type="button"
          >
            {button}
          </button>
        );
      })}
    </div>
  );
}

export function formatStarLabel(rating: number): string {
  const full = Math.max(0, Math.min(5, Math.round(rating)));
  return "★".repeat(full) + "☆".repeat(5 - full);
}
