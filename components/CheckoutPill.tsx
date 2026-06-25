import React from 'react';
import { View, StyleSheet } from 'react-native';
import { OcheText } from './OcheText';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useFavoritesStore } from '@/hooks/useFavoritesStore';
import type { FinishMode } from '@/hooks/useGameStore';

/** Libellé du double favori → la fléchette finale correspondante (D16, Bull…). */
function favLabel(seg: number): string {
  return seg === 25 ? 'Bull' : `D${seg}`;
}

// Canonical pro routes for the famous high finishes (double-out). Used as a
// preferred override; everything else is computed by `solveCheckout` below so
// every legal finish — including low/odd numbers like 19 or 10 — is covered.
const CHECKOUTS: Record<number, string[]> = {
  170: ['T20', 'T20', 'Bull'],
  167: ['T20', 'T19', 'Bull'],
  164: ['T20', 'T18', 'Bull'],
  161: ['T20', 'T17', 'Bull'],
  160: ['T20', 'T20', 'D20'],
  158: ['T20', 'T20', 'D19'],
  157: ['T20', 'T19', 'D20'],
  156: ['T20', 'T20', 'D18'],
  155: ['T20', 'T19', 'D19'],
  154: ['T20', 'T18', 'D20'],
  153: ['T20', 'T19', 'D18'],
  152: ['T20', 'T20', 'D16'],
  151: ['T20', 'T17', 'D20'],
  150: ['T20', 'T18', 'D18'],
  149: ['T20', 'T19', 'D16'],
  148: ['T20', 'T16', 'D20'],
  147: ['T20', 'T17', 'D18'],
  146: ['T20', 'T18', 'D16'],
  145: ['T20', 'T15', 'D20'],
  144: ['T20', 'T20', 'D12'],
  143: ['T20', 'T17', 'D16'],
  142: ['T20', 'T14', 'D20'],
  141: ['T20', 'T15', 'D18'],
  140: ['T20', 'T20', 'D10'],
  139: ['T20', 'T13', 'D20'],
  138: ['T20', 'T18', 'D12'],
  137: ['T20', 'T15', 'D16'],
  136: ['T20', 'T20', 'D8'],
  135: ['T20', 'T17', 'D12'],
  134: ['T20', 'T14', 'D16'],
  133: ['T20', 'T19', 'D8'],
  132: ['T20', 'T16', 'D12'],
  131: ['T20', 'T13', 'D16'],
  130: ['T20', 'T20', 'D5'],
  129: ['T19', 'T16', 'D12'],
  128: ['T20', 'T20', 'D4'],
  127: ['T20', 'T17', 'D8'],
  126: ['T19', 'T19', 'D6'],
  125: ['T20', 'T15', 'D10'],
  124: ['T20', 'T16', 'D8'],
  123: ['T19', 'T16', 'D9'],
  122: ['T18', 'T18', 'D7'],
  121: ['T20', 'T15', 'D8'],
  120: ['T20', 'S20', 'D20'],
  119: ['T19', 'T14', 'D8'],
  118: ['T20', 'S18', 'D20'],
  117: ['T20', 'S17', 'D20'],
  116: ['T20', 'S16', 'D20'],
  115: ['T19', 'S18', 'D20'],
  114: ['T20', 'S14', 'D20'],
  113: ['T19', 'S16', 'D20'],
  112: ['T20', 'S12', 'D20'],
  111: ['T19', 'S14', 'D20'],
  110: ['T20', 'S10', 'D20'],
  109: ['T20', 'S9', 'D20'],
  108: ['T20', 'S8', 'D20'],
  107: ['T19', 'S10', 'D20'],
  106: ['T20', 'S6', 'D20'],
  105: ['T20', 'S5', 'D20'],
  104: ['T18', 'S18', 'D16'],
  103: ['T19', 'S6', 'D20'],
  102: ['T20', 'S2', 'D20'],
  101: ['T17', 'S10', 'D20'],
  100: ['T20', 'D20'],
  99: ['T19', 'S10', 'D16'],
  98: ['T20', 'D19'],
  97: ['T19', 'D20'],
  96: ['T20', 'D18'],
  95: ['T19', 'D19'],
  94: ['T18', 'D20'],
  93: ['T19', 'D18'],
  92: ['T20', 'D16'],
  91: ['T17', 'D20'],
  90: ['T20', 'D15'],
  89: ['T19', 'D16'],
  88: ['T16', 'D20'],
  87: ['T17', 'D18'],
  86: ['T18', 'D16'],
  85: ['T15', 'D20'],
  84: ['T20', 'D12'],
  83: ['T17', 'D16'],
  82: ['T14', 'D20'],
  81: ['T19', 'D12'],
  80: ['T20', 'D10'],
  79: ['T13', 'D20'],
  78: ['T18', 'D12'],
  77: ['T15', 'D16'],
  76: ['T20', 'D8'],
  75: ['T17', 'D12'],
  74: ['T14', 'D16'],
  73: ['T19', 'D8'],
  72: ['T16', 'D12'],
  71: ['T13', 'D16'],
  70: ['T10', 'D20'],
  69: ['T19', 'D6'],
  68: ['T20', 'D4'],
  67: ['T9', 'D20'],
  66: ['T10', 'D18'],
  65: ['T11', 'D16'],
  64: ['T16', 'D8'],
  63: ['T13', 'D12'],
  62: ['T10', 'D16'],
  61: ['T15', 'D8'],
  60: ['S20', 'D20'],
  50: ['Bull'],
  40: ['D20'],
  36: ['D18'],
  32: ['D16'],
  24: ['D12'],
  20: ['D10'],
  16: ['D8'],
  8: ['D4'],
  4: ['D2'],
  2: ['D1'],
};

// ─── Checkout solver ────────────────────────────────────────────────────────
// We compute checkouts so every legal finish is covered (the curated table only
// holds the canonical high finishes). The solver respects the finish mode:
//   simple → any dart finishes · double → double/bull · master → double/triple/bull

interface Dart {
  label: string;
  value: number;
}

const SINGLES: Dart[] = Array.from({ length: 20 }, (_, i) => ({ label: `S${i + 1}`, value: i + 1 }));
const DOUBLES: Dart[] = Array.from({ length: 20 }, (_, i) => ({ label: `D${i + 1}`, value: 2 * (i + 1) }));
const TRIPLES: Dart[] = Array.from({ length: 20 }, (_, i) => ({ label: `T${i + 1}`, value: 3 * (i + 1) }));
const BULL25: Dart = { label: '25', value: 25 };
const BULL50: Dart = { label: 'Bull', value: 50 };

// A setup (non-final) dart for a given point value, preferring single > triple >
// double > bull. Lets us turn any reachable remainder back into a clean label.
const SETUP_BY_VALUE: Record<number, string> = (() => {
  const m: Record<number, string> = {};
  for (const d of SINGLES) if (!(d.value in m)) m[d.value] = d.label;
  m[25] = '25';
  for (const d of TRIPLES) if (!(d.value in m)) m[d.value] = d.label;
  for (const d of DOUBLES) if (!(d.value in m)) m[d.value] = d.label;
  if (!(50 in m)) m[50] = 'Bull';
  return m;
})();

// Even-numbered doubles (D2, D4, …, D20) are the preferred finishes; odd ones
// (D1, D3, …, D19) come after. Both listed high → low.
const EVEN_DOUBLES_DESC = DOUBLES.filter((d) => (d.value / 2) % 2 === 0).reverse();
const ODD_DOUBLES_DESC = DOUBLES.filter((d) => (d.value / 2) % 2 === 1).reverse();
const TRIPLES_DESC = [...TRIPLES].reverse();
const SINGLES_DESC = [...SINGLES].reverse();

/** Ordered list of valid finishing darts for the mode (nicest first).
 *  Si `favValues` (valeurs des doubles favoris) est fourni, ces finitions
 *  passent en tête → le solveur finit dessus quand c'est possible au même
 *  nombre de fléchettes (jamais plus). */
function finisherList(mode: FinishMode, favValues?: Set<number>): Dart[] {
  let doubleFinishers = [...EVEN_DOUBLES_DESC, BULL50, ...ODD_DOUBLES_DESC];
  if (favValues && favValues.size) {
    const fav = doubleFinishers.filter((d) => favValues.has(d.value));
    const rest = doubleFinishers.filter((d) => !favValues.has(d.value));
    doubleFinishers = [...fav, ...rest];
  }
  switch (mode) {
    case 'double':
      return doubleFinishers;
    case 'master':
      return [...doubleFinishers, ...TRIPLES_DESC];
    case 'simple':
      return [...SINGLES_DESC, BULL25, ...doubleFinishers, ...TRIPLES_DESC];
  }
}

/** Big-scorer-first ordering for the opening dart of a 3-dart checkout. */
const FIRST_DART_ORDER: Dart[] = [...TRIPLES_DESC, BULL50, BULL25, ...SINGLES_DESC];

/** Minimal-dart checkout for `remaining` within `dartsLeft`, or null. */
export function solveCheckout(remaining: number, dartsLeft: number, mode: FinishMode, favValues?: Set<number>): string[] | null {
  const minFinish = mode === 'simple' ? 1 : 2;
  if (remaining < minFinish || remaining > 170) return null;

  const finishers = finisherList(mode, favValues);

  // 1 dart
  for (const f of finishers) if (f.value === remaining) return [f.label];

  // 2 darts
  if (dartsLeft >= 2) {
    for (const f of finishers) {
      const r1 = remaining - f.value;
      if (r1 >= 1 && SETUP_BY_VALUE[r1]) return [SETUP_BY_VALUE[r1], f.label];
    }
  }

  // 3 darts
  if (dartsLeft >= 3) {
    for (const f of finishers) {
      for (const s1 of FIRST_DART_ORDER) {
        const r2 = remaining - f.value - s1.value;
        if (r2 >= 1 && SETUP_BY_VALUE[r2]) return [s1.label, SETUP_BY_VALUE[r2], f.label];
      }
    }
  }

  return null;
}

interface CheckoutPillProps {
  remaining: number;
  dartsLeft?: number; // 1, 2, or 3
  finishMode?: FinishMode;
}

function getCheckout(
  remaining: number,
  dartsLeft: number = 3,
  finishMode: FinishMode = 'double',
  favValues?: Set<number>
): string[] | null {
  // Avec des doubles favoris, on laisse le solveur biaisé router vers eux.
  // Sinon, on garde les routes pro canoniques pour le double-out.
  if (finishMode === 'double' && (!favValues || favValues.size === 0)) {
    const curated = CHECKOUTS[remaining];
    if (curated && curated.length <= dartsLeft) return curated;
  }
  return solveCheckout(remaining, dartsLeft, finishMode, favValues);
}

export function CheckoutPill({ remaining, dartsLeft = 3, finishMode = 'double' }: CheckoutPillProps) {
  const C = useTheme();
  const styles = makeStyles(C);
  const favoriteDoubles = useFavoritesStore((s) => s.favoriteDoubles);
  const favValues = React.useMemo(
    () => new Set(favoriteDoubles.map((seg) => (seg === 25 ? 50 : seg * 2))),
    [favoriteDoubles]
  );
  const favLabels = React.useMemo(() => new Set(favoriteDoubles.map(favLabel)), [favoriteDoubles]);
  const checkout = getCheckout(remaining, dartsLeft, finishMode, favValues);
  if (!checkout) return null;

  return (
    <View style={styles.container}>
      <OcheText variant="labelSm" allCaps color={C.fg3} style={styles.label}>
        Checkout
      </OcheText>
      <View style={styles.pills}>
        {checkout.map((segment, i) => {
          const isDouble = segment.startsWith('D') || segment === 'Bull';
          const isTriple = segment.startsWith('T');
          const isFav = isDouble && favLabels.has(segment);
          return (
            <View
              key={i}
              style={[
                styles.pill,
                isDouble && styles.pillDouble,
                isTriple && styles.pillTriple,
                isFav && styles.pillFav,
              ]}
            >
              <OcheText
                variant="labelMd"
                allCaps
                color={isFav ? C.onAmber : isDouble ? C.amber : isTriple ? C.brick : C.cream}
                style={styles.pillText}
              >
                {isFav ? `★ ${segment}` : segment}
              </OcheText>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const makeStyles = (C: ReturnType<typeof useTheme>) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s2,
    paddingVertical: Spacing.s2,
  },
  label: {
    letterSpacing: 1,
  },
  pills: {
    flexDirection: 'row',
    gap: 4,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.sm,
    backgroundColor: C.walnutUp2,
    borderWidth: 1,
    borderColor: C.border1,
  },
  pillDouble: {
    borderColor: C.amber,
  },
  pillFav: {
    backgroundColor: C.amber,
    borderColor: C.amber,
  },
  pillTriple: {
    borderColor: C.brick,
  },
  pillText: {
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
