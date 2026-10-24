import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { findNearbyOpenCases, type NearbyCase } from '@/lib/boston-311';
import { addMyReport, isFollowing, statusFrom311 } from '@/lib/my-reports';
import { analyzePhoto, type AnalyzeResult } from '@/lib/report-check';

type Coords = { latitude: number; longitude: number };

type Step =
  | { kind: 'camera' }
  | { kind: 'checking'; photoUri: string; message: string }
  | { kind: 'rejected'; photoUri: string; reason: string }
  | { kind: 'error'; message: string }
  | {
      kind: 'duplicate';
      photoUri: string;
      analysis: AnalyzeResult;
      coords: Coords;
      match: NearbyCase;
      alreadyFollowing: boolean;
    }
  | { kind: 'confirm'; photoUri: string; analysis: AnalyzeResult; coords: Coords };

export default function NewReportScreen() {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [step, setStep] = useState<Step>({ kind: 'camera' });

  if (!cameraPermission) return <ThemedView style={styles.fill} />;

  if (!cameraPermission.granted) {
    return (
      <Shell>
        <ThemedText type="subtitle">Camera access</ThemedText>
        <ThemedText themeColor="textSecondary">
          Reports start with a photo taken right now, so the city sees exactly what you see.
        </ThemedText>
        <Button
          label={cameraPermission.canAskAgain ? 'Allow camera' : 'Open Settings'}
          onPress={() =>
            cameraPermission.canAskAgain ? requestCameraPermission() : Linking.openSettings()
          }
        />
        <Button label="Cancel" variant="secondary" onPress={() => router.back()} />
      </Shell>
    );
  }

  async function onCapture(photo: { uri: string; base64: string }, coords: Coords) {
    try {
      setStep({ kind: 'checking', photoUri: photo.uri, message: 'Checking your photo…' });
      const analysis = await analyzePhoto(photo.base64);
      if (!analysis.is_valid) {
        setStep({ kind: 'rejected', photoUri: photo.uri, reason: analysis.reason });
        return;
      }

      setStep({ kind: 'checking', photoUri: photo.uri, message: 'Looking for existing reports nearby…' });
      const nearby = await findNearbyOpenCases(coords.latitude, coords.longitude, analysis.topic);
      if (nearby.length > 0) {
        const match = nearby[0];
        setStep({
          kind: 'duplicate',
          photoUri: photo.uri,
          analysis,
          coords,
          match,
          alreadyFollowing: await isFollowing(match.case_id),
        });
        return;
      }

      setStep({ kind: 'confirm', photoUri: photo.uri, analysis, coords });
    } catch (error) {
      setStep({ kind: 'error', message: (error as Error).message });
    }
  }

  switch (step.kind) {
    case 'camera':
      return <CameraStep onCapture={onCapture} onError={(message) => setStep({ kind: 'error', message })} />;

    case 'checking':
      return (
        <Shell photoUri={step.photoUri}>
          <View style={styles.row}>
            <ActivityIndicator />
            <ThemedText>{step.message}</ThemedText>
          </View>
        </Shell>
      );

    case 'rejected':
      return (
        <Shell photoUri={step.photoUri}>
          <ThemedText type="subtitle">Not a 311 issue</ThemedText>
          <ThemedText themeColor="textSecondary">{step.reason}</ThemedText>
          <Button label="Retake photo" onPress={() => setStep({ kind: 'camera' })} />
          <Button label="Cancel" variant="secondary" onPress={() => router.back()} />
        </Shell>
      );

    case 'error':
      return (
        <Shell>
          <ThemedText type="subtitle">Something went wrong</ThemedText>
          <ThemedText themeColor="textSecondary">{step.message}</ThemedText>
          <Button label="Try again" onPress={() => setStep({ kind: 'camera' })} />
          <Button label="Cancel" variant="secondary" onPress={() => router.back()} />
        </Shell>
      );

    case 'duplicate':
      return <DuplicateStep step={step} onReportAnyway={() => setStep({ ...step, kind: 'confirm' })} />;

    case 'confirm':
      return <ConfirmStep step={step} />;
  }
}

function CameraStep({
  onCapture,
  onError,
}: {
  onCapture: (photo: { uri: string; base64: string }, coords: Coords) => void;
  onError: (message: string) => void;
}) {
  const cameraRef = useRef<CameraView>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  async function capture() {
    if (!cameraRef.current || busy) return;
    setBusy(true);
    try {
      // Location is taken at the same moment as the photo (Plan.md: device location at time of report).
      const location = (async () => {
        const { granted } = await Location.requestForegroundPermissionsAsync();
        if (!granted) throw new Error('Location is needed to place your report on the map.');
        return Location.getCurrentPositionAsync();
      })();
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.4 });
      const { coords } = await location;
      if (!photo?.base64) throw new Error('Could not read the photo.');
      onCapture({ uri: photo.uri, base64: photo.base64 }, coords);
    } catch (error) {
      onError((error as Error).message);
    }
  }

  return (
    <View style={styles.camera}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} onCameraReady={() => setReady(true)} />
      <SafeAreaView style={styles.cameraOverlay} pointerEvents="box-none">
        <Pressable onPress={() => router.back()} style={styles.close}>
          <ThemedText style={styles.cameraText}>✕</ThemedText>
        </Pressable>
        <View style={styles.cameraBottom}>
          <ThemedText type="small" style={styles.cameraText}>
            Snap the issue: pothole, graffiti, broken light…
          </ThemedText>
          <Pressable
            onPress={capture}
            disabled={!ready || busy}
            style={({ pressed }) => [styles.shutter, (pressed || busy) && styles.pressed]}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

function DuplicateStep({
  step,
  onReportAnyway,
}: {
  step: Extract<Step, { kind: 'duplicate' }>;
  onReportAnyway: () => void;
}) {
  const { match, analysis, coords, alreadyFollowing } = step;
  const [saving, setSaving] = useState(false);

  async function meToo() {
    setSaving(true);
    await addMyReport({
      topic: match.case_topic,
      description: analysis.description,
      latitude: coords.latitude,
      longitude: coords.longitude,
      status: statusFrom311(match.case_status),
      caseId: match.case_id,
      assignedTeam: match.assigned_team,
    });
    router.back();
  }

  return (
    <Shell photoUri={step.photoUri}>
      <ThemedText type="subtitle">Already reported</ThemedText>
      <ThemedText themeColor="textSecondary">
        Someone reported this nearby. Add your voice instead of filing a duplicate.
      </ThemedText>
      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold">{match.case_topic}</ThemedText>
        <ThemedText type="small">{match.full_address}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {match.case_status} · {match.assigned_team} · {timeAgo(match.open_date)}
        </ThemedText>
      </ThemedView>
      {alreadyFollowing ? (
        <>
          <ThemedText themeColor="textSecondary">You’re already following this report.</ThemedText>
          <Button label="Done" onPress={() => router.back()} />
        </>
      ) : (
        <>
          <Button label={saving ? 'Saving…' : 'Me too'} onPress={meToo} disabled={saving} />
          <Button label="It’s a different issue" variant="secondary" onPress={onReportAnyway} />
        </>
      )}
    </Shell>
  );
}

function ConfirmStep({ step }: { step: Extract<Step, { kind: 'confirm' }> }) {
  const theme = useTheme();
  const [description, setDescription] = useState(step.analysis.description);
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    // Mocked: Plan.md says demo reports are not sent to the real 311 queue.
    await addMyReport({
      topic: step.analysis.topic,
      description: description.trim(),
      latitude: step.coords.latitude,
      longitude: step.coords.longitude,
      status: 'submitted',
    });
    router.back();
  }

  return (
    <Shell photoUri={step.photoUri}>
      <ThemedText type="subtitle">{step.analysis.topic}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Edit the description if anything’s off.
      </ThemedText>
      <TextInput
        value={description}
        onChangeText={setDescription}
        multiline
        maxLength={300}
        style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
      />
      <ThemedText type="small" themeColor="textSecondary">
        📍 Location from where you took the photo
      </ThemedText>
      <Button
        label={saving ? 'Submitting…' : 'Submit report'}
        onPress={submit}
        disabled={saving || description.trim().length === 0}
      />
      <Button label="Cancel" variant="secondary" onPress={() => router.back()} />
    </Shell>
  );
}

function Shell({ photoUri, children }: { photoUri?: string; children: React.ReactNode }) {
  return (
    <ThemedView style={styles.fill}>
      <SafeAreaView style={styles.fill}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {photoUri && <Image source={{ uri: photoUri }} style={styles.photo} contentFit="cover" />}
          {children}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function Button({
  label,
  onPress,
  disabled,
  variant = 'primary',
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && styles.buttonPrimary,
        (pressed || disabled) && styles.pressed,
      ]}>
      <ThemedText type="smallBold" style={variant === 'primary' && styles.buttonPrimaryText}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

function timeAgo(isoDate: string) {
  const minutes = Math.round((Date.now() - new Date(isoDate.replace(' ', 'T')).getTime()) / 60000);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} h ago`;
  return `${Math.round(hours / 24)} days ago`;
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  photo: {
    width: '100%',
    aspectRatio: 3 / 4,
    maxHeight: 360,
    borderRadius: Spacing.three,
  },
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.half,
  },
  input: {
    minHeight: 96,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  button: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.five,
  },
  buttonPrimary: {
    backgroundColor: '#208AEF',
  },
  buttonPrimaryText: {
    color: '#ffffff',
  },
  pressed: {
    opacity: 0.6,
  },
  camera: {
    flex: 1,
    backgroundColor: '#000000',
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  close: {
    padding: Spacing.four,
    alignSelf: 'flex-start',
  },
  cameraText: {
    color: '#ffffff',
    textAlign: 'center',
  },
  cameraBottom: {
    alignItems: 'center',
    gap: Spacing.three,
    paddingBottom: Spacing.four,
  },
  shutter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ffffff',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.5)',
  },
});
