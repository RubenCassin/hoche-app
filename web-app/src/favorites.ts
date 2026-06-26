// Doubles préférés (device). Valeurs = segment de base : 1..20 pour D1..D20,
// 25 pour le Bull. Réglés dans le Profil, utilisés par le solveur de checkout
// pour router vers ces doubles quand c'est possible sans rallonger la finition.
const KEY = 'hoche.web.favoriteDoubles';
function load(): number[] { try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } }
let favs = load();
export function getFavorites(): number[] { return favs; }
export function hasFavorite(seg: number): boolean { return favs.includes(seg); }
export function toggleFavorite(seg: number): number[] {
  favs = favs.includes(seg) ? favs.filter((s) => s !== seg) : [...favs, seg];
  localStorage.setItem(KEY, JSON.stringify(favs));
  return favs;
}
/** Remplace les favoris (hydratation depuis le compte à la connexion). */
export function setFavorites(arr: number[] | undefined | null): number[] {
  favs = Array.isArray(arr) ? arr.slice() : [];
  localStorage.setItem(KEY, JSON.stringify(favs));
  return favs;
}
