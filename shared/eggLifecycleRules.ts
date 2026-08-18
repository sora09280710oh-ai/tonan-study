export type EggCandidate = {
  id: number;
  hatchedAt: Date | string | null;
  hatchedCreatureId: number | null;
};

export function unhatchedEggs<T extends EggCandidate>(eggs: T[]) {
  return eggs.filter(egg => !egg.hatchedAt && !egg.hatchedCreatureId);
}

export function selectedEggIdForHatch(egg: EggCandidate | null) {
  return egg?.id ?? null;
}
