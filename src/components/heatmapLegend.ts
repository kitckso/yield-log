import { formatBandMoney } from "../lib/money";
import type { BandBounds } from "../lib/maturityCalendar";

const NICE_STEPS = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 7, 8, 9, 10];

/** Snaps a cut-point to a figure a person would round to by hand, e.g. 66800 -> 70000. */
export function niceBoundary(value: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(value));
  let best = magnitude;
  for (const step of NICE_STEPS) {
    const candidate = step * magnitude;
    if (Math.abs(candidate - value) < Math.abs(best - value)) best = candidate;
  }
  return best;
}

/**
 * One label per band, upper-bound first, with the open-ended top band last:
 * ["≤$7萬", "≤$15萬", ">$15萬"].
 */
export function formatBands(bounds: BandBounds): string[] {
  let previous = 0;
  const labels = [bounds.q1, bounds.q2].map((value) => {
    const nice = niceBoundary(value);
    const bound = nice > previous ? nice : value;
    previous = bound;
    return `≤${formatBandMoney(bound)}`;
  });
  labels.push(`>${formatBandMoney(previous)}`);
  return labels;
}
