import * as Location from 'expo-location';
import { updateLocation, type User } from './api';

export interface DetectResult {
  status: 'ok' | 'denied' | 'unavailable' | 'error';
  user?: User;
}

/**
 * Ask for foreground location permission, resolve the device's country/region/
 * city by reverse-geocoding the current position, then sync it to the backend.
 * Returns the refreshed user on success. Never throws.
 */
export async function detectAndSyncLocation(): Promise<DetectResult> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return { status: 'denied' };

    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Low,
    });

    const places = await Location.reverseGeocodeAsync({
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
    });
    const p = places[0];
    if (!p) return { status: 'unavailable' };

    const user = await updateLocation({
      country: p.country ?? null,
      countryCode: p.isoCountryCode ?? null,
      region: p.region ?? p.subregion ?? null,
      city: p.city ?? null,
    });
    return { status: 'ok', user };
  } catch (e) {
    return { status: 'error' };
  }
}
