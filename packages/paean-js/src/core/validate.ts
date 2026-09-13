/** Reject invalid configuration at the boundary instead of corrupting simulation state. */
export function positive(value: number, name: string): number {
  if (!Number.isFinite(value) || value <= 0) throw new RangeError(`${name} must be finite and positive.`);
  return value;
}

export function integer(value: number, name: string, minimum = 0): number {
  if (!Number.isSafeInteger(value) || value < minimum) throw new RangeError(`${name} must be an integer >= ${minimum}.`);
  return value;
}

export function finite(value: number, name: string): number {
  if (!Number.isFinite(value)) throw new RangeError(`${name} must be finite.`);
  return value;
}

export function delta(value: number): number {
  if (!Number.isFinite(value) || value < 0) throw new RangeError('Delta time must be finite and nonnegative.');
  return value;
}
