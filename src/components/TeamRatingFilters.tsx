import type { AverageRatingFilter, MyRatingFilter, TeamRatingSort } from "../utils/teamRatingFilters";

const selectClassName =
  "rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none ring-slate-950 focus:ring-2 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:ring-white";

interface SummaryRatingFiltersProps {
  averageFilter: AverageRatingFilter;
  onAverageFilterChange: (value: AverageRatingFilter) => void;
  onSortChange: (value: TeamRatingSort) => void;
  sort: TeamRatingSort;
}

export function SummaryRatingFilters({
  averageFilter,
  onAverageFilterChange,
  sort,
  onSortChange,
}: SummaryRatingFiltersProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
        <span className="sr-only">Average rating filter</span>
        <select
          className={selectClassName}
          onChange={(event) => onAverageFilterChange(event.target.value as AverageRatingFilter)}
          value={averageFilter}
        >
          <option value="all">All averages</option>
          <option value="unrated">Unrated teams</option>
          <option value="rated">Rated teams</option>
          <option value="min-3">Avg ≥ 3</option>
          <option value="min-4">Avg ≥ 4</option>
          <option value="min-5">Avg = 5</option>
        </select>
      </label>
      <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
        <span className="sr-only">Sort teams</span>
        <select
          className={selectClassName}
          onChange={(event) => onSortChange(event.target.value as TeamRatingSort)}
          value={sort}
        >
          <option value="name">Sort: team name</option>
          <option value="avg-desc">Sort: avg rating (high → low)</option>
          <option value="avg-asc">Sort: avg rating (low → high)</option>
        </select>
      </label>
    </div>
  );
}

interface TeamsTabRatingFiltersProps {
  averageFilter: AverageRatingFilter;
  myRatingFilter: MyRatingFilter;
  onAverageFilterChange: (value: AverageRatingFilter) => void;
  onMyRatingFilterChange: (value: MyRatingFilter) => void;
  onSortChange: (value: TeamRatingSort) => void;
  sort: TeamRatingSort;
}

export function TeamsTabRatingFilters({
  averageFilter,
  myRatingFilter,
  onAverageFilterChange,
  onMyRatingFilterChange,
  sort,
  onSortChange,
}: TeamsTabRatingFiltersProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
        <span className="sr-only">My rating filter</span>
        <select
          className={selectClassName}
          onChange={(event) => onMyRatingFilterChange(event.target.value as MyRatingFilter)}
          value={myRatingFilter}
        >
          <option value="all">My rating: all</option>
          <option value="unrated">My rating: not rated</option>
          <option value="rated">My rating: rated</option>
          <option value="1">My rating: 1★</option>
          <option value="2">My rating: 2★</option>
          <option value="3">My rating: 3★</option>
          <option value="4">My rating: 4★</option>
          <option value="5">My rating: 5★</option>
        </select>
      </label>
      <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
        <span className="sr-only">Average rating filter</span>
        <select
          className={selectClassName}
          onChange={(event) => onAverageFilterChange(event.target.value as AverageRatingFilter)}
          value={averageFilter}
        >
          <option value="all">Avg rating: all</option>
          <option value="unrated">Avg rating: unrated</option>
          <option value="rated">Avg rating: rated</option>
          <option value="min-3">Avg rating: ≥ 3</option>
          <option value="min-4">Avg rating: ≥ 4</option>
          <option value="min-5">Avg rating: 5</option>
        </select>
      </label>
      <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
        <span className="sr-only">Sort teams</span>
        <select
          className={selectClassName}
          onChange={(event) => onSortChange(event.target.value as TeamRatingSort)}
          value={sort}
        >
          <option value="name">Sort: team name</option>
          <option value="my-desc">Sort: my rating (high → low)</option>
          <option value="my-asc">Sort: my rating (low → high)</option>
          <option value="avg-desc">Sort: avg rating (high → low)</option>
          <option value="avg-asc">Sort: avg rating (low → high)</option>
        </select>
      </label>
    </div>
  );
}
