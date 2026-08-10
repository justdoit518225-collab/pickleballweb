/** Format USD list price for display, e.g. US$109 or US$299.95 */
export function formatUsdListPrice(amount: number): string {
  const rounded = Math.round(amount * 100) / 100;
  const nice = Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toFixed(2);
  return `US$${nice}`;
}
