import React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';

/**
 * Full-screen phone frame. With Android edge-to-edge enabled the app draws
 * behind the system bars, so we read the safe-area insets from
 * react-native-safe-area-context and pad content in manually (top + bottom),
 * keeping horizontal padding for the page gutter.
 */
export function Screen({
  children,
  scroll = true,
  padded = true,
  contentStyle,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  contentStyle?: ViewStyle;
}) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const pad = padded ? { paddingHorizontal: 22 } : null;
  const topInset = { paddingTop: insets.top + 20 };
  const bottomInset = { paddingBottom: insets.bottom + 40 };
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />
      {/*
        Android: edge-to-edge + translucent StatusBar makes windowSoftInputMode="adjustResize"
        unreliable on API 35+ (the window no longer truly resizes), so a focused field near the
        bottom stays hidden behind the keyboard unless we push content up ourselves.
        iOS: handled by the ScrollView's own automaticallyAdjustKeyboardInsets below.
      */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'android' ? 'height' : undefined}>
        {scroll ? (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[topInset, bottomInset, pad, contentStyle]}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
            showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        ) : (
          <View style={[{ flex: 1 }, topInset, bottomInset, pad, contentStyle]}>
            {children}
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

export function AppText({
  children,
  weight = '700',
  size = 14,
  color,
  style,
  numberOfLines,
}: {
  children: React.ReactNode;
  weight?: TextStyle['fontWeight'];
  size?: number;
  color?: string;
  style?: TextStyle | TextStyle[];
  numberOfLines?: number;
}) {
  const { theme } = useTheme();
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        { fontWeight: weight, fontSize: size, color: color || theme.text },
        style as TextStyle,
      ]}>
      {children}
    </Text>
  );
}

/** Rounded avatar tile with initials, matching the mockup's tinted squares. */
export function Avatar({
  initials,
  bg,
  size = 32,
  radius,
  textSize,
  ring,
}: {
  initials: string;
  bg: string;
  size?: number;
  radius?: number;
  textSize?: number;
  ring?: string;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius ?? size * 0.34,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
        ...(ring
          ? { borderWidth: 2, borderColor: ring }
          : null),
      }}>
      <Text style={{ fontWeight: '800', fontSize: textSize ?? size * 0.4, color: '#0F1115' }}>
        {initials}
      </Text>
    </View>
  );
}

/** Full-width teal CTA button. */
export function PrimaryButton({
  label,
  onPress,
  loading,
}: {
  label: string;
  onPress?: () => void;
  loading?: boolean;
}) {
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={loading}
      style={{
        paddingVertical: 16,
        borderRadius: 16,
        backgroundColor: theme.teal,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      {loading ? (
        <ActivityIndicator color={theme.onAccent} />
      ) : (
        <Text style={{ fontWeight: '800', fontSize: 14, color: theme.onAccent }}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

/** Surface-colored input-looking field with a label above. */
export function Field({
  label,
  children,
  style,
}: {
  label?: string;
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  const { theme } = useTheme();
  return (
    <View style={style}>
      {label ? (
        <AppText size={12} weight="700" color={theme.textFaint} style={{ marginBottom: 8 }}>
          {label}
        </AppText>
      ) : null}
      <View
        style={{
          backgroundColor: theme.surface,
          borderRadius: 14,
          paddingHorizontal: 16,
          paddingVertical: 15,
        }}>
        {children}
      </View>
    </View>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <Text
      style={{
        fontWeight: '700',
        fontSize: 11,
        letterSpacing: 0.3,
        textTransform: 'uppercase',
        color: theme.textFaint,
        marginBottom: 10,
      }}>
      {children}
    </Text>
  );
}

/** Back chevron + title row used on most detail screens. */
export function Header({
  title,
  onBack,
  right,
}: {
  title?: string;
  onBack?: () => void;
  right?: React.ReactNode;
}) {
  const { theme } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} hitSlop={styles.hit}>
            <Text style={{ fontSize: 22, color: theme.textDim, fontWeight: '700' }}>‹</Text>
          </TouchableOpacity>
        ) : null}
        {title ? (
          <AppText size={18} weight="800" numberOfLines={1}>
            {title}
          </AppText>
        ) : null}
      </View>
      {right}
    </View>
  );
}

export function Loading() {
  const { theme } = useTheme();
  return (
    <View style={{ paddingVertical: 60, alignItems: 'center' }}>
      <ActivityIndicator color={theme.teal} />
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { theme } = useTheme();
  return (
    <View style={{ paddingVertical: 50, alignItems: 'center', gap: 12 }}>
      <AppText color={theme.textDim} size={13} style={{ textAlign: 'center' }}>
        {message}
      </AppText>
      {onRetry ? (
        <TouchableOpacity onPress={onRetry}>
          <AppText color={theme.teal} size={13} weight="800">
            Retry
          </AppText>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hit: { top: 8, bottom: 8, left: 8, right: 8 },
});
