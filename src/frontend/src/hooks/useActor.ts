import { useActor as useCoreActor } from "@caffeineai/core-infrastructure";
import { type Backend, createActor } from "../backend";

export function useActor(): { actor: Backend | null; isFetching: boolean } {
  return useCoreActor<Backend>(createActor);
}
