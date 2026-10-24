import { CameraView, useCameraPermissions } from 'expo-camera';
import { File, Paths } from 'expo-file-system';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import Storage from 'expo-sqlite/kv-store';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { ago } from '@/components/report/format';
import { CloseButton } from '@/components/report/quick-look';
import { PaulDelivers, PaulInspecting } from '@/components/report/revere';
import { topicInfo } from '@/constants/report-topics';
import { findNearbyOpenCases, type NearbyCase } from '@/lib/boston-311';
import { addMyReport, isFollowing, statusFrom311, type MyReport } from '@/lib/my-reports';
import { analyzePhoto, descriptionMatches, type AnalyzeResult } from '@/lib/report-check';
import { Badge, Button, IconTile, StatusBadge, TextLink } from '@/ui/components';
import { Icon } from '@/ui/icon';
import { Txt } from '@/ui/text';
import { color, font, radius, space, t } from '@/ui/theme';

const INTRO_KEY = 'reportIntroSeen';

type Photo = { uri: string; base64: string; latitude: number; longitude: number; address: string };

type Step =
  | { kind: 'loading' }
  | { kind: 'intro' }
  | { kind: 'cameraOff' }
  | { kind: 'camera' }
  | { kind: 'checking'; photo: Photo }
  | { kind: 'unclear'; photo: Photo; reason: string; tip: string }
  | { kind: 'notCity'; photo: Photo; reason: string }
  | { kind: 'error'; photo: Photo }
  | { kind: 'duplicate'; photo: Photo; draft: AnalyzeResult; match: NearbyCase; following: boolean }
  | { kind: 'review'; photo: Photo; draft: AnalyzeResult }
  | { kind: 'sent'; report: MyReport };

/** Report an issue, flow v2 (DESIGN.md 6d / design/flows/submit-flow.png). */
export default function NewReportScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [step, setStep] = useState<Step>({ kind: 'loading' });

  // First time: the intro sheet. After that, straight to the camera (or "camera is off").
  useEffect(() => {
    if (!permission || step.kind !== 'loading') return;
    Storage.getItem(INTRO_KEY).then((seen) => {
      if (permission.granted) setStep({ kind: 'camera' });
      else if (!seen || permission.canAskAgain) setStep({ kind: 'intro' });
      else setStep({ kind: 'cameraOff' });
    });
  }, [permission, step.kind]);

  async function allowCamera() {
    await Storage.setItem(INTRO_KEY, '1');
    const result = await requestPermission();
    setStep(result.granted ? { kind: 'camera' } : { kind: 'cameraOff' });
  }

  async function check(photo: Photo) {
    setStep({ kind: 'checking', photo });
    try {
      const draft = await analyzePhoto(photo.base64, t.motion.photoCheck.timeoutMs);
      if (draft.verdict === 'unclear') return setStep({ kind: 'unclear', photo, reason: draft.reason, tip: draft.tip });
      if (draft.verdict === 'not_city_issue') return setStep({ kind: 'notCity', photo, reason: draft.reason });

      // Already in 311 nearby? Offer "Me too" instead of a duplicate ticket.
      const nearby = await findNearbyOpenCases(photo.latitude, photo.longitude, draft.topic).catch(() => []);
      if (nearby.length > 0) {
        const match = nearby[0];
        return setStep({ kind: 'duplicate', photo, draft, match, following: await isFollowing(match.case_id) });
      }
      setStep({ kind: 'review', photo, draft });
    } catch {
      setStep({ kind: 'error', photo });
    }
  }

  const close = () => router.back();
  const openReport = (id: string) => router.replace({ pathname: '/report/[id]', params: { id } });

  switch (step.kind) {
    case 'loading':
      return <View style={styles.dark} />;
    case 'intro':
      return <Intro onAllow={allowCamera} onClose={close} />;
    case 'cameraOff':
      return <CameraOff onClose={close} />;
    case 'camera':
      return <Camera onClose={close} onCapture={check} />;
    case 'checking':
      return <Checking photo={step.photo} />;
    case 'unclear':
      return <Unclear {...step} onRetake={() => setStep({ kind: 'camera' })} onBack={close} />;
    case 'notCity':
      return <NotCity {...step} onBack={close} />;
    case 'error':
      return <CheckError onRetry={() => check(step.photo)} onRetake={() => setStep({ kind: 'camera' })} onClose={close} />;
    case 'duplicate':
      return (
        <Duplicate
          {...step}
          onRetake={() => setStep({ kind: 'camera' })}
          onDifferent={() => setStep({ kind: 'review', photo: step.photo, draft: step.draft })}
          onFollowed={openReport}
        />
      );
    case 'review':
      return <Review {...step} onRetake={() => setStep({ kind: 'camera' })} onSent={(report) => setStep({ kind: 'sent', report })} />;
    case 'sent':
      return <Sent report={step.report} onView={() => openReport(step.report.id)} onBack={close} />;
  }
}

// ── 0. First time only ────────────────────────────────────────────────────────────

function Intro({ onAllow, onClose }: { onAllow: () => void; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const steps = [
    { icon: 'camera', title: 'Snap the problem', body: 'We check the photo in a few seconds.' },
    { icon: 'notes', title: 'Check what we wrote', body: 'AI drafts the report. Edit anything.' },
    { icon: 'shield', title: 'Send it to 311', body: 'We route it to the right department.' },
  ] as const;
  return (
    <View style={styles.backdrop}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.grabber} />
        <View style={styles.sheetHeader}>
          <View style={styles.flex}>
            <Txt variant="title">Report in 3 quick steps</Txt>
            <Txt variant="secondary">About a minute, start to finish.</Txt>
          </View>
          <CloseButton onPress={onClose} />
        </View>
        <View style={styles.introSteps}>
          {steps.map((s, i) => (
            <View key={s.title} style={styles.introStep}>
              <View style={styles.introRail}>
                <IconTile icon={s.icon} />
                {i < steps.length - 1 && <View style={styles.introLine} />}
              </View>
              <View style={styles.introText}>
                <Txt variant="rowLead">{s.title}</Txt>
                <Txt variant="secondary">{s.body}</Txt>
              </View>
            </View>
          ))}
        </View>
        <Button label="Allow camera access" onPress={onAllow} />
        <Txt variant="meta" style={styles.center}>
          Only used when you take a report photo.
        </Txt>
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

function Camera({ onClose, onCapture }: { onClose: () => void; onCapture: (photo: Photo) => void }) {
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [torch, setTorch] = useState(false);
  const [place, setPlace] = useState<{ latitude: number; longitude: number; address: string } | null>(null);

  // Location comes from the device at the moment of reporting; resolve it while framing.
  useEffect(() => {
    let active = true;
    (async () => {
      const { granted } = await Location.requestForegroundPermissionsAsync();
      if (!granted) return;
      const { coords } = await Location.getCurrentPositionAsync();
      const [geo] = await Location.reverseGeocodeAsync(coords).catch(() => []);
      const address = geo?.street ?? geo?.name ?? geo?.district ?? 'Your location';
      if (active) setPlace({ latitude: coords.latitude, longitude: coords.longitude, address });
    })();
    return () => {
      active = false;
    };
  }, []);

  async function capture() {
    if (!cameraRef.current || busy) return;
    setBusy(true);
    try {
      const shot = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.4 });
      if (!shot?.base64) throw new Error('No photo');
      // Camera files are temporary; keep a copy for the pin and the report page.
      const saved = new File(Paths.document, `report-${Date.now()}.jpg`);
      new File(shot.uri).copy(saved);
      let where = place;
      if (!where) {
        const { coords } = await Location.getCurrentPositionAsync();
        where = { latitude: coords.latitude, longitude: coords.longitude, address: 'Your location' };
      }
      onCapture({ uri: saved.uri, base64: shot.base64, ...where });
    } catch {
      setBusy(false);
    }
  }

  return (
    <View style={styles.dark}>
      <StatusBar style="light" />
      <View style={styles.preview}>
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} onCameraReady={() => setReady(true)} enableTorch={torch} />
        <View style={[styles.cameraTop, { paddingTop: insets.top + 8 }]}>
          <CloseButton onPress={onClose} light />
          <View style={styles.locationChip}>
            <Svg width={12} height={14} viewBox="0 0 12 14">
              <Path d="M6 13.5S1 9 1 5.2a5 5 0 0110 0C11 9 6 13.5 6 13.5z" fill="#FFFFFF" />
              <Circle cx="6" cy="5.2" r="1.8" fill="#1E2A3A" />
            </Svg>
            <Txt variant="badge" style={styles.white} numberOfLines={1}>
              {place?.address ?? 'Finding you…'}
            </Txt>
          </View>
          <Pressable onPress={() => setTorch((v) => !v)} style={[styles.roundGlass, torch && styles.torchOn]} hitSlop={8}>
            <Svg width={14} height={16} viewBox="0 0 14 16">
              <Path d="M8 1L2 9h4.5L5.5 15 12 6.5H7.5L8 1z" fill={torch ? color.ink : '#FFFFFF'} />
            </Svg>
          </Pressable>
        </View>
        <FrameCorners />
        <View style={styles.hint}>
          <Txt variant="badge" style={styles.white}>
            Fit the whole problem in the frame
          </Txt>
        </View>
      </View>
      <View style={[styles.shutterBar, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable onPress={capture} disabled={!ready || busy} style={styles.shutterRing} accessibilityLabel="Take photo">
          {({ pressed }) => <View style={[styles.shutter, (pressed || busy) && styles.shutterPressed]} />}
        </Pressable>
      </View>
    </View>
  );
}

function FrameCorners() {
  const corner = (rotate: string, pos: object) => (
    <Svg width={34} height={34} viewBox="0 0 34 34" style={[styles.corner, pos, { transform: [{ rotate }] }]}>
      <Path d="M2 32V8a6 6 0 016-6h24" stroke="#FFFFFF" strokeWidth={3.5} fill="none" strokeLinecap="round" />
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

function Checking({ photo }: { photo: Photo }) {
  const insets = useSafeAreaInsets();
  const [slow, setSlow] = useState(false);
  const scan = useSharedValue(0);
  useEffect(() => {
    scan.value = withRepeat(withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.quad) }), -1, true);
    const timer = setTimeout(() => setSlow(true), t.motion.photoCheck.stillLookingAfterMs);
    return () => clearTimeout(timer);
  }, [scan]);
  const scanStyle = useAnimatedStyle(() => ({ top: `${10 + scan.value * 70}%` }));

  return (
    <View style={styles.dark}>
      <StatusBar style="light" />
      <Image source={{ uri: photo.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
      <View style={[StyleSheet.absoluteFill, styles.dim]} />
      <Animated.View style={[styles.scanLine, scanStyle]} />
      <View style={[styles.checkCard, { paddingBottom: insets.bottom + 28 }]}>
        <PaulInspecting width={190} />
        <Txt variant="hero" style={styles.center}>
          {slow ? 'Still looking…' : 'Paul’s inspecting your photo…'}
        </Txt>
        <Txt variant="secondary" style={styles.center}>
          Just a few seconds
        </Txt>
      </View>
    </View>
  );
}

// ── 2b / 2d / 2c: results that didn't go through ─────────────────────────────────

function ResultScreen({ back, onBack, children }: { back: string; onBack: () => void; children: ReactNode }) {
  return (
    <SafeAreaView style={styles.light}>
      <StatusBar style="dark" />
      <BackLink label={back} onPress={onBack} />
      {/* Result screens: content and button as one centered group, no dead space. */}
      <ScrollView contentContainerStyle={styles.resultGroup}>{children}</ScrollView>
    </SafeAreaView>
  );
}

function Unclear({ photo, reason, tip, onRetake, onBack }: { photo: Photo; reason: string; tip: string; onRetake: () => void; onBack: () => void }) {
  return (
    <ResultScreen back="Map" onBack={onBack}>
      <Image source={{ uri: photo.uri }} style={styles.resultPhoto} contentFit="cover" />
      <NoticeCard tone="gold" title="Let’s try that again" subtitle="Nothing was sent." body={[reason, tip].filter(Boolean).join(' ')} />
      <Txt variant="meta">Emergency? Call 911 instead.</Txt>
      <Button label="Retake photo" onPress={onRetake} />
    </ResultScreen>
  );
}

function NotCity({ photo, reason, onBack }: { photo: Photo; reason: string; onBack: () => void }) {
  return (
    <ResultScreen back="Map" onBack={onBack}>
      <Image source={{ uri: photo.uri }} style={styles.resultPhoto} contentFit="cover" />
      <NoticeCard tone="brick" title="We can’t send this one" subtitle="Nothing was sent. No points lost." body={reason} />
      <Txt variant="meta">Think it’s public? Try a photo that shows the street.</Txt>
      <Button label="Back to map" onPress={onBack} />
    </ResultScreen>
  );
}

function CheckError({ onRetry, onRetake, onClose }: { onRetry: () => void; onRetake: () => void; onClose: () => void }) {
  return (
    <SafeAreaView style={styles.light}>
      <StatusBar style="dark" />
      <View style={styles.topRight}>
        <CloseButton onPress={onClose} />
      </View>
      <View style={styles.centerGroup}>
        <PaulInspecting width={200} />
        <Txt variant="title" style={styles.center}>
          Hmm, Paul couldn’t see it
        </Txt>
        <Txt variant="secondary" style={styles.center}>
          Something went wrong checking your photo. It might be your connection. Your photo is saved.
        </Txt>
        <Button label="Try again" onPress={onRetry} style={styles.stretch} />
        <TextLink label="Retake photo" onPress={onRetake} />
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
        <View style={[styles.bang, { backgroundColor: palette.dot }]}>
          <Txt variant="badge" style={styles.white}>
            !
          </Txt>
        </View>
        <View style={styles.flex}>
          <Txt variant="section" style={{ color: palette.fg }}>
            {title}
          </Txt>
          <Txt variant="secondary">{subtitle}</Txt>
        </View>
      </View>
      <View style={[styles.noticeDivider, { backgroundColor: palette.border }]} />
      <Txt variant="row" style={styles.noticeBody}>
        {body}
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
  onDifferent,
  onFollowed,
}: {
  photo: Photo;
  draft: AnalyzeResult;
  match: NearbyCase;
  following: boolean;
  onRetake: () => void;
  onDifferent: () => void;
  onFollowed: (id: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const opened = Date.parse(match.open_date.replace(' ', 'T').replace('+00', 'Z'));

  async function meToo() {
    setSaving(true);
    const info = topicInfo(match.case_topic);
    const report = await addMyReport({
      topic: match.case_topic,
      title: draft.title,
      description: draft.description,
      aiDraft: draft.description,
      urgency: draft.urgency,
      address: match.full_address.split(',')[0],
      latitude: photo.latitude,
      longitude: photo.longitude,
      photoUri: photo.uri,
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
    <SafeAreaView style={styles.light}>
      <StatusBar style="dark" />
      <BackLink label="Retake" onPress={onRetake} />
      <ScrollView contentContainerStyle={styles.resultGroup}>
        <View>
          <Txt variant="display">Someone beat you to it</Txt>
          <Txt variant="secondary">This is already with 311. Add your voice instead of filing it twice.</Txt>
        </View>
        <View style={styles.caseCard}>
          <View style={styles.caseRow}>
            <IconTile icon={topicInfo(match.case_topic).icon} />
            <View style={styles.flex}>
              <Txt variant="rowLead">{match.case_topic}</Txt>
              <Txt variant="secondary" numberOfLines={1}>
                {match.full_address.split(',')[0]} · {ago(opened)}
              </Txt>
            </View>
            <StatusBadge status={statusFrom311(match.case_status)} />
          </View>
          <Txt variant="meta">With {match.assigned_team}</Txt>
        </View>
        {following ? (
          <>
            <Txt variant="secondary">You’re already following this report.</Txt>
            <Button label="Back to map" onPress={() => router.back()} />
          </>
        ) : (
          <>
            <Button label={saving ? 'Adding…' : 'Me too'} onPress={meToo} disabled={saving} />
            <TextLink label="It’s a different issue" onPress={onDifferent} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
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
      photoUri: photo.uri,
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
      <KeyboardAvoidingView behavior="padding" style={styles.flex}>
        <BackLink label="Retake" onPress={onRetake} />
        <ScrollView contentContainerStyle={styles.reviewContent} keyboardShouldPersistTaps="handled">
          <View>
            <Txt variant="display">Here’s what we’ll send</Txt>
            <Txt variant="secondary">We wrote this from your photo. Change anything.</Txt>
          </View>
          <View>
            <Image source={{ uri: photo.uri }} style={styles.reviewPhoto} contentFit="cover" />
            <View style={styles.chips}>
              <Chip>
                <Svg width={10} height={12} viewBox="0 0 12 14">
                  <Path d="M6 13.5S1 9 1 5.2a5 5 0 0110 0C11 9 6 13.5 6 13.5z" fill={color.primary} />
                </Svg>
                <Txt variant="badge">{photo.address}</Txt>
              </Chip>
              <Chip>
                <Icon name="lock" size={13} />
                <Txt variant="badge">Anonymous</Txt>
              </Chip>
            </View>
          </View>
          <View>
            <View style={styles.titleRow}>
              <Txt variant="hero">{draft.title}</Txt>
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
            <Txt variant="secondary">{draft.topic}</Txt>
          </View>
          <View
            style={[
              styles.field,
              focused && styles.fieldFocused,
              mismatch && styles.fieldMismatch,
            ]}>
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
            />
            <Txt variant="meta" style={styles.fieldTip}>
              Tip: add when it’s worst or who it affects
            </Txt>
          </View>
          {mismatch && (
            <View style={styles.mismatch}>
              <View style={[styles.bang, styles.bangSmall, { backgroundColor: color.brick }]}>
                <Txt variant="meta" style={styles.white}>
                  !
                </Txt>
              </View>
              <View style={styles.flex}>
                <Txt variant="badge" style={{ color: color.status.notApproved.fg }}>
                  Hmm, this doesn’t match your photo.
                </Txt>
                <Txt variant="meta" style={{ color: color.status.notApproved.fg }}>
                  Tell us about the problem you snapped.
                </Txt>
              </View>
            </View>
          )}
        </ScrollView>
        {/* Input screens: main button pinned at the bottom. */}
        <View style={[styles.pinned, { paddingBottom: insets.bottom + 12 }]}>
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
  return (
    <SafeAreaView style={styles.light}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.sentContent}>
        <PaulDelivers height={190} />
        <View style={styles.sentHead}>
          <Txt variant="title" style={styles.center}>
            On its way to 311!
          </Txt>
          <Txt variant="secondary" style={styles.center}>
            Routed to {report.department}
          </Txt>
        </View>
        <View style={styles.sentCard}>
          <View style={styles.caseRow}>
            {report.photoUri ? (
              <Image source={{ uri: report.photoUri }} style={styles.thumb} contentFit="cover" />
            ) : (
              <IconTile icon={topicInfo(report.topic).icon} />
            )}
            <View style={styles.flex}>
              <Txt variant="rowLead">{report.title}</Txt>
              <Txt variant="meta">Report #{report.number}</Txt>
            </View>
          </View>
          <Txt variant="row" style={styles.sentBody}>
            {report.description}
          </Txt>
        </View>
        <View style={styles.leafCard}>
          <Icon name="leafy" size={26} />
          <View style={styles.flex}>
            <Txt variant="badge" style={{ color: color.leaf.dark }}>
              Tea leaves are on the way
            </Txt>
            <Txt variant="meta" style={{ color: color.leaf.dark }}>
              You’ll get them when the city approves it.
            </Txt>
          </View>
        </View>
        <Button label="View report" onPress={onView} />
        <TextLink label="Back to map" onPress={onBack} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Small pieces ──────────────────────────────────────────────────────────────────

function BackLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.backLink} hitSlop={10}>
      <Svg width={10} height={16} viewBox="0 0 10 16">
        <Path d="M8 2L2 8l6 6" stroke={color.ink} strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
      <Txt variant="body">{label}</Txt>
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
  center: {
    textAlign: 'center',
  },
  stretch: {
    alignSelf: 'stretch',
  },
  white: {
    color: '#FFFFFF',
  },
  whiteSoft: {
    color: 'rgba(255,255,255,0.75)',
  },
  dark: {
    flex: 1,
    backgroundColor: '#11161D',
  },
  light: {
    flex: 1,
    backgroundColor: color.bg,
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
    gap: 16,
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#DCD3C2',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  introSteps: {
    marginVertical: 4,
  },
  introStep: {
    flexDirection: 'row',
    gap: 14,
  },
  introRail: {
    alignItems: 'center',
  },
  introLine: {
    width: 1.5,
    height: 14,
    marginVertical: 3,
    backgroundColor: color.border,
  },
  introText: {
    flex: 1,
    paddingTop: 3,
  },

  // Camera off + error
  topLeft: {
    paddingHorizontal: space.gutter,
    paddingTop: 8,
  },
  topRight: {
    alignItems: 'flex-end',
    paddingHorizontal: space.gutter,
    paddingTop: 8,
  },
  centerGroup: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 32,
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
    marginTop: 12,
    alignSelf: 'stretch',
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
    gap: 6,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(17,22,29,0.6)',
  },
  roundGlass: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  torchOn: {
    backgroundColor: '#FFFFFF',
  },
  frame: {
    position: 'absolute',
    left: '10%',
    right: '10%',
    top: '22%',
    bottom: '22%',
  },
  corner: {
    position: 'absolute',
  },
  hint: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    paddingHorizontal: 14,
    height: 30,
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: 'rgba(17,22,29,0.55)',
  },
  shutterBar: {
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#11161D',
  },
  shutterRing: {
    width: 78,
    height: 78,
    borderRadius: 39,
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
    backgroundColor: 'rgba(17,22,29,0.45)',
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#9FE0DA',
    shadowColor: '#9FE0DA',
    shadowOpacity: 0.9,
    shadowRadius: 12,
  },
  checkCard: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: color.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 24,
    paddingHorizontal: space.gutter,
    alignItems: 'center',
    gap: 6,
  },

  // Result screens
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: space.gutter,
    paddingVertical: 10,
  },
  resultGroup: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: space.gutter,
    paddingBottom: 40,
    gap: 16,
  },
  resultPhoto: {
    height: 200,
    borderRadius: radius.card,
    backgroundColor: color.tile,
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
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  bangSmall: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  noticeDivider: {
    height: 1,
    marginVertical: 14,
  },
  noticeBody: {
    fontSize: 15,
    lineHeight: 21,
  },

  // Duplicate
  caseCard: {
    backgroundColor: color.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: color.border,
    padding: space.cardPadding,
    gap: 10,
  },
  caseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },

  // Review
  reviewContent: {
    paddingHorizontal: space.gutter,
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
    left: 12,
    bottom: 12,
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.94)',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  resetLink: {
    marginLeft: 'auto',
  },
  field: {
    minHeight: 130,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: color.border,
    backgroundColor: color.surface,
    padding: 14,
  },
  fieldFocused: {
    borderColor: color.primary,
  },
  fieldMismatch: {
    borderColor: color.brick,
  },
  fieldInput: {
    flex: 1,
    fontFamily: font.body,
    fontSize: 15,
    lineHeight: 21,
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
    gap: 10,
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    backgroundColor: color.badge.urgent.bg,
  },
  pinned: {
    paddingHorizontal: space.gutter,
    paddingTop: 10,
    backgroundColor: color.bg,
  },

  // Sent
  sentContent: {
    paddingHorizontal: space.gutter,
    paddingBottom: 40,
    gap: 16,
  },
  sentHead: {
    gap: 2,
    marginTop: -6,
  },
  sentCard: {
    backgroundColor: color.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: color.border,
    padding: space.cardPadding,
    gap: 12,
  },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: radius.tile,
  },
  sentBody: {
    color: color.slate,
  },
  leafCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: color.leaf.tint,
  },
});
