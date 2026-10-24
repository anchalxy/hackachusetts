import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, TextInput, View } from 'react-native';

import { Caption, Group, InnerPage } from '@/components/menu/menu-ui';
import { getProfile, saveProfile, SEED_PROFILE, validateAge } from '@/lib/profile';
import { Button } from '@/ui/components';
import { Txt } from '@/ui/text';
import { font, makeStyles, useColors } from '@/ui/theme';

export default function AgePage() {
  const styles = useStyles();
  const color = useColors();
  const [saved, setSaved] = useState(SEED_PROFILE.age);
  const [text, setText] = useState(String(SEED_PROFILE.age));
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getProfile().then((p) => {
        setSaved(p.age);
        setText(String(p.age));
      });
    }, []),
  );

  const error = validateAge(text);
  const changed = text.trim() !== String(saved);

  const save = async () => {
    setTouched(true);
    if (error || !changed || saving) return;
    setSaving(true);
    try {
      // Re-read so this doesn't overwrite a change made elsewhere since the page opened.
      const latest = await getProfile();
      await saveProfile({ ...latest, age: Number(text.trim()) });
      router.back();
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <InnerPage
        icon="idcard"
        title="Age"
        intro={'Some city bounties want to hear\nfrom a certain age group.'}
        footer={<Button label={saving ? 'Saving…' : 'Save'} onPress={save} disabled={!changed || saving} />}>
        <Group style={styles.form}>
          <Txt style={styles.label}>Age</Txt>
          <View style={styles.inputRow}>
            <TextInput
              value={text}
              onChangeText={(v) => setText(v.replace(/[^\d]/g, '').slice(0, 3))}
              onSubmitEditing={save}
              keyboardType="number-pad"
              returnKeyType="done"
              maxLength={3}
              placeholderTextColor={color.mute}
              selectionColor={color.primary}
              style={styles.input}
              accessibilityLabel="Age in years"
              testID="edit-age"
            />
            <Txt style={styles.unit}>years old</Txt>
          </View>
          {touched && error ? <Txt style={styles.error}>{error}</Txt> : null}
        </Group>
        <Caption>Only used to boost your leaves. Never shown to anyone.</Caption>
      </InnerPage>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles((color) => ({
  flex: {
    flex: 1,
    backgroundColor: color.bg,
  },
  form: {
    marginTop: 26,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  label: {
    fontFamily: font.body,
    fontSize: 13,
    lineHeight: 18,
    color: color.slate,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  input: {
    minWidth: 44,
    fontFamily: font.bodySemibold,
    fontSize: 15,
    color: color.ink,
    paddingVertical: 4,
  },
  unit: {
    fontFamily: font.body,
    fontSize: 15,
    color: color.slate,
  },
  error: {
    fontFamily: font.body,
    fontSize: 12.5,
    lineHeight: 17,
    color: color.brick,
    marginTop: 2,
  },
}));
