"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type ProfileFeedback = {
  favorites: string[];
  ratings: Record<string, number>;
  comments: Record<string, string>;
};

type MealFeedbackState = {
  profiles: Record<string, ProfileFeedback>;
  hydratedProfiles: Record<string, boolean>;
  toggleFavorite: (profileKey: string, itemId: string) => void;
  setRating: (profileKey: string, itemId: string, rating: number) => void;
  setComment: (profileKey: string, itemId: string, comment: string) => void;
  hydrateProfile: (profileKey: string, feedback: Partial<ProfileFeedback>) => void;
};

function getProfile(profiles: Record<string, ProfileFeedback>, profileKey: string): ProfileFeedback {
  return profiles[profileKey] ?? { favorites: [], ratings: {}, comments: {} };
}

export const useMealFeedback = create<MealFeedbackState>()(
  persist(
    (set) => ({
      profiles: {},
      hydratedProfiles: {},
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
      setComment: (profileKey, itemId, comment) =>
        set((state) => {
          const profile = getProfile(state.profiles, profileKey);
          const nextComments = { ...profile.comments };
          const trimmed = comment.trim();
          if (trimmed) {
            nextComments[itemId] = trimmed;
          } else {
            delete nextComments[itemId];
          }

          return {
            profiles: {
              ...state.profiles,
              [profileKey]: {
                ...profile,
                comments: nextComments,
              },
            },
          };
        }),
      hydrateProfile: (profileKey, feedback) =>
        set((state) => ({
          profiles: {
            ...state.profiles,
            [profileKey]: {
              favorites: feedback.favorites ?? state.profiles[profileKey]?.favorites ?? [],
              ratings: feedback.ratings ?? state.profiles[profileKey]?.ratings ?? {},
              comments: feedback.comments ?? state.profiles[profileKey]?.comments ?? {},
            },
          },
          hydratedProfiles: {
            ...state.hydratedProfiles,
            [profileKey]: true,
          },
        })),
    }),
    {
      name: "lethela_meal_feedback",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ profiles: state.profiles, hydratedProfiles: state.hydratedProfiles }),
    }
  )
);
