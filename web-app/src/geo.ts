import { updateLocation, type User } from './api';

// Détecte le pays via la géoloc du navigateur (après autorisation) + un reverse
// geocode gratuit sans clé (BigDataCloud, CORS ouvert), puis le synchronise au
// backend pour alimenter le classement Pays/Europe. Parité avec le
// locationService mobile. Ne lève jamais ; renvoie l'utilisateur mis à jour.
export async function detectAndSyncLocation(): Promise<User | null> {
  try {
    if (!('geolocation' in navigator)) return null;
    const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 })
    );
    const { latitude, longitude } = pos.coords;
    const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=fr`);
    const j = await res.json();
    return await updateLocation({
      country: j.countryName ?? null,
      countryCode: j.countryCode ?? null,
      region: j.principalSubdivision ?? null,
      city: j.city || j.locality || null,
    });
  } catch {
    return null; // permission refusée / hors-ligne / service indispo → on ignore
  }
}
