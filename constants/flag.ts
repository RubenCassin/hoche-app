// Turn an ISO 3166-1 alpha-2 country code into its flag emoji (regional
// indicator letters). Falls back to a globe when unknown.
export function flagEmoji(countryCode?: string | null): string {
  if (!countryCode || countryCode.length !== 2) return '🌍';
  const cc = countryCode.toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return '🌍';
  const base = 0x1f1e6; // 🇦
  return String.fromCodePoint(
    base + cc.charCodeAt(0) - 65,
    base + cc.charCodeAt(1) - 65
  );
}
