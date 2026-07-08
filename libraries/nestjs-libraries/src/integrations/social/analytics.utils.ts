/**
 * Real period-over-period change for an analytics time series: the summed
 * second half of the window vs the first half. Rounded to one decimal.
 * Returns 0 when there is no meaningful baseline (fewer than 2 points, or an
 * all-zero first half with no activity) — the UI hides the trend badge at 0
 * instead of showing a made-up number.
 */
export function percentageChangeFromSeries(
  series: { total: number }[] | undefined
): number {
  if (!series || series.length < 2) {
    return 0;
  }
  // Equal-size halves (odd lengths drop the middle point) so the comparison
  // isn't biased by one half simply containing more days.
  const half = Math.floor(series.length / 2);
  const sum = (slice: { total: number }[]) =>
    slice.reduce((acc, point) => acc + (Number(point.total) || 0), 0);
  const first = sum(series.slice(0, half));
  const second = sum(series.slice(series.length - half));
  if (first <= 0) {
    return second > 0 ? 100 : 0;
  }
  return Math.round(((second - first) / first) * 1000) / 10;
}
