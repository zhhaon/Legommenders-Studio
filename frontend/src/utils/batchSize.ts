/** Translate effective batch size to the trainer's integer accumulation window. */
export function accumulationSteps(global: string, micro: string): number | null {
  if (!global.trim() || !micro.trim()) return null;
  const total = Number(global);
  const size = Number(micro);
  if (!Number.isSafeInteger(total) || !Number.isSafeInteger(size)
      || total < 1 || size < 1 || size > 4096 || total % size !== 0) return null;
  const steps = total / size;
  return steps >= 1 && steps <= 4096 ? steps : null;
}
