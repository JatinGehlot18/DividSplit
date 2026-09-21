import React, { useState } from 'react';
import { Alert, Linking, Modal, TextInput, TouchableOpacity, View } from 'react-native';
import { authApi } from '../api/endpoints';
import { useAuth } from '../auth/AuthContext';
import { signOutOfGoogle } from '../auth/googleAuth';
import { AppText, Avatar, PrimaryButton, Screen, SectionLabel } from '../components/primitives';
import { useNavigation } from '../nav/navigation';
import { useTheme } from '../theme/ThemeContext';

function Row({
  icon,
  label,
  value,
  color,
  onPress,
}: {
  icon: string;
  label: string;
  value?: string;
  color?: string;
  onPress?: () => void;
}) {
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.7 : 1}
      onPress={onPress}
      disabled={!onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
      }}>
      <AppText size={17}>{icon}</AppText>
      <AppText size={14} weight="700" color={color ?? theme.text} style={{ flex: 1 }}>
        {label}
      </AppText>
      {value ? (
        <AppText size={13} weight="600" color={theme.textFaint}>
          {value}
        </AppText>
      ) : null}
    </TouchableOpacity>
  );
}

export default function AccountScreen() {
  const { theme, toggle, isDark } = useTheme();
  const nav = useNavigation();
  const { user, token, refreshToken, signOut } = useAuth();
  const [pwOpen, setPwOpen] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [savingPw, setSavingPw] = useState(false);

  async function changePassword() {
    if (!user || !newPw || newPw.length < 8) {
      Alert.alert('Weak password', 'New password must be at least 8 characters.');
      return;
    }
    try {
      setSavingPw(true);
      await authApi.changePassword(user.id, { currentPassword: currentPw, newPassword: newPw }, token ?? undefined);
      setPwOpen(false);
      setCurrentPw('');
      setNewPw('');
      Alert.alert('Password updated');
    } catch (e) {
      Alert.alert('Could not update password', e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setSavingPw(false);
    }
  }

  async function logOut() {
    // Clear local state and leave the session screen FIRST — the server call
    // below can hang when the backend is unreachable (no fetch timeout), and
    // blocking on it would keep the stale session active indefinitely.
    signOut();
    nav.reset('Login');
    try {
      if (refreshToken) await authApi.logout(refreshToken);
    } catch {
      // best-effort — still signed out locally either way
    }
    await signOutOfGoogle();
  }

  return (
    <Screen padded scroll>
      <View style={{ marginTop: 8, marginBottom: 24 }}>
        <AppText size={22} weight="800">
          Account
        </AppText>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 30 }}>
        {user ? <Avatar initials={user.initials} bg={user.avatarBg} size={56} radius={18} textSize={18} /> : null}
        <View style={{ flex: 1 }}>
          <AppText size={16} weight="800">
            {user?.name ?? '—'}
          </AppText>
          <AppText size={12} weight="600" color={theme.textFaint} style={{ marginTop: 2 }}>
            {user?.email ?? ''}
          </AppText>
        </View>
        <TouchableOpacity onPress={() => nav.push('ProfileSetup')}>
          <AppText size={13} weight="800" color={theme.teal}>
            Edit
          </AppText>
        </TouchableOpacity>
      </View>

      <View style={{ marginBottom: 26 }}>
        <Row icon="📷" label="Scan code" onPress={() => nav.push('ScanCode')} />
      </View>

      <SectionLabel>Preferences</SectionLabel>
      <View style={{ marginBottom: 26 }}>
        <Row icon={isDark ? '☾' : '☀'} label="Appearance" value={isDark ? 'Dark' : 'Light'} onPress={toggle} />
        <Row icon="🔒" label="Change password" onPress={() => setPwOpen(true)} />
      </View>

      <SectionLabel>Feedback</SectionLabel>
      <View style={{ marginBottom: 26 }}>
        <Row icon="💬" label="Contact support" onPress={() => Linking.openURL('mailto:support@dividsplit.com')} />
      </View>

      <Row icon="↪" label="Log out" color={theme.coral} onPress={logOut} />

      <AppText size={11} weight="600" color={theme.textFaint} style={{ textAlign: 'center', marginTop: 40 }}>
        DividSplit · built with React Native
      </AppText>

      <Modal visible={pwOpen} animationType="slide" transparent onRequestClose={() => setPwOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: theme.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, paddingBottom: 40 }}>
            <AppText size={17} weight="800" style={{ marginBottom: 18 }}>
              Change password
            </AppText>
            <AppText size={12} weight="700" color={theme.textFaint} style={{ marginBottom: 8 }}>
              Current password
            </AppText>
            <View style={{ backgroundColor: theme.surface, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 4, marginBottom: 16 }}>
              <TextInput
                value={currentPw}
                onChangeText={setCurrentPw}
                secureTextEntry
                placeholder="••••••••"
                placeholderTextColor={theme.textFaint}
                style={{ fontWeight: '700', fontSize: 14, color: theme.text, paddingVertical: 12 }}
              />
            </View>
            <AppText size={12} weight="700" color={theme.textFaint} style={{ marginBottom: 8 }}>
              New password
            </AppText>
            <View style={{ backgroundColor: theme.surface, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 4, marginBottom: 22 }}>
              <TextInput
                value={newPw}
                onChangeText={setNewPw}
                secureTextEntry
                placeholder="At least 8 characters"
                placeholderTextColor={theme.textFaint}
                style={{ fontWeight: '700', fontSize: 14, color: theme.text, paddingVertical: 12 }}
              />
            </View>
            <PrimaryButton label="Update password" onPress={changePassword} loading={savingPw} />
            <TouchableOpacity onPress={() => setPwOpen(false)} style={{ alignItems: 'center', marginTop: 14 }}>
              <AppText size={13} weight="700" color={theme.textDim}>
                Cancel
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
