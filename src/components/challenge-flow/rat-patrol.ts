import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

import type { IconName } from '@/ui/icon';

export const RAT_PATROL_ID = 'demo-rat-patrol';

export const SIGN_TYPES: { id: string; label: string; icon: IconName }[] = [
  { id: 'burrows', label: 'Burrows', icon: 'burrow' },
  { id: 'droppings', label: 'Droppings', icon: 'droppings' },
  { id: 'overflowing-trash', label: 'Overflowing trash', icon: 'trash' },
  { id: 'open-trash', label: 'Open trash', icon: 'trashOpen' },
];

export const CHECK_IN_OPTIONS = [
  { id: 'no-change', label: 'No change' },
  { id: 'inspected', label: 'Someone inspected' },
  { id: 'baited', label: 'Bait or traps put out' },
  { id: 'closed-no-action', label: 'Closed with no visible action' },
] as const;

/** Demo week: reported Oct 26, so the day-7 check-in is Mon, Nov 2. */
export const CHECK_IN_DATE = '2026-11-02';

export const FALLBACK_SPOT = { street: 'Centre St', neighborhood: 'Jamaica Plain' };
export const FALLBACK_TICKET = '101005741219';

/** Boston 311 case ids are 12 digits and start with 1010 (e.g. 101005741219). */
export function isBoston311Ticket(value: string) {
  return /^1010\d{8}$/.test(value);
}

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 0.7,
  exif: true,
};

/** Camera first; falls back to the photo library (no camera on the simulator, or permission denied). */
export async function takeSpotPhoto(): Promise<ImagePicker.ImagePickerAsset | null> {
  try {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (permission.granted) {
      const result = await ImagePicker.launchCameraAsync(PICKER_OPTIONS);
      return result.canceled ? null : result.assets[0];
    }
  } catch {
    // No camera available: use the library below.
  }
  const result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
  return result.canceled ? null : result.assets[0];
}

function gpsFromExif(exif: Record<string, any> | null | undefined) {
  if (!exif) return null;
  const gps = exif['{GPS}'] ?? {};
  let latitude = gps.Latitude ?? exif.GPSLatitude;
  let longitude = gps.Longitude ?? exif.GPSLongitude;
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return null;
  if ((gps.LatitudeRef ?? exif.GPSLatitudeRef) === 'S') latitude = -Math.abs(latitude);
  if ((gps.LongitudeRef ?? exif.GPSLongitudeRef) === 'W') longitude = -Math.abs(longitude);
  return { latitude, longitude };
}

async function currentCoords() {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) return null;
  const position =
    (await Location.getLastKnownPositionAsync()) ??
    (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
  return position?.coords ?? null;
}

/** Street + neighborhood from the photo's GPS, else from where the phone is now. */
export async function locateSpot(
  asset: ImagePicker.ImagePickerAsset,
): Promise<{ street: string; neighborhood: string }> {
  try {
    const coords = gpsFromExif(asset.exif) ?? (await currentCoords());
    if (!coords) return FALLBACK_SPOT;
    const [address] = await Location.reverseGeocodeAsync(coords);
    if (!address?.street) return FALLBACK_SPOT;
    return {
      street: address.street,
      neighborhood: address.district ?? address.subregion ?? address.city ?? '',
    };
  } catch {
    return FALLBACK_SPOT;
  }
}
