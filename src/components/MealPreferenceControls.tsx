"use client";

import { Heart, Star } from "lucide-react";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { useMealFeedback } from "@/store/meal-feedback";

function getProfileKey(userId: string | undefined) {
  return userId ? `user:${userId}` : "guest";
}

export default function MealPreferenceControls({
  itemId,
  className,
  compact = false,
}: {
  itemId: string;
  className?: string;
  compact?: boolean;
}) {
  const sessionState = useSession();
  const session = sessionState?.data;
  const profileKey = getProfileKey(session?.user?.id);
  const isFavorite = useMealFeedback((state) => state.profiles[profileKey]?.favorites.includes(itemId) ?? false);
  const rating = useMealFeedback((state) => state.profiles[profileKey]?.ratings[itemId] ?? 0);
  const toggleFavorite = useMealFeedback((state) => state.toggleFavorite);
  const setRating = useMealFeedback((state) => state.setRating);

  return (
    <div className={cn("flex items-center gap-3 text-white/80", className)}>
      <button
        type="button"
        aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
        aria-pressed={isFavorite}
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 transition hover:border-white/30 hover:text-white",
          isFavorite && "border-lethela-primary bg-lethela-primary/10 text-lethela-primary",
          compact && "h-8 w-8"
        )}
        onClick={() => toggleFavorite(profileKey, itemId)}
      >
        <Heart className={cn("h-4 w-4", isFavorite && "fill-current")} />
      </button>

      <div className="flex items-center gap-1" role="group" aria-label="Rate this meal">
        {[1, 2, 3, 4, 5].map((starValue) => {
          const active = starValue <= rating;
          return (
            <button
              key={starValue}
              type="button"
              aria-label={`Rate ${starValue} star${starValue === 1 ? "" : "s"}`}
              className={cn(
                "inline-flex h-8 w-8 items-center justify-center rounded-full transition hover:text-[#f8d16a]",
                active ? "text-[#f8d16a]" : "text-white/40",
                compact && "h-7 w-7"
              )}
              onClick={() => setRating(profileKey, itemId, starValue)}
            >
              <Star className={cn("h-4 w-4", active && "fill-current")} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
