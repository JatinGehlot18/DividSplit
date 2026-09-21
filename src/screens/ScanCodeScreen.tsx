import React, { useEffect, useState } from 'react';
import { Alert, PermissionsAndroid, Platform, Share, TouchableOpacity, View } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { Camera } from 'react-native-camera-kit';
import QRCode from 'react-native-qrcode-svg';
import { friendsApi } from '../api/endpoints';
import { useAuth } from '../auth/AuthContext';
import { AppText, Avatar, Header, Screen } from '../components/primitives';
import { useNavigation } from '../nav/navigation';
import { useTheme } from '../theme/ThemeContext';

const CODE_PREFIX = 'dividsplit:friend:';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Accepts either our own `dividsplit:friend:<email>` code or a bare email. */
function parseCode(raw: string): string | null {
  const trimmed = raw.trim();
  const email = trimmed.startsWith(CODE_PREFIX) ? trimmed.slice(CODE_PREFIX.length) : trimmed;
  return EMAIL_RE.test(email) ? email : null;
}

export default function ScanCodeScreen() {
  const { theme } = useTheme();
  const nav = useNavigation();
  const { user, token } = useAuth();
  const [tab, setTab] = useState<'scan' | 'code'>('code');
  const [hasPermission, setHasPermission] = useState(Platform.OS !== 'android');
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    if (tab !== 'scan' || Platform.OS !== 'android') return;
    PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA).then(result => {
      setHasPermission(result === PermissionsAndroid.RESULTS.GRANTED);
    });
  }, [tab]);

  const myCode = user ? `${CODE_PREFIX}${user.email}` : '';

  async function handleScan(raw: string) {
    if (locked || !user) return;
    const email = parseCode(raw);
    if (!email) return;
    setLocked(true);

    if (email === user.email) {
      Alert.alert('That’s your own code', 'Ask a friend to show you theirs instead.', [
        { text: 'OK', onPress: () => setLocked(false) },
      ]);
      return;
    }
    try {
      await friendsApi.sendRequest(user.id, email, token ?? undefined);
      Alert.alert('Friend request sent', email, [{ text: 'OK', onPress: () => nav.goBack() }]);
    } catch (e) {
      Alert.alert('Could not send request', e instanceof Error ? e.message : 'Something went wrong.', [
        { text: 'OK', onPress: () => setLocked(false) },
      ]);
    }
  }

  function shareCode() {
    Share.share({ message: `Add me on DividSplit! My email is ${user?.email ?? ''}` });
  }

  function copyCode() {
    Clipboard.setString(user?.email ?? '');
    Alert.alert('Copied', 'Your email is on the clipboard.');
  }

  return (
    <Screen padded scroll={false}>
      <View style={{ marginTop: 8 }}>
        <Header title="Add friends" onBack={nav.goBack} />
      </View>

      <View style={{ flexDirection: 'row', backgroundColor: theme.surface, borderRadius: 14, padding: 4, marginBottom: 24 }}>
        {(['scan', 'code'] as const).map(t => (
          <TouchableOpacity
            key={t}
            onPress={() => setTab(t)}
            style={{ flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 11, backgroundColor: tab === t ? theme.teal : 'transparent' }}>
            <AppText size={13} weight="800" color={tab === t ? theme.onAccent : theme.textDim}>
              {t === 'scan' ? 'Scan' : 'My Code'}
            </AppText>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'code' ? (
        <View style={{ alignItems: 'center' }}>
          {user ? <Avatar initials={user.initials} bg={user.avatarBg} size={48} radius={16} textSize={16} /> : null}
          <AppText size={16} weight="800" style={{ marginTop: 12 }}>
            {user?.name}
          </AppText>
          <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 20, marginTop: 20 }}>
            <QRCode value={myCode} size={200} />
          </View>
          <AppText size={12} weight="600" color={theme.textFaint} style={{ marginTop: 16, textAlign: 'center' }}>
            Anyone can scan this to add you on DividSplit
          </AppText>

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 28, width: '100%' }}>
            <TouchableOpacity
              onPress={shareCode}
              style={{ flex: 1, backgroundColor: theme.teal, borderRadius: 14, paddingVertical: 14, alignItems: 'center' }}>
              <AppText size={13} weight="800" color={theme.onAccent}>
                Share code
              </AppText>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={copyCode}
              style={{ flex: 1, backgroundColor: theme.surface, borderRadius: 14, paddingVertical: 14, alignItems: 'center' }}>
              <AppText size={13} weight="800">
                Copy code
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={{ flex: 1, borderRadius: 20, overflow: 'hidden', backgroundColor: '#000' }}>
          {hasPermission ? (
            <Camera
              style={{ flex: 1 }}
              scanBarcode
              showFrame
              scanThrottleDelay={1500}
              onReadCode={event => handleScan(event.nativeEvent.codeStringValue)}
            />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
              <AppText size={13} weight="700" color="#fff" style={{ textAlign: 'center' }}>
                Camera permission is needed to scan a code.
              </AppText>
            </View>
          )}
        </View>
      )}
    </Screen>
  );
}
