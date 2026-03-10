"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type ProfileFeedback = {
  favorites: string[];
  ratings: Record<string, number>;
};

type MealFeedbackState = {
  profiles: Record<string, ProfileFeedback>;
  toggleFavorite: (profileKey: string, itemId: string) => void;
  setRating: (profileKey: string, itemId: string, rating: number) => void;
};

function getProfile(profiles: Record<string, ProfileFeedback>, profileKey: string): ProfileFeedback {
  return profiles[profileKey] ?? { favorites: [], ratings: {} };
}

export const useMealFeedback = create<MealFeedbackState>()(
  persist(
    (set) => ({
      profiles: {},
      toggleFavorite: (profileKey, itemId) =>
        set((state) => {
          const profile = getProfile(state.profiles, profileKey);
          const favorites = profile.favorites.includes(itemId)
            ? profile.favorites.filter((favoriteId) => favoriteId !== itemId)
            : [...profile.favorites, itemId];

          return {
            profiles: {
              ...state.profiles,
              [profileKey]: {
                ...profile,
                favorites,
              },
            },
          };
        }),
      setRating: (profileKey, itemId, rating) =>
        set((state) => {
          const profile = getProfile(state.profiles, profileKey);
          return {
            profiles: {
              ...state.profiles,
              [profileKey]: {
                ...profile,
                ratings: {
                  ...profile.ratings,
                  [itemId]: Math.max(1, Math.min(5, rating)),
                },
              },
            },
          };
        }),
    }),
    {
      name: "lethela_meal_feedback",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ profiles: state.profiles }),
    }
  )
);
