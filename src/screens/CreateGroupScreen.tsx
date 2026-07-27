import React, { useState } from 'react';
import { Alert, TextInput, TouchableOpacity, View } from 'react-native';
import { groupsApi } from '../api/endpoints';
import { useAuth } from '../auth/AuthContext';
import { AppText, Avatar, Header, PrimaryButton, Screen, SectionLabel } from '../components/primitives';
import { useNavigation } from '../nav/navigation';
import { useTheme } from '../theme/ThemeContext';

const GROUP_TYPES = [
  { label: 'Trip', emoji: '🧳', color: '#7FD8C8' },
  { label: 'Home', emoji: '🏠', color: '#F0A58F' },
  { label: 'Couple', emoji: '💑', color: '#D8C98A' },
  { label: 'Friends', emoji: '👥', color: '#C3AEDD' },
  { label: 'Other', emoji: '💰', color: '#A7C0E8' },
] as const;

export default function CreateGroupScreen() {
  const { theme } = useTheme();
  const nav = useNavigation();
  const { token } = useAuth();
  const [name, setName] = useState('');
  const [typeIdx, setTypeIdx] = useState(0);
  const [saving, setSaving] = useState(false);

  const type = GROUP_TYPES[typeIdx];

  async function create() {
    if (!name.trim()) {
      Alert.alert('Name your group', 'Give the group a name first.');
      return;
    }
    try {
      setSaving(true);
      const { group } = await groupsApi.create(
        { name: name.trim(), color: type.color, emoji: type.emoji },
        token ?? undefined,
      );
      nav.replace('InviteMembers', { id: group.id, name: group.name });
    } catch (e) {
      Alert.alert('Could not create group', e instanceof Error ? e.message : 'Check that the API is running.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen padded scroll>
      <View style={{ marginTop: 8 }}>
        <Header title="New group" onBack={nav.goBack} />
      </View>

      <View style={{ alignItems: 'center', marginBottom: 28 }}>
        <Avatar initials={type.emoji} bg={type.color} size={64} radius={20} textSize={26} />
      </View>

      <View style={{ backgroundColor: theme.surface, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 4, marginBottom: 24 }}>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Group name"
          placeholderTextColor={theme.textFaint}
          style={{ fontWeight: '700', fontSize: 14, color: theme.text, paddingVertical: 12 }}
        />
      </View>

      <SectionLabel>Group type</SectionLabel>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 26 }}>
        {GROUP_TYPES.map((t, i) => {
          const active = i === typeIdx;
          return (
            <TouchableOpacity
              key={t.label}
              onPress={() => setTypeIdx(i)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 12,
                backgroundColor: active ? theme.tealBg : theme.surface,
                borderWidth: active ? 1.5 : 0,
                borderColor: theme.teal,
              }}>
              <AppText size={15}>{t.emoji}</AppText>
              <AppText size={13} weight="800" color={active ? theme.tealText : theme.text}>
                {t.label}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </View>

      <PrimaryButton label="Create group" onPress={create} loading={saving} />
    </Screen>
  );
}
