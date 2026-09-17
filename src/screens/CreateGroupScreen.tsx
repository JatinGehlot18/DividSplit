import React, { useRef, useState } from 'react';
import { Alert, Linking, Share, TextInput, TouchableOpacity, View } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { groupsApi } from '../api/endpoints';
import { useAuth } from '../auth/AuthContext';
import { AppText, Avatar, Header, PrimaryButton, Screen, SectionLabel } from '../components/primitives';
import { useNavigation } from '../nav/navigation';
import { useTheme } from '../theme/ThemeContext';

const SWATCHES = ['#7FD8C8', '#F0A58F', '#D8C98A', '#C3AEDD', '#A7C0E8'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function CreateGroupScreen() {
  const { theme } = useTheme();
  const nav = useNavigation();
  const { token } = useAuth();
  const [name, setName] = useState('');
  const [colorIdx, setColorIdx] = useState(0);
  const [invited, setInvited] = useState<string[]>([]);
  const [inviteInput, setInviteInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState(false);
  const groupIdRef = useRef<string | null>(null);

  const initials =
    name
      .split(' ')
      .map(w => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'GR';

  function addInvite() {
    const email = inviteInput.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) {
      Alert.alert('Enter a valid email', 'e.g. flatmate@example.com');
      return;
    }
    if (!invited.includes(email)) setInvited(list => [...list, email]);
    setInviteInput('');
  }

  async function ensureGroup(): Promise<string | null> {
    if (groupIdRef.current) return groupIdRef.current;
    if (!name.trim()) {
      Alert.alert('Name your group', 'Give the group a name first.');
      return null;
    }
    try {
      setSaving(true);
      const { group, failedInvites } = await groupsApi.create(
        { name: name.trim(), color: SWATCHES[colorIdx], invitedEmails: invited },
        token ?? undefined,
      );
      groupIdRef.current = group.id;
      if (failedInvites.length) {
        Alert.alert('Some invites failed', `Could not add: ${failedInvites.join(', ')}`);
      }
      return group.id;
    } catch (e) {
      Alert.alert('Could not create group', e instanceof Error ? e.message : 'Check that the API is running.');
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function create() {
    const id = await ensureGroup();
    if (id) nav.reset('Groups');
  }

  async function withInviteLink(action: (link: string) => void | Promise<void>) {
    const id = await ensureGroup();
    if (!id) return;
    try {
      setSharing(true);
      const invite = await groupsApi.createInviteLink(id, token ?? undefined);
      await action(invite.link);
    } catch (e) {
      Alert.alert('Could not create link', e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setSharing(false);
    }
  }

  function copyLink() {
    withInviteLink(link => {
      Clipboard.setString(link);
      Alert.alert('Invite link copied', 'Anyone with this link can join your group.');
    });
  }

  async function shareWhatsApp() {
    withInviteLink(async link => {
      const message = `Join my group on Splitkaro! ${link}`;
      try {
        await Linking.openURL(`whatsapp://send?text=${encodeURIComponent(message)}`);
      } catch {
        await Share.share({ message });
      }
    });
  }

  return (
    <Screen padded scroll>
      <View style={{ marginTop: 8 }}>
        <Header title="New group" onBack={nav.goBack} />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 22 }}>
        <Avatar initials={initials} bg={SWATCHES[colorIdx]} size={56} radius={18} textSize={18} />
        <View style={{ flex: 1, backgroundColor: theme.surface, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 4 }}>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Group name"
            placeholderTextColor={theme.textFaint}
            style={{ fontWeight: '700', fontSize: 14, color: theme.text, paddingVertical: 12 }}
          />
        </View>
      </View>

      <SectionLabel>Group color</SectionLabel>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
        {SWATCHES.map((c, i) => (
          <TouchableOpacity
            key={c + i}
            onPress={() => setColorIdx(i)}
            style={{
              width: 34,
              height: 34,
              borderRadius: 11,
              backgroundColor: c,
              borderWidth: i === colorIdx ? 2 : 0,
              borderColor: theme.teal,
            }}
          />
        ))}
      </View>

      <SectionLabel>Add flatmates</SectionLabel>
      <View style={{ backgroundColor: theme.surface, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 4, marginBottom: 14 }}>
        <TextInput
          value={inviteInput}
          onChangeText={setInviteInput}
          onSubmitEditing={addInvite}
          returnKeyType="done"
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="flatmate@example.com"
          placeholderTextColor={theme.textFaint}
          style={{ fontWeight: '600', fontSize: 14, color: theme.text, paddingVertical: 12 }}
        />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 22 }}>
        {invited.map(n => (
          <TouchableOpacity
            key={n}
            onPress={() => setInvited(list => list.filter(x => x !== n))}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.tealBg, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 }}>
            <AppText size={12} weight="700" color={theme.tealText}>
              {n}
            </AppText>
            <AppText size={12} weight="700" color={theme.tealText}>
              ✕
            </AppText>
          </TouchableOpacity>
        ))}
      </View>

      <SectionLabel>Or share an invite link</SectionLabel>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 26 }}>
        <TouchableOpacity
          onPress={copyLink}
          disabled={sharing}
          style={{ flex: 1, backgroundColor: theme.surface, borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}>
          <AppText size={12} weight="800" color={sharing ? theme.textFaint : theme.text}>
            Copy link
          </AppText>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={shareWhatsApp}
          disabled={sharing}
          style={{ flex: 1, backgroundColor: theme.surface, borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}>
          <AppText size={12} weight="800" color={sharing ? theme.textFaint : theme.text}>
            WhatsApp
          </AppText>
        </TouchableOpacity>
      </View>

      <PrimaryButton label="Create group" onPress={create} loading={saving} />
    </Screen>
  );
}
