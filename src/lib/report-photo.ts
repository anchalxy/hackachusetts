import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Platform } from 'react-native';

/** Long edge of the photo we check and keep. Plenty for a crew to see the problem, quick to upload. */
const MAX_EDGE = 1280;

export type PreparedPhoto = {
  /** Shows the photo right now (cache file on device, data URI on web). */
  uri: string;
  base64: string;
  /** What we save on the report; turn it back into a URI with `photoSource`. */
  stored: string;
};

/** Shrinks a camera shot for the photo check and keeps a copy for the pin and the report page. */
export async function preparePhoto(shot: { uri: string; width: number; height: number }): Promise<PreparedPhoto> {
  const context = ImageManipulator.manipulate(shot.uri);
  if (Math.max(shot.width, shot.height) > MAX_EDGE) {
    context.resize(shot.width >= shot.height ? { width: MAX_EDGE, height: null } : { width: null, height: MAX_EDGE });
  }
  const image = await context.renderAsync();
  const result = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
  if (!result.base64) throw new Error('Photo has no data');

  if (Platform.OS === 'web') {
    const dataUri = `data:image/jpeg;base64,${result.base64}`;
    return { uri: dataUri, base64: result.base64, stored: dataUri };
  }
  // The manipulator writes to the cache, which iOS can clear; reports keep their own copy.
  const folder = new Directory(Paths.document, 'reports');
  folder.create({ idempotent: true, intermediates: true });
  const name = `report-${Date.now()}.jpg`;
  await new File(result.uri).copy(new File(folder, name));
  return { uri: result.uri, base64: result.base64, stored: `reports/${name}` };
}

/**
 * The saved photo as an image URI. We store a path inside the documents folder, because the
 * folder's absolute path changes when the app is reinstalled or Expo Go updates.
 */
export function photoSource(stored: string | undefined): string | undefined {
  if (!stored) return undefined;
  if (Platform.OS === 'web' || /^(data|https?|blob):/.test(stored)) return stored;
  // Reports from before this kept an absolute file:// URI to a file at the documents root.
  const relative = stored.startsWith('file:') ? stored.split('/').pop()! : stored;
  return new File(Paths.document, relative).uri;
}
