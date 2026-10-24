import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { router, type Href } from 'expo-router';
import Storage from 'expo-sqlite/kv-store';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { ago } from '@/components/report/format';
import { CloseButton } from '@/components/report/quick-look';
import { PaulDelivers, PaulInspecting } from '@/components/report/revere';
import { topicInfo } from '@/constants/report-topics';
import { findNearbyOpenCases, type NearbyCase } from '@/lib/boston-311';
import { addMyReport, isFollowing, statusFrom311, type MyReport } from '@/lib/my-reports';
import { analyzePhoto, descriptionMatches, warmUpPhotoCheck, type AnalyzeResult } from '@/lib/report-check';
import { photoSource, preparePhoto } from '@/lib/report-photo';
import { Badge, Button, IconTile, StatusBadge, TextLink } from '@/ui/components';
import { Icon } from '@/ui/icon';
import { Txt } from '@/ui/text';
import { color, font, radius, space, t } from '@/ui/theme';

const INTRO_KEY = 'reportIntroSeen';
const GUIDELINES = '/menu/reporting-guidelines' as Href;

type Photo = {
  /** Shows the shot on these screens. */
  uri: string;
  base64: string;
  /** Saved on the report (see photoSource). */
  stored: string;
  latitude: number;
  longitude: number;
  address: string;
};

type Step =
  | { kind: 'loading' }
  | { kind: 'intro' }
  | { kind: 'cameraOff' }
  | { kind: 'camera' }
  | { kind: 'checking'; photo: Photo }
  | { kind: 'unclear'; photo: Photo; reason: string; tip: string }
  | { kind: 'notCity'; photo: Photo; reason: string }
  | { kind: 'error' }
  | { kind: 'duplicate'; photo: Photo; draft: AnalyzeResult; match: NearbyCase; following: boolean }
  | { kind: 'review'; photo: Photo; draft: AnalyzeResult }
  | { kind: 'sent'; report: MyReport };

/** Report an issue, flow v2 (DESIGN.md 6d / design/flows/submit-flow.png). */
export default function NewReportScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [step, setStep] = useState<Step>({ kind: 'loading' });
  // Bumped whenever a check is started or abandoned, so a late answer can't replace a newer screen.
  const checkId = useRef(0);

  // First time: the intro sheet. After that, straight to the camera (or "camera is off").
  const decided = useRef(false);
  useEffect(() => {
    if (!permission || decided.current) return;
    decided.current = true;
    Storage.getItem(INTRO_KEY).then((seen) => {
      if (permission.granted) setStep({ kind: 'camera' });
      else if (!seen || permission.canAskAgain) setStep({ kind: 'intro' });
      else setStep({ kind: 'cameraOff' });
    });
  }, [permission]);

  async function allowCamera() {
    await Storage.setItem(INTRO_KEY, '1');
    const result = await requestPermission();
    setStep(result.granted ? { kind: 'camera' } : { kind: 'cameraOff' });
  }

  async function check(photo: Photo) {
    const id = ++checkId.current;
    const current = () => id === checkId.current;
    setStep({ kind: 'checking', photo });
    try {
      const draft = await analyzePhoto(photo.base64, t.motion.photoCheck.timeoutMs);
      if (!current()) return;
      if (draft.verdict === 'unclear') return setStep({ kind: 'unclear', photo, reason: draft.reason, tip: draft.tip });
      if (draft.verdict === 'not_city_issue') return setStep({ kind: 'notCity', photo, reason: draft.reason });

      // Already in 311 nearby? Offer "Me too" instead of a duplicate ticket.
      const nearby = await findNearbyOpenCases(photo.latitude, photo.longitude, draft.topic).catch(() => []);
      if (!current()) return;
      if (nearby.length > 0) {
        const match = nearby[0];
        const following = await isFollowing(match.case_id);
        if (current()) setStep({ kind: 'duplicate', photo, draft, match, following });
        return;
      }
      setStep({ kind: 'review', photo, draft });
    } catch {
      if (current()) setStep({ kind: 'error' });
    }
  }

  const retake = () => {
    checkId.current++;
    setStep({ kind: 'camera' });
  };
  const close = () => {
    checkId.current++;
    router.back();
  };
  const openReport = (id: string) => router.replace({ pathname: '/report/[id]', params: { id } });
  const guidelines = () => router.push(GUIDELINES);

  switch (step.kind) {
    case 'loading':
      return <View style={styles.dark} />;
    case 'intro':
      return <Intro onAllow={allowCamera} onClose={close} onGuidelines={guidelines} />;
    case 'cameraOff':
      return <CameraOff onClose={close} />;
    case 'camera':
      return <Camera onClose={close} onCapture={check} />;
    case 'checking':
      return <Checking photo={step.photo} onClose={close} />;
    case 'unclear':
      return <Unclear {...step} onRetake={retake} onBack={close} />;
    case 'notCity':
      return <NotCity {...step} onBack={close} onGuidelines={guidelines} />;
    case 'error':
      return <CheckError onRetake={retake} onClose={close} />;
    case 'duplicate':
      return (
        <Duplicate
          {...step}
          onRetake={retake}
          onBack={close}
          onDifferent={() => setStep({ kind: 'review', photo: step.photo, draft: step.draft })}
          onFollowed={openReport}
        />
      );
    case 'review':
      return <Review {...step} onRetake={retake} onSent={(report) => setStep({ kind: 'sent', report })} />;
    case 'sent':
      return <Sent report={step.report} onView={() => openReport(step.report.id)} onBack={close} />;
  }
}

// ── 0. First time only ────────────────────────────────────────────────────────────

function Intro({ onAllow, onClose, onGuidelines }: { onAllow: () => void; onClose: () => void; onGuidelines: () => void }) {
  const insets = useSafeAreaInsets();
  const steps = [
    { icon: 'camera', title: 'Snap the problem', body: 'We check the photo in a few seconds.' },
    { icon: 'notes', title: 'Check what we wrote', body: 'AI drafts the report. Edit anything.' },
    { icon: 'shield', title: 'Send it to 311', body: 'We route it to the right department.' },
  ] as const;
  return (
    <View style={styles.backdrop}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.grabber} />
        <View style={styles.sheetClose}>
          <CloseButton onPress={onClose} />
        </View>
        <Txt variant="display">Report in 3 quick steps</Txt>
        <Txt variant="body" style={styles.slate}>
          About a minute, start to finish.
        </Txt>
        <View style={styles.introSteps}>
          {steps.map((s, i) => (
            <View key={s.title}>
              <View style={styles.introStep}>
                <IconTile icon={s.icon} size={48} />
                <View style={styles.flex}>
                  <Txt variant="rowLead" style={styles.introTitle}>
                    {s.title}
                  </Txt>
                  <Txt variant="body" style={styles.slate}>
                    {s.body}
                  </Txt>
                </View>
              </View>
              {i < steps.length - 1 && <View style={styles.introLine} />}
            </View>
          ))}
        </View>
        <Button label="Allow camera access" onPress={onAllow} />
        <Txt variant="secondary" style={[styles.center, styles.mute, styles.caption]}>
          Only used when you take a report photo.
        </Txt>
        <TextLink label="What can I report?" onPress={onGuidelines} />
      </View>
    </View>
  );
}

// ── 0b. Camera access is off ──────────────────────────────────────────────────────

function CameraOff({ onClose }: { onClose: () => void }) {
  return (
    <SafeAreaView style={styles.dark}>
      <StatusBar style="light" />
      <View style={styles.topLeft}>
        <CloseButton onPress={onClose} light />
      </View>
      <View style={styles.centerGroup}>
        <View style={styles.mutedCamera}>
          <Icon name="camera" size={44} />
        </View>
        <Txt variant="title" style={styles.white}>
          We need your camera
        </Txt>
        <Txt variant="secondary" style={[styles.center, styles.whiteSoft]}>
          Turn on camera access in Settings{'\n'}to snap a report.
        </Txt>
        <Button label="Open Settings" onPress={() => Linking.openSettings()} style={styles.settingsButton} />
      </View>
    </SafeAreaView>
  );
}

// ── 1. Camera ─────────────────────────────────────────────────────────────────────

type Here = { status: 'finding' | 'found' | 'off'; latitude?: number; longitude?: number; address?: string };

/** Where the user is while framing the shot: watched live, street name looked up once. */
function useHere(): Here {
  const [here, setHere] = useState<Here>({ status: 'finding' });
  useEffect(() => {
    let active = true;
    let subscription: Location.LocationSubscription | undefined;
    let named = false;
    (async () => {
      const { granted } = await Location.requestForegroundPermissionsAsync();
      if (!active) return;
      if (!granted) return setHere({ status: 'off' });
      subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 10 },
        ({ coords }) => {
          if (!active) return;
          setHere((h) => ({ ...h, status: 'found', latitude: coords.latitude, longitude: coords.longitude }));
          if (named) return;
          named = true;
          Location.reverseGeocodeAsync(coords)
            .then(([geo]) => {
              const address = geo?.street ?? geo?.name ?? geo?.district;
              if (active && address) setHere((h) => ({ ...h, address }));
            })
            .catch(() => {});
        },
      );
      if (!active) subscription.remove();
    })().catch(() => active && setHere({ status: 'off' }));
    return () => {
      active = false;
      subscription?.remove();
    };
  }, []);
  return here;
}

function Camera({ onClose, onCapture }: { onClose: () => void; onCapture: (photo: Photo) => void }) {
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [torch, setTorch] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const here = useHere();

  useEffect(() => warmUpPhotoCheck(), []);

  function locationOff() {
    Alert.alert('Turn on location', 'Reports need to know where the problem is. Turn on location for this app in Settings.', [
      { text: 'Not now', style: 'cancel' },
      { text: 'Open Settings', onPress: () => Linking.openSettings() },
    ]);
  }

  async function capture() {
    if (!cameraRef.current || busy) return;
    if (here.status === 'off') return locationOff();
    setBusy(true);
    setProblem(null);
    try {
      const shot = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      // Location comes from the device at the moment of reporting.
      const [prepared, coords] = await Promise.all([
        preparePhoto(shot),
        here.latitude !== undefined
          ? { latitude: here.latitude, longitude: here.longitude! }
          : Location.getCurrentPositionAsync().then((p) => p.coords),
      ]);
      onCapture({
        uri: prepared.uri,
        base64: prepared.base64,
        stored: prepared.stored,
        latitude: coords.latitude,
        longitude: coords.longitude,
        address: here.address ?? 'Your location',
      });
    } catch (error) {
      console.warn('[camera] capture failed:', error);
      setProblem('Couldn’t take that photo. Try again.');
      setBusy(false);
    }
  }

  const chip = here.status === 'off' ? 'Location is off' : (here.address ?? (here.status === 'found' ? 'Your location' : 'Finding you…'));

  return (
    <View style={styles.dark}>
      <StatusBar style="light" />
      <View style={styles.preview}>
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} onCameraReady={() => setReady(true)} enableTorch={torch} />
        <View style={[styles.cameraTop, { paddingTop: insets.top + 12 }]}>
          <CloseButton onPress={onClose} light size={36} />
          <Pressable onPress={here.status === 'off' ? locationOff : undefined} style={styles.locationChip}>
            <Svg width={12} height={15} viewBox="0 0 12 14">
              <Path d="M6 13.5S1 9 1 5.2a5 5 0 0110 0C11 9 6 13.5 6 13.5z" fill="#FFFFFF" />
            </Svg>
            <Txt variant="badge" style={[styles.white, styles.chipText]} numberOfLines={1}>
              {chip}
            </Txt>
          </Pressable>
          <Pressable onPress={() => setTorch((v) => !v)} style={[styles.roundGlass, torch && styles.torchOn]} hitSlop={8}>
            <Svg width={14} height={16} viewBox="0 0 14 16">
              <Path
                d="M8 1L2 9h4.5L5.5 15 12 6.5H7.5L8 1z"
                fill="none"
                stroke={torch ? color.ink : '#FFFFFF'}
                strokeWidth={1.6}
                strokeLinejoin="round"
              />
            </Svg>
          </Pressable>
        </View>
        <FrameCorners />
        <View style={[styles.hint, problem && styles.hintProblem]}>
          <Txt variant="badge" style={[styles.white, styles.hintText]}>
            {problem ?? 'Fit the whole problem in the frame'}
          </Txt>
        </View>
      </View>
      <View style={[styles.shutterBar, { paddingBottom: insets.bottom }]}>
        <Pressable onPress={capture} disabled={!ready || busy} style={styles.shutterRing} accessibilityLabel="Take photo">
          {({ pressed }) =>
            busy ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <View style={[styles.shutter, pressed && styles.shutterPressed]} />
            )
          }
        </Pressable>
      </View>
    </View>
  );
}

function FrameCorners() {
  const corner = (rotate: string, pos: object) => (
    <Svg width={30} height={30} viewBox="0 0 30 30" style={[styles.corner, pos, { transform: [{ rotate }] }]}>
      <Path d="M2 28V2h26" stroke="#FFFFFF" strokeOpacity={0.9} strokeWidth={3} fill="none" strokeLinecap="round" />
    </Svg>
  );
  return (
    <View style={styles.frame} pointerEvents="none">
      {corner('0deg', { top: 0, left: 0 })}
      {corner('90deg', { top: 0, right: 0 })}
      {corner('180deg', { bottom: 0, right: 0 })}
      {corner('270deg', { bottom: 0, left: 0 })}
    </View>
  );
}

// ── 2. Paul's inspecting your photo… ─────────────────────────────────────────────

function Checking({ photo, onClose }: { photo: Photo; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [slow, setSlow] = useState(false);
  const scan = useSharedValue(0);
  useEffect(() => {
    scan.value = withRepeat(withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.quad) }), -1, true);
    const timer = setTimeout(() => setSlow(true), t.motion.photoCheck.stillLookingAfterMs);
    return () => clearTimeout(timer);
  }, [scan]);
  const scanStyle = useAnimatedStyle(() => ({ top: `${12 + scan.value * 50}%` }));

  return (
    <View style={styles.dark}>
      <StatusBar style="light" />
      <Image source={{ uri: photo.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
      <View style={[StyleSheet.absoluteFill, styles.dim]} />
      <Animated.View style={[styles.scanLine, scanStyle]} />
      <View style={[styles.topLeftAbsolute, { top: insets.top + 12 }]}>
        <CloseButton onPress={onClose} light size={36} />
      </View>
      <View style={[styles.checkCard, { paddingBottom: insets.bottom + 40 }]}>
        <PaulInspecting width={200} />
        <Txt variant="hero" style={[styles.center, styles.checkTitle]}>
          {slow ? 'Still looking…' : 'Paul’s inspecting your photo…'}
        </Txt>
        <Txt variant="body" style={[styles.center, styles.slate]}>
          Just a few seconds
        </Txt>
      </View>
    </View>
  );
}

// ── 2b / 2d / 2c: results that didn't go through ─────────────────────────────────

function ResultScreen({ back, onBack, children }: { back: string; onBack: () => void; children: ReactNode }) {
  return (
    <SafeAreaView style={styles.light} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <BackLink label={back} onPress={onBack} />
      {/* Result screens: content and button as one group, no dead space between them. */}
      <ScrollView contentContainerStyle={styles.resultGroup}>{children}</ScrollView>
    </SafeAreaView>
  );
}

function Unclear({ photo, reason, tip, onRetake, onBack }: { photo: Photo; reason: string; tip: string; onRetake: () => void; onBack: () => void }) {
  return (
    <ResultScreen back="Map" onBack={onBack}>
      <View>
        <Image source={{ uri: photo.uri }} style={styles.resultPhoto} contentFit="cover" />
        <View style={[styles.resultPhoto, styles.photoFade]} />
      </View>
      <NoticeCard
        tone="gold"
        title="Let’s try that again"
        subtitle="Nothing was sent."
        body={[reason, tip].filter(Boolean).join(' ') || 'We couldn’t spot something the city can fix. Try getting a little closer, in good light.'}
      />
      <Txt variant="secondary" style={styles.mute}>
        Emergency? Call 911 instead.
      </Txt>
      <Button label="Retake photo" onPress={onRetake} style={styles.resultButton} />
    </ResultScreen>
  );
}

function NotCity({ photo, reason, onBack, onGuidelines }: { photo: Photo; reason: string; onBack: () => void; onGuidelines: () => void }) {
  return (
    <ResultScreen back="Map" onBack={onBack}>
      <Image source={{ uri: photo.uri }} style={styles.resultPhoto} contentFit="cover" />
      <NoticeCard
        tone="brick"
        title="We can’t send this one"
        subtitle="Nothing was sent. No points lost."
        body={reason || '311 can only fix things on public streets, sidewalks and parks.'}
      />
      <Txt variant="secondary" style={styles.mute}>
        Think it’s public? Try a photo that shows the street.
      </Txt>
      <Button label="Back to map" onPress={onBack} style={styles.resultButton} />
      <TextLink label="What can I report?" onPress={onGuidelines} />
    </ResultScreen>
  );
}

function CheckError({ onRetake, onClose }: { onRetake: () => void; onClose: () => void }) {
  return (
    <SafeAreaView style={styles.light}>
      <StatusBar style="dark" />
      <View style={styles.topRight}>
        <CloseButton onPress={onClose} size={36} />
      </View>
      <View style={[styles.centerGroup, styles.errorGroup]}>
        <PaulInspecting width={220} />
        <Txt variant="title" style={[styles.center, styles.errorTitle]}>
          Hmm, Paul couldn’t see it
        </Txt>
        <Txt variant="body" style={[styles.center, styles.slate]}>
          Something went wrong checking your photo. It might be your connection.
        </Txt>
        <Button label="Retake photo" onPress={onRetake} style={styles.errorButton} />
      </View>
    </SafeAreaView>
  );
}

function NoticeCard({ tone, title, subtitle, body }: { tone: 'gold' | 'brick'; title: string; subtitle: string; body: string }) {
  const palette =
    tone === 'gold'
      ? { bg: '#FBF5E6', border: '#F0E2BF', fg: color.status.inReview.fg, dot: color.status.inReview.ring }
      : { bg: '#FBEEEA', border: '#F1CFC6', fg: color.status.notApproved.fg, dot: color.status.notApproved.ring };
  return (
    <View style={[styles.notice, { backgroundColor: palette.bg, borderColor: palette.border }]}>
      <View style={styles.noticeHead}>
        <Bang background={palette.dot} />
        <View style={styles.flex}>
          <Txt variant="hero" style={{ color: palette.fg }}>
            {title}
          </Txt>
          <Txt variant="body" style={{ color: palette.fg }}>
            {subtitle}
          </Txt>
        </View>
      </View>
      <View style={[styles.noticeDivider, { backgroundColor: palette.border }]} />
      <Txt variant="body">{body}</Txt>
    </View>
  );
}

function Bang({ background, small }: { background: string; small?: boolean }) {
  return (
    <View style={[styles.bang, small && styles.bangSmall, { backgroundColor: background }]}>
      <Txt variant="badge" style={[styles.white, styles.bangText]}>
        !
      </Txt>
    </View>
  );
}

// ── Already reported nearby (311 duplicate check) ────────────────────────────────

function Duplicate({
  photo,
  draft,
  match,
  following,
  onRetake,
  onBack,
  onDifferent,
  onFollowed,
}: {
  photo: Photo;
  draft: AnalyzeResult;
  match: NearbyCase;
  following: boolean;
  onRetake: () => void;
  onBack: () => void;
  onDifferent: () => void;
  onFollowed: (id: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const opened = Date.parse(match.open_date.replace(' ', 'T').replace('+00', 'Z'));
  const street = match.full_address.split(',')[0];

  async function meToo() {
    setSaving(true);
    const info = topicInfo(match.case_topic);
    const report = await addMyReport({
      topic: match.case_topic,
      title: draft.title,
      description: draft.description,
      aiDraft: draft.description,
      urgency: draft.urgency,
      address: street,
      latitude: photo.latitude,
      longitude: photo.longitude,
      photoUri: photo.stored,
      status: statusFrom311(match.case_status),
      caseId: match.case_id,
      team: match.assigned_team,
      department: info.department,
      updates: [
        { who: 'You', kind: 'you', text: 'Added your voice with a photo.' },
        { who: 'Boston 311', kind: 'city', text: `Already reported ${ago(opened)} ago. You’ll get its updates.` },
      ],
    });
    onFollowed(report.id);
  }

  return (
    <ResultScreen back="Retake" onBack={onRetake}>
      <View style={styles.heading}>
        <Txt variant="display">Someone beat you to it</Txt>
        <Txt variant="body" style={styles.slate}>
          This is already with 311. Add your voice instead of filing it twice.
        </Txt>
      </View>
      <View style={styles.card}>
        <View style={styles.caseRow}>
          <IconTile icon={topicInfo(match.case_topic).icon} />
          <View style={styles.flex}>
            <Txt variant="rowLead">{match.case_topic}</Txt>
            <Txt variant="secondary" numberOfLines={1}>
              {street} · {ago(opened)}
            </Txt>
          </View>
          <StatusBadge status={statusFrom311(match.case_status)} />
        </View>
        {match.assigned_team ? (
          <Txt variant="secondary" style={styles.mute}>
            With {match.assigned_team}
          </Txt>
        ) : null}
      </View>
      {following ? (
        <>
          <Txt variant="secondary">You’re already following this report.</Txt>
          <Button label="Back to map" onPress={onBack} style={styles.resultButton} />
        </>
      ) : (
        <>
          <Button label={saving ? 'Adding…' : 'Me too'} onPress={meToo} disabled={saving} style={styles.resultButton} />
          <TextLink label="It’s a different issue" onPress={onDifferent} />
        </>
      )}
    </ResultScreen>
  );
}

// ── 3. Here's what we'll send (+ 3b doesn't match) ───────────────────────────────

function Review({
  photo,
  draft,
  onRetake,
  onSent,
}: {
  photo: Photo;
  draft: AnalyzeResult;
  onRetake: () => void;
  onSent: (report: MyReport) => void;
}) {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState(draft.description);
  const [focused, setFocused] = useState(false);
  const [mismatch, setMismatch] = useState(false);
  const [sending, setSending] = useState(false);
  const edited = text.trim() !== draft.description.trim();

  async function send() {
    setSending(true);
    // Loose check, only when the user changed the AI's words.
    if (edited && !(await descriptionMatches(photo.base64, text))) {
      setMismatch(true);
      setSending(false);
      return;
    }
    const info = topicInfo(draft.topic);
    const now = Date.now();
    // Mocked: Plan.md says demo reports are not sent to the real 311 queue.
    const report = await addMyReport({
      topic: draft.topic,
      title: draft.title,
      description: text.trim(),
      aiDraft: draft.description,
      urgency: draft.urgency,
      address: photo.address,
      latitude: photo.latitude,
      longitude: photo.longitude,
      photoUri: photo.stored,
      status: 'submitted',
      department: info.department,
      updates: [
        { who: 'You', kind: 'you', text: 'Submitted with a photo.', at: now },
        { who: 'Boston 311', kind: 'city', text: `Received. Sent to ${info.department}.`, at: now + 60_000 },
      ],
    });
    onSent(report);
  }

  return (
    <SafeAreaView style={styles.light} edges={['top']}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <BackLink label="Retake" onPress={onRetake} />
        <ScrollView contentContainerStyle={styles.reviewContent} keyboardShouldPersistTaps="handled">
          <View style={styles.heading}>
            <Txt variant="display">Here’s what we’ll send</Txt>
            <Txt variant="body" style={styles.slate}>
              We wrote this from your photo. Change anything.
            </Txt>
          </View>
          <View>
            <Image source={{ uri: photo.uri }} style={styles.reviewPhoto} contentFit="cover" />
            <View style={styles.chips}>
              <Chip>
                <Svg width={11} height={14} viewBox="0 0 12 14">
                  <Path d="M6 13.5S1 9 1 5.2a5 5 0 0110 0C11 9 6 13.5 6 13.5z" fill={color.primary} />
                  <Path d="M6 7a1.8 1.8 0 100-3.6A1.8 1.8 0 006 7z" fill="#FFFFFF" />
                </Svg>
                <Txt variant="badge" style={styles.chipLabel} numberOfLines={1}>
                  {photo.address}
                </Txt>
              </Chip>
              <Chip>
                <Icon name="lock" size={15} />
                <Txt variant="badge" style={styles.chipLabel}>
                  Anonymous
                </Txt>
              </Chip>
            </View>
          </View>
          <View>
            <View style={styles.titleRow}>
              <Txt variant="hero" style={styles.shrink} numberOfLines={2}>
                {draft.title}
              </Txt>
              <Badge label="AI draft" bg={color.status.submitted.bg} fg={color.status.submitted.fg} />
              {mismatch && (
                <View style={styles.resetLink}>
                  <TextLink
                    label="Reset to AI draft"
                    onPress={() => {
                      setText(draft.description);
                      setMismatch(false);
                    }}
                  />
                </View>
              )}
            </View>
            <Txt variant="secondary" style={styles.category}>
              {draft.topic}
            </Txt>
          </View>
          <View style={[styles.field, focused && styles.fieldFocused, mismatch && styles.fieldMismatch]}>
            <TextInput
              value={text}
              onChangeText={(value) => {
                setText(value);
                setMismatch(false);
              }}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              multiline
              maxLength={400}
              style={styles.fieldInput}
              placeholder="What’s wrong, and where exactly?"
              placeholderTextColor={color.mute}
              selectionColor={color.primary}
            />
            {!mismatch && (
              <Txt variant="meta" style={styles.fieldTip}>
                Tip: add when it’s worst or who it affects
              </Txt>
            )}
          </View>
          {mismatch && (
            <View style={styles.mismatch}>
              <Bang background={color.brick} small />
              <View style={styles.flex}>
                <Txt variant="badge" style={[styles.mismatchTitle, { color: color.status.notApproved.fg }]}>
                  Hmm, this doesn’t match your photo.
                </Txt>
                <Txt variant="secondary" style={{ color: color.status.notApproved.fg }}>
                  Tell us about the problem you snapped.
                </Txt>
              </View>
            </View>
          )}
        </ScrollView>
        {/* Input screens: main button pinned at the bottom. */}
        <View style={[styles.pinned, { paddingBottom: insets.bottom + 16 }]}>
          <Button
            label={sending ? 'Sending…' : 'Send to 311'}
            onPress={send}
            disabled={sending || text.trim().length === 0}
            leading={sending ? <ActivityIndicator color="#FFFFFF" /> : undefined}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── 4. On its way to 311! ─────────────────────────────────────────────────────────

function Sent({ report, onView, onBack }: { report: MyReport; onView: () => void; onBack: () => void }) {
  const photo = photoSource(report.photoUri);
  return (
    <SafeAreaView style={styles.light} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.sentContent}>
        <PaulDelivers height={190} />
        <View style={styles.sentHead}>
          <Txt variant="display" style={[styles.center, styles.sentTitle]}>
            On its way to 311!
          </Txt>
          <Txt variant="body" style={[styles.center, styles.slate]}>
            Routed to {report.department}
          </Txt>
        </View>
        <View style={[styles.card, styles.sentCard]}>
          <View style={styles.caseRow}>
            {photo ? (
              <Image source={{ uri: photo }} style={styles.thumb} contentFit="cover" />
            ) : (
              <IconTile icon={topicInfo(report.topic).icon} size={56} />
            )}
            <View style={styles.flex}>
              <Txt variant="rowLead" style={styles.sentCardTitle}>
                {report.title}
              </Txt>
              <Txt variant="secondary">Report #{report.number}</Txt>
            </View>
          </View>
          <Txt variant="body">{report.description}</Txt>
        </View>
        <View style={styles.leafCard}>
          <Icon name="leafy" size={30} />
          <View style={styles.flex}>
            <Txt variant="rowLead" style={{ color: color.leaf.dark }}>
              Tea leaves are on the way
            </Txt>
            <Txt variant="secondary" style={{ color: color.leaf.dark }}>
              You’ll get them when the city approves it.
            </Txt>
          </View>
        </View>
        <Button label="View report" onPress={onView} style={styles.sentButton} />
        <TextLink label="Back to map" onPress={onBack} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Small pieces ──────────────────────────────────────────────────────────────────

function BackLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.backLink} hitSlop={10}>
      <Svg width={11} height={18} viewBox="0 0 10 16">
        <Path d="M8 2L2 8l6 6" stroke={color.ink} strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
      <Txt variant="body" style={styles.backLabel}>
        {label}
      </Txt>
    </Pressable>
  );
}

function Chip({ children }: { children: ReactNode }) {
  return <View style={styles.chip}>{children}</View>;
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  shrink: {
    flexShrink: 1,
  },
  center: {
    textAlign: 'center',
  },
  white: {
    color: '#FFFFFF',
  },
  whiteSoft: {
    color: 'rgba(255,255,255,0.75)',
  },
  slate: {
    color: color.slate,
  },
  mute: {
    color: color.mute,
  },
  dark: {
    flex: 1,
    backgroundColor: '#11161D',
  },
  light: {
    flex: 1,
    backgroundColor: color.bg,
  },
  heading: {
    gap: 4,
  },
  card: {
    backgroundColor: color.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: color.border,
    padding: space.cardPadding,
    gap: 12,
  },

  // Intro sheet
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(30,42,58,0.35)',
  },
  sheet: {
    backgroundColor: color.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: space.gutter,
    paddingTop: 10,
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#DCD3C2',
  },
  sheetClose: {
    alignItems: 'flex-end',
    marginTop: 4,
    marginBottom: 4,
  },
  introSteps: {
    marginTop: 22,
    marginBottom: 28,
  },
  introStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  introTitle: {
    fontSize: 16,
  },
  introLine: {
    width: 0,
    height: 24,
    marginLeft: 23,
    marginVertical: 4,
    borderLeftWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#E3D8C3',
  },
  caption: {
    marginTop: 14,
    marginBottom: 10,
  },

  // Camera off + error
  topLeft: {
    paddingHorizontal: space.gutter,
    paddingTop: 12,
  },
  topLeftAbsolute: {
    position: 'absolute',
    left: space.gutter,
  },
  topRight: {
    alignItems: 'flex-end',
    paddingHorizontal: space.gutter,
    paddingTop: 12,
  },
  centerGroup: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: space.gutter,
  },
  errorGroup: {
    gap: 8,
    paddingBottom: 120,
  },
  errorTitle: {
    marginTop: 16,
  },
  errorButton: {
    alignSelf: 'stretch',
    marginTop: 28,
  },
  mutedCamera: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.6,
    marginBottom: 8,
  },
  settingsButton: {
    marginTop: 16,
    paddingHorizontal: 40,
  },

  // Camera
  preview: {
    flex: 1,
    overflow: 'hidden',
  },
  cameraTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.gutter,
    gap: 12,
  },
  locationChip: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(17,22,29,0.6)',
  },
  chipText: {
    fontSize: 14,
  },
  roundGlass: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  torchOn: {
    backgroundColor: '#FFFFFF',
  },
  frame: {
    position: 'absolute',
    left: '11%',
    right: '11%',
    top: '30%',
    bottom: '27%',
  },
  corner: {
    position: 'absolute',
  },
  hint: {
    position: 'absolute',
    top: '77%',
    alignSelf: 'center',
    paddingHorizontal: 16,
    height: 36,
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(17,22,29,0.55)',
  },
  hintProblem: {
    backgroundColor: 'rgba(156,63,47,0.9)',
  },
  hintText: {
    fontSize: 14,
  },
  shutterBar: {
    height: 174,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#11161D',
  },
  shutterRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutter: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#FFFFFF',
  },
  shutterPressed: {
    transform: [{ scale: 0.9 }],
    opacity: 0.8,
  },

  // Checking
  dim: {
    backgroundColor: 'rgba(17,22,29,0.4)',
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#B5ECE6',
    shadowColor: '#9FE0DA',
    shadowOpacity: 0.9,
    shadowRadius: 14,
  },
  checkCard: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: color.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 4,
    paddingHorizontal: space.gutter,
    alignItems: 'center',
    gap: 4,
  },
  checkTitle: {
    fontSize: 22,
    lineHeight: 28,
    marginTop: 12,
  },

  // Result screens
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    alignSelf: 'flex-start',
    paddingHorizontal: space.gutter,
    paddingVertical: 12,
  },
  backLabel: {
    fontSize: 17,
    lineHeight: 22,
  },
  resultGroup: {
    paddingHorizontal: space.gutter,
    paddingTop: 20,
    paddingBottom: 40,
    gap: 16,
  },
  resultPhoto: {
    height: 200,
    borderRadius: radius.card,
    backgroundColor: color.tile,
  },
  photoFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    backgroundColor: 'rgba(252,251,248,0.35)',
  },
  resultButton: {
    marginTop: 12,
  },
  notice: {
    borderRadius: radius.card,
    borderWidth: 1,
    padding: space.cardPadding,
  },
  noticeHead: {
    flexDirection: 'row',
    gap: 12,
  },
  bang: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  bangSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 0,
    marginTop: 0,
  },
  bangText: {
    fontFamily: font.bodyBold,
    fontSize: 14,
  },
  noticeDivider: {
    height: 1,
    marginVertical: 14,
  },
  caseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },

  // Review
  reviewContent: {
    paddingHorizontal: space.gutter,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 18,
  },
  reviewPhoto: {
    height: 190,
    borderRadius: radius.card,
    backgroundColor: color.tile,
  },
  chips: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  chipLabel: {
    fontSize: 13.5,
    flexShrink: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  resetLink: {
    marginLeft: 'auto',
  },
  category: {
    marginTop: 2,
  },
  field: {
    minHeight: 132,
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderColor: color.border,
    backgroundColor: color.surface,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
  },
  fieldFocused: {
    borderColor: color.primary,
  },
  fieldMismatch: {
    borderColor: color.brick,
  },
  fieldInput: {
    minHeight: 88,
    fontFamily: font.body,
    fontSize: 16,
    lineHeight: 22,
    color: color.ink,
    textAlignVertical: 'top',
    padding: 0,
  },
  fieldTip: {
    textAlign: 'right',
    marginTop: 8,
  },
  mismatch: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: color.badge.urgent.bg,
  },
  mismatchTitle: {
    fontFamily: font.bodyBold,
    fontSize: 14,
  },
  pinned: {
    paddingHorizontal: space.gutter,
    paddingTop: 12,
    backgroundColor: color.bg,
  },

  // Sent
  sentContent: {
    paddingHorizontal: space.gutter,
    paddingBottom: 32,
  },
  sentHead: {
    gap: 4,
    marginBottom: 24,
  },
  sentTitle: {
    fontSize: 28,
    lineHeight: 34,
  },
  sentCard: {
    gap: 14,
    marginBottom: 12,
  },
  sentCardTitle: {
    fontSize: 16,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: radius.tile,
    backgroundColor: color.tile,
  },
  leafCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: color.leaf.tint,
  },
  sentButton: {
    marginTop: 40,
    marginBottom: 14,
  },
});
