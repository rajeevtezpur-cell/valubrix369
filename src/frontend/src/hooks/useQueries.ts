import { useQuery } from "@tanstack/react-query";
import { useActor } from "./useActor";

// Local listing shape matching mock/localStorage listings
export interface PropertyListing {
  id: string;
  title: string;
  city: string;
  locality: string;
  propertyType: string;
  priceInr: bigint;
  areaSqft: bigint;
  bedrooms: bigint;
  bathrooms: bigint;
  builderName: string;
  stage: string;
}

export function useRecentListings(limit = 6) {
  const { actor, isFetching } = useActor();
  return useQuery<PropertyListing[]>({
    queryKey: ["recentListings", limit],
    queryFn: async () => {
      if (!actor) return [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const actorAny = actor as any;
      if (typeof actorAny.getMyListings === "function") {
        const all = await actorAny.getMyListings();
        return (all as PropertyListing[]).slice(0, limit);
      }
      return [];
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAllListings() {
  const { actor, isFetching } = useActor();
  return useQuery<PropertyListing[]>({
    queryKey: ["allListings"],
    queryFn: async () => {
      if (!actor) return [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const actorAny = actor as any;
      if (typeof actorAny.getMyListings === "function") {
        return actorAny.getMyListings() as Promise<PropertyListing[]>;
      }
      return [];
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetMyListings() {
  const { actor, isFetching } = useActor();
  return useQuery<PropertyListing[]>({
    queryKey: ["myListings"],
    queryFn: async () => {
      if (!actor) return [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const actorAny = actor as any;
      if (typeof actorAny.getMyListings === "function") {
        return actorAny.getMyListings() as Promise<PropertyListing[]>;
      }
      return [];
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSearchProperties(_filter: Record<string, unknown> = {}) {
  const { actor, isFetching } = useActor();
  return useQuery<PropertyListing[]>({
    queryKey: ["searchProperties", _filter],
    queryFn: async () => {
      if (!actor) return [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const actorAny = actor as any;
      if (typeof actorAny.getMyListings === "function") {
        return actorAny.getMyListings() as Promise<PropertyListing[]>;
      }
      return [];
    },
    enabled: !!actor && !isFetching,
  });
}
