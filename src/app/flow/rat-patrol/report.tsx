import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { FlowHeader, FlowHeading, FlowScreen, InfoPanel } from '@/components/challenge-flow/flow';
import { FALLBACK_TICKET, isBoston311Ticket } from '@/components/challenge-flow/rat-patrol';
import { Badge, Button } from '@/ui/components';
import { Txt } from '@/ui/text';
import { font, makeStyles, useColors } from '@/ui/theme';

const BOS_311_URL = 'https://www.boston.gov/departments/boston-311';

export default function ReportTo311() {
  const styles = useStyles();
  const color = useColors();
  const params = useLocalSearchParams<{ type: string; photo: string; street: string; neighborhood: string }>();
  const [ticket, setTicket] = useState('');
  const found = isBoston311Ticket(ticket);

  function openBos311() {
    // BOS:311 has no documented URL scheme, so open the city's 311 page in the in-app browser.
    WebBrowser.openBrowserAsync(BOS_311_URL, {
      controlsColor: color.primary,
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
    }).catch(() => {});
  }

  function start() {
    if (!found) return;
    router.push({ pathname: '/flow/rat-patrol/sent', params: { ...params, ticket } });
  }

  return (
    <FlowScreen action={{ label: 'Start my 7-day check', onPress: start, disabled: !found }}>
      <FlowHeader title="Report to 311" step={2} of={2} />
      <FlowHeading
        title="File it with BOS:311"
        subtitle="Use the city’s own app so the ticket is official, then paste the number here."
      />

      <View style={[styles.card, styles.stepRow]}>
        <StepNumber n={1} />
        <View style={styles.stepText}>
          <Txt variant="rowLead">Report “Rodent activity”</Txt>
          <Txt variant="secondary">Attach the same photo</Txt>
        </View>
        <Button label="Open BOS:311" size="sm" onPress={openBos311} />
      </View>

      <View style={styles.card}>
        <View style={styles.stepRow}>
          <StepNumber n={2} />
          <Txt variant="rowLead" style={styles.stepText}>
            Paste your ticket number
          </Txt>
        </View>
        <View style={styles.inputWrap}>
          <TextInput
            value={ticket}
            onChangeText={(text) => setTicket(text.replace(/\D/g, '').slice(0, 12))}
            placeholder={FALLBACK_TICKET}
            placeholderTextColor={color.mute}
            keyboardType="number-pad"
            accessibilityLabel="311 ticket number"
            style={styles.input}
          />
          {found ? (
            <View>
              <Badge label="✓ Ticket found" bg={color.badge.approved.bg} fg={color.badge.approved.fg} />
            </View>
          ) : null}
        </View>
      </View>

      <InfoPanel
        icon="stopwatch"
        title="We’ll time the city’s response"
        body="In 7 days we’ll ask what happened to the spot."
      />
    </FlowScreen>
  );
}

function StepNumber({ n }: { n: number }) {
  const styles = useStyles();
  return (
    <View style={styles.stepNumber}>
      <Txt variant="badge">{n}</Txt>
    </View>
  );
}

const useStyles = makeStyles((color) => ({
  card: {
    padding: 14,
    gap: 14,
    backgroundColor: color.surface,
    borderRadius: 18,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: color.border,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  stepNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: color.tile,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    flex: 1,
    gap: 2,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 48,
    paddingLeft: 12,
    paddingRight: 6,
    borderRadius: 12,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: color.border,
  },
  input: {
    flex: 1,
    height: '100%',
    fontFamily: font.bodySemibold,
    fontSize: 17,
    letterSpacing: 0.6,
    color: color.ink,
    fontVariant: ['tabular-nums'],
  },
}));
