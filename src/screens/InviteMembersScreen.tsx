import React, { useMemo, useState } from 'react';
import { Alert, Linking, TextInput, TouchableOpacity, View } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { useQuery } from '@tanstack/react-query';
import { friendsApi, groupsApi } from '../api/endpoints';
import { queryKeys } from '../api/queryKeys';
import { Member } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { AppText, Avatar, Header, Loading, PrimaryButton, Screen, SectionLabel } from '../components/primitives';
import { useNavigation, useRoute } from '../nav/navigation';
import { useTheme } from '../theme/ThemeContext';
import { avatarColorFor } from '../util/format';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** A manually-typed email that isn't (yet) a friend — shaped like a Member so the picker/review UI can treat both the same way. */
function manualMember(email: string): Member {
  return {
    id: `manual:${email}`,
    name: email,
    first: email,
    initials: email.slice(0, 2).toUpperCase(),
    avatarBg: avatarColorFor(email),
    email,
  };
}

export default function InviteMembersScreen() {
  const { theme } = useTheme();
  const nav = useNavigation();
  const { token, user } = useAuth();
  const { params } = useRoute<{ id: string; name: string }>();
  const { id, name } = params;

  const { data: friends, isLoading: loadingFriends } = useQuery({
    queryKey: queryKeys.friends(user?.id ?? ''),
    queryFn: () => friendsApi.list(user!.id, token ?? undefined),
    enabled: !!user,
  });

  const [step, setStep] = useState<'pick' | 'review'>('pick');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [manualByEmail, setManualByEmail] = useState<Record<string, Member>>({});
  const [addEmailInput, setAddEmailInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [linkBusy, setLinkBusy] = useState<'copy' | 'whatsapp' | null>(null);

  const allPickable = useMemo(() => [...(friends ?? []), ...Object.values(manualByEmail)], [friends, manualByEmail]);
  const visibleFriends = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? allPickable.filter(m => m.name.toLowerCase().includes(q)) : allPickable;
  }, [allPickable, search]);
  const selected = useMemo(() => allPickable.filter(m => selectedIds.has(m.id)), [allPickable, selectedIds]);

  function toggle(m: Member) {
    setSelectedIds(ids => {
      const next = new Set(ids);
      if (next.has(m.id)) next.delete(m.id);
      else next.add(m.id);
      return next;
    });
  }

  function addContact() {
    const email = addEmailInput.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) {
      Alert.alert('Enter a valid email', 'e.g. friend@example.com');
      return;
    }
    const m = manualMember(email);
    setManualByEmail(map => ({ ...map, [m.id]: m }));
    setSelectedIds(ids => new Set(ids).add(m.id));
    setAddEmailInput('');
  }

  function done(finalId: string) {
    nav.replace('GroupDetail', { id: finalId, name });
  }

  async function confirmMembers() {
    try {
      setSaving(true);
      const failed: string[] = [];
      for (const m of selected) {
        try {
          await groupsApi.addMember(id, m.email, token ?? undefined);
        } catch {
          failed.push(m.name);
        }
      }
      if (failed.length) {
        Alert.alert('Some invites failed', `Could not add: ${failed.join(', ')}`, [{ text: 'OK', onPress: () => done(id) }]);
      } else {
        done(id);
      }
    } finally {
      setSaving(false);
    }
  }

  async function getInviteLink(): Promise<string | null> {
    try {
      const invite = await groupsApi.createInviteLink(id, token ?? undefined);
      return `https://splitkaro.app/join/${invite.token}`;
    } catch (e) {
      Alert.alert(
        'Invite links aren’t ready yet',
        e instanceof Error ? e.message : 'The server doesn’t support invite links yet.',
      );
      return null;
    }
  }

  async function copyLink() {
    setLinkBusy('copy');
    const link = await getInviteLink();
    setLinkBusy(null);
    if (!link) return;
    Clipboard.setString(link);
    Alert.alert('Copied', 'Invite link is on the clipboard.');
  }

  async function shareOnWhatsApp() {
    setLinkBusy('whatsapp');
    const link = await getInviteLink();
    setLinkBusy(null);
    if (!link) return;
    const message = `Join "${name}" on Splitkaro: ${link}`;
    try {
      await Linking.openURL(`whatsapp://send?text=${encodeURIComponent(message)}`);
    } catch {
      Alert.alert('WhatsApp not installed', 'Use Copy link instead and share it another way.');
    }
  }

  if (step === 'review') {
    return (
      <Screen padded scroll>
        <View style={{ marginTop: 8 }}>
          <Header title="Review" onBack={() => setStep('pick')} />
        </View>

        {selected.map(m => (
          <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }}>
            <View>
              <Avatar initials={m.initials} bg={m.avatarBg} size={44} />
              <TouchableOpacity
                onPress={() => toggle(m)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                style={{
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor: theme.surface,
                  borderWidth: 1,
                  borderColor: theme.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <AppText size={11} weight="800" color={theme.textDim}>
                  ✕
                </AppText>
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1 }}>
              <AppText size={14} weight="700">
                {m.name}
              </AppText>
              <AppText size={12} weight="600" color={theme.textFaint} style={{ marginTop: 1 }}>
                {m.email}
              </AppText>
            </View>
          </View>
        ))}

        <AppText size={12} weight="600" color={theme.textFaint} style={{ marginTop: 18, marginBottom: 26, lineHeight: 18 }}>
          They'll be notified you've added them to "{name}". You can start adding expenses right away.
        </AppText>

        <PrimaryButton label="Add members" onPress={confirmMembers} loading={saving} />
      </Screen>
    );
  }

  return (
    <Screen padded scroll>
      <View style={{ marginTop: 8 }}>
        <Header title="Add group members" onBack={() => done(id)} />
      </View>

      <View style={{ backgroundColor: theme.surface, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 4, marginBottom: 14 }}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search friends"
          placeholderTextColor={theme.textFaint}
          style={{ fontWeight: '600', fontSize: 14, color: theme.text, paddingVertical: 12 }}
        />
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
        <View style={{ flex: 1, backgroundColor: theme.surface, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 4 }}>
          <TextInput
            value={addEmailInput}
            onChangeText={setAddEmailInput}
            onSubmitEditing={addContact}
            returnKeyType="done"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder="Add someone by email"
            placeholderTextColor={theme.textFaint}
            style={{ fontWeight: '600', fontSize: 14, color: theme.text, paddingVertical: 12 }}
          />
        </View>
        <TouchableOpacity
          onPress={addContact}
          style={{ backgroundColor: theme.tealBg, borderRadius: 14, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' }}>
          <AppText size={13} weight="800" color={theme.teal}>
            Add
          </AppText>
        </TouchableOpacity>
      </View>

      <SectionLabel>Friends on Splitkaro</SectionLabel>
      {loadingFriends ? <Loading /> : null}
      {!loadingFriends && !visibleFriends.length ? (
        <AppText size={13} weight="600" color={theme.textFaint} style={{ marginBottom: 20 }}>
          No friends to show yet — add someone by email above.
        </AppText>
      ) : null}
      <View style={{ marginBottom: 22 }}>
        {visibleFriends.map(m => {
          const active = selectedIds.has(m.id);
          return (
            <TouchableOpacity
              key={m.id}
              onPress={() => toggle(m)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }}>
              <Avatar initials={m.initials} bg={m.avatarBg} size={40} />
              <View style={{ flex: 1 }}>
                <AppText size={14} weight="700">
                  {m.name}
                </AppText>
                <AppText size={11} weight="600" color={theme.textFaint} style={{ marginTop: 1 }}>
                  {m.email}
                </AppText>
              </View>
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  borderWidth: active ? 0 : 1.5,
                  borderColor: theme.border,
                  backgroundColor: active ? theme.teal : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                {active ? (
                  <AppText size={12} weight="900" color={theme.onAccent}>
                    ✓
                  </AppText>
                ) : null}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <SectionLabel>Or share an invite link</SectionLabel>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 26 }}>
        <TouchableOpacity
          onPress={copyLink}
          disabled={linkBusy !== null}
          style={{ flex: 1, backgroundColor: theme.surface, borderRadius: 12, paddingVertical: 12, alignItems: 'center', opacity: linkBusy === 'whatsapp' ? 0.5 : 1 }}>
          <AppText size={12} weight="800">
            {linkBusy === 'copy' ? 'Copying…' : 'Copy link'}
          </AppText>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={shareOnWhatsApp}
          disabled={linkBusy !== null}
          style={{ flex: 1, backgroundColor: theme.surface, borderRadius: 12, paddingVertical: 12, alignItems: 'center', opacity: linkBusy === 'copy' ? 0.5 : 1 }}>
          <AppText size={12} weight="800">
            {linkBusy === 'whatsapp' ? 'Opening…' : 'WhatsApp'}
          </AppText>
        </TouchableOpacity>
      </View>

      {selected.length ? (
        <PrimaryButton label={`Continue (${selected.length})`} onPress={() => setStep('review')} />
      ) : (
        <TouchableOpacity onPress={() => done(id)} style={{ paddingVertical: 14, alignItems: 'center' }}>
          <AppText size={13} weight="800" color={theme.textDim}>
            Skip for now
          </AppText>
        </TouchableOpacity>
      )}
    </Screen>
  );
}
