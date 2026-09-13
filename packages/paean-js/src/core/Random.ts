import { finite, integer } from './validate.js';

/** Serializable Mulberry32 PRNG. Repeatable gameplay, not cryptographic randomness. */
export class Random {
  private value: number;
  constructor(seed = 1) { this.value = integer(seed, 'seed') >>> 0; }
  get state(): number { return this.value; }
  set state(value: number) { this.value = integer(value, 'state') >>> 0; }

  next(): number {
    this.value = (this.value + 0x6D2B79F5) >>> 0;
    let t = Math.imul(this.value ^ this.value >>> 15, 1 | this.value);
    t ^= t + Math.imul(t ^ t >>> 7, 61 | t);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }

  range(min: number, max: number): number {
    finite(min, 'min'); finite(max, 'max');
    if (max < min || !Number.isFinite(max - min)) throw new RangeError('Invalid random range.');
    return min + this.next() * (max - min);
  }

  /** Uniform integer in the inclusive range [min, max], using rejection sampling. */
  int(min: number, max: number): number {
    if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max) || max < min || max - min >= 4294967296) {
      throw new RangeError('Integer range must contain 1 to 2^32 values.');
    }
    const span = max - min + 1;
    const limit = Math.floor(4294967296 / span) * span;
    let sample: number;
    do { sample = Math.floor(this.next() * 4294967296); } while (sample >= limit);
    return min + sample % span;
  }

  pick<T>(items: readonly T[]): T {
    if (!items.length) throw new RangeError('Cannot pick from an empty collection.');
    return items[this.int(0, items.length - 1)]!;
  }
}
