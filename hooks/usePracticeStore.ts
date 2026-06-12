import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface DrillRecord {
  best: number;
  attempts: number;
  last: number; // most recent result
}

type Bucket = Record<string, DrillRecord>;

interface PracticeState {
  /** Active account's records (derived view for screens). */
  records: Bucket;
  /** Per-account record buckets (key = "guest" or "u<id>"). */
  _buckets: Record<string, Bucket>;
  _account: string;
  /** Save a finished drill result. Returns true if it beat the previous best. */
  addResult: (key: string, value: number, higherIsBetter?: boolean) => boolean;
  /** Switch the active account scope (called on login/logout/guest). */
  setAccount: (account: string) => void;
  reset: () => void;
}

export const usePracticeStore = create<PracticeState>()(
  persist(
    (set, get) => ({
      records: {},
      _buckets: {},
      _account: 'guest',
      addResult: (key, value, higherIsBetter = true) => {
        const { records, _buckets, _account } = get();
        const prev = records[key];
        const isRecord = !prev || (higherIsBetter ? value > prev.best : value < prev.best);
        const best = prev ? (higherIsBetter ? Math.max(prev.best, value) : Math.min(prev.best, value)) : value;
        const nextBucket = { ...records, [key]: { best, attempts: (prev?.attempts ?? 0) + 1, last: value } };
        set({ records: nextBucket, _buckets: { ..._buckets, [_account]: nextBucket } });
        return isRecord;
      },
      setAccount: (account) => {
        if (account === get()._account) return;
        set({ _account: account, records: get()._buckets[account] ?? {} });
      },
      reset: () => {
        const { _buckets, _account } = get();
        set({ records: {}, _buckets: { ..._buckets, [_account]: {} } });
      },
    }),
    {
      name: 'oche.practice',
      storage: createJSONStorage(() => AsyncStorage),
      // Persist all buckets + which account is active; rebuild the active view on rehydrate.
      partialize: (s) => ({ _buckets: s._buckets, _account: s._account }),
      onRehydrateStorage: () => (state) => {
        if (state) state.records = state._buckets?.[state._account] ?? {};
      },
    }
  )
);
