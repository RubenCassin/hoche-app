// Records de drills, persistés par compte dans localStorage.
export interface DrillRecord { best: number; attempts: number; last: number; }
type Bucket = Record<string, DrillRecord>;

const key = (account: string) => `hoche.web.drills.${account}`;

export function getRecords(account: string): Bucket {
  try { return JSON.parse(localStorage.getItem(key(account)) || '{}'); } catch { return {}; }
}

export function addResult(account: string, drillKey: string, value: number, higherIsBetter = true): boolean {
  const recs = getRecords(account);
  const prev = recs[drillKey];
  const isRecord = !prev || (higherIsBetter ? value > prev.best : value < prev.best);
  const best = prev ? (higherIsBetter ? Math.max(prev.best, value) : Math.min(prev.best, value)) : value;
  recs[drillKey] = { best, attempts: (prev?.attempts ?? 0) + 1, last: value };
  try { localStorage.setItem(key(account), JSON.stringify(recs)); } catch {}
  return isRecord;
}
