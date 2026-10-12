/**
 * How the app says money. Every HKD figure on screen goes through here, so the
 * symbol, the thousands separator and the compact magnitudes are decided once
 * rather than per card.
 *
 * Compact figures use 萬 and 億, matching the Traditional Chinese interface.
 */

const LOCALE = "en-HK";

/** Full figure with cents, e.g. 1234567.5 -> "$1,234,567.50". */
export function formatMoney(amount: number): string {
  return `$${amount.toLocaleString(LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Compact figure for a chart axis. Always one decimal so neighbouring ticks
 * line up in width, e.g. 120000 -> "$12.0萬".
 */
export function formatAxisMoney(amount: number): string {
  if (amount >= 100_000_000) return `$${(amount / 100_000_000).toFixed(1)}億`;
  if (amount >= 10_000) return `$${(amount / 10_000).toFixed(1)}萬`;
  return `$${amount}`;
}

/**
 * Compact figure for a colour-band cut-point, where a spare decimal only adds
 * noise: 120000 -> "$12萬". Below 萬 it stays a plain grouped figure.
 */
export function formatBandMoney(amount: number): string {
  if (amount >= 100_000_000) return `$${oneDecimal(amount / 100_000_000)}億`;
  if (amount >= 10_000) return `$${oneDecimal(amount / 10_000)}萬`;
  return `$${Math.round(amount).toLocaleString(LOCALE)}`;
}

/** 12 -> "12", 12.5 -> "12.5". */
function oneDecimal(value: number): string {
  return String(Math.round(value * 10) / 10);
}
