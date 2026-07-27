import React, { useCallback } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '../api/endpoints';
import { queryKeys } from '../api/queryKeys';
import { ActivityItem } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { AppText, ErrorState, Loading, Screen } from '../components/primitives';
import { useTheme } from '../theme/ThemeContext';

export default function ActivityScreen() {
  const { theme } = useTheme();
  const { user, token } = useAuth();
  const userId = user?.id ?? '';
  const queryClient = useQueryClient();
  const notificationsKey = queryKeys.notifications(userId);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: notificationsKey,
    queryFn: () => notificationsApi.list(userId, token ?? undefined),
  });

  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: notificationsKey });
    }, [queryClient, notificationsKey]),
  );

  const markReadMutation = useMutation({
    mutationFn: (item: ActivityItem) => notificationsApi.markRead(userId, item.id, token ?? undefined),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationsKey }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(userId, token ?? undefined),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationsKey }),
  });

  const hasUnread = (data ?? []).some(n => !n.read);
  const errorMessage = error instanceof Error ? error.message : error ? 'Something went wrong' : null;

  function markRead(item: ActivityItem) {
    if (item.read) return;
    markReadMutation.mutate(item);
  }

  return (
    <Screen padded scroll>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginBottom: 22 }}>
        <AppText size={22} weight="800">
          Activity
        </AppText>
        {hasUnread ? (
          <TouchableOpacity onPress={() => markAllReadMutation.mutate()}>
            <AppText size={12} weight="800" color={theme.teal}>
              Mark all read
            </AppText>
          </TouchableOpacity>
        ) : null}
      </View>

      {isLoading ? <Loading /> : null}
      {errorMessage ? <ErrorState message={errorMessage} onRetry={refetch} /> : null}

      {data && data.length === 0 ? (
        <AppText size={13} weight="600" color={theme.textFaint} style={{ textAlign: 'center', paddingVertical: 40 }}>
          Nothing here yet.
        </AppText>
      ) : null}

      {(data ?? []).map(item => (
        <TouchableOpacity
          key={item.id}
          activeOpacity={0.7}
          onPress={() => markRead(item)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            paddingVertical: 13,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
          }}>
          <AppText size={18}>{item.icon}</AppText>
          <View style={{ flex: 1 }}>
            <AppText size={13} weight={item.read ? '600' : '800'} color={item.read ? theme.textDim : theme.text}>
              {item.message}
            </AppText>
            <AppText size={11} weight="600" color={theme.textFaint} style={{ marginTop: 2 }}>
              {item.when}
            </AppText>
          </View>
          {!item.read ? (
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.teal }} />
          ) : null}
        </TouchableOpacity>
      ))}
    </Screen>
  );
}
