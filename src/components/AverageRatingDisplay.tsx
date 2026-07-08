import { StarRating } from "./StarRating";
import { formatAverageRating } from "../utils/teamRatingFilters";

interface AverageRatingDisplayProps {
  averageRating: number | null;
}

export function AverageRatingDisplay({ averageRating }: AverageRatingDisplayProps) {
  if (averageRating === null) {
    return <span className="text-slate-400">—</span>;
  }

  const roundedStars = Math.round(averageRating);

  return (
    <div className="flex flex-col gap-0.5">
      <StarRating readOnly size="sm" value={roundedStars} />
      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
        {formatAverageRating(averageRating)} avg
      </span>
    </div>
  );
}
