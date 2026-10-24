import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';

import { Group, InnerPage } from '@/components/menu/menu-ui';
import { getProfile, saveProfile, SEED_PROFILE, validateProfile, type Profile } from '@/lib/profile';
import { Button } from '@/ui/components';
import { Txt } from '@/ui/text';
import { color, font } from '@/ui/theme';

const PHOTO = require('../../../design/assets/avatars/ishaan-photo.jpg');

export default function EditProfilePage() {
  const [profile, setProfile] = useState<Profile>(SEED_PROFILE);
  const [name, setName] = useState(SEED_PROFILE.name);
  const [username, setUsername] = useState(SEED_PROFILE.username);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getProfile().then((p) => {
        setProfile(p);
        setName(p.name);
        setUsername(p.username);
      });
    }, []),
  );

  const errors = validateProfile(name, username);
  const changed = name.trim() !== profile.name || username !== profile.username;

  const save = async () => {
    setTouched(true);
    if (errors || !changed || saving) return;
    setSaving(true);
    // Re-read so we don't overwrite a change made elsewhere (e.g. neighborhood) since this page opened.
    const latest = await getProfile();
    await saveProfile({ ...latest, name: name.trim(), username });
    router.back();
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <InnerPage
        hero={
          <View style={styles.photoFrame}>
            <Image source={PHOTO} style={styles.photo} contentFit="cover" />
          </View>
        }
        title="Edit profile"
        intro={'Your name shows on your profile.\nReports to 311 never include it.'}
        footer={<Button label={saving ? 'Saving…' : 'Save'} onPress={save} disabled={!changed || saving} />}>
        <Group style={styles.form}>
          <Field
            label="Name"
            value={name}
            onChangeText={setName}
            error={touched ? errors?.name : undefined}
            autoComplete="name"
            testID="edit-name"
          />
          <Field
            label="Username"
            prefix="@"
            value={username}
            // Usernames are lowercase; strip spaces as you type.
            onChangeText={(v) => setUsername(v.toLowerCase().replace(/\s/g, ''))}
            error={touched || username.length >= 3 ? errors?.username : undefined}
            autoCapitalize="none"
            autoComplete="username"
            last
            testID="edit-username"
          />
        </Group>
      </InnerPage>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  prefix,
  error,
  last,
  ...input
}: {
  label: string;
  prefix?: string;
  error?: string;
  last?: boolean;
} & React.ComponentProps<typeof TextInput>) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.field, !last && styles.fieldDivider]}>
      <Txt style={[styles.fieldLabel, focused && styles.fieldLabelFocused]}>{label}</Txt>
      <View style={styles.inputRow}>
        {prefix ? <Txt style={styles.prefix}>{prefix}</Txt> : null}
        <TextInput
          {...input}
          autoCorrect={false}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholderTextColor={color.mute}
          selectionColor={color.primary}
          style={styles.input}
          accessibilityLabel={label}
        />
      </View>
      {error ? <Txt style={styles.error}>{error}</Txt> : null}
    </View>
  );
}

const PHOTO_SIZE = 64;

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: color.bg,
  },
  photoFrame: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginTop: 23,
    padding: 4 - 1.2,
    borderWidth: 1.2,
    borderColor: '#E3DBCB',
    backgroundColor: color.surface,
  },
  photo: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: PHOTO_SIZE / 2,
  },
  form: {
    marginTop: 26,
    paddingLeft: 16,
  },
  field: {
    paddingVertical: 12,
    paddingRight: 16,
  },
  fieldDivider: {
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  fieldLabel: {
    fontFamily: font.body,
    fontSize: 13,
    lineHeight: 18,
    color: color.slate,
  },
  fieldLabelFocused: {
    color: color.primary,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  prefix: {
    fontFamily: font.bodySemibold,
    fontSize: 15,
    color: color.mute,
    marginRight: 1,
  },
  input: {
    flex: 1,
    fontFamily: font.bodySemibold,
    fontSize: 15,
    color: color.ink,
    paddingVertical: 4,
  },
  error: {
    fontFamily: font.body,
    fontSize: 12.5,
    lineHeight: 17,
    color: color.brick,
    marginTop: 2,
  },
});
