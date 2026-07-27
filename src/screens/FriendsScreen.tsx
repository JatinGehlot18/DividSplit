import React, { useCallback } from 'react';
import { Alert, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { friendsApi } from '../api/endpoints';
import { queryKeys } from '../api/queryKeys';
import { useAuth } from '../auth/AuthContext';
import { AppText, Avatar, ErrorState, Loading, Screen, SectionLabel } from '../components/primitives';
import { useTheme } from '../theme/ThemeContext';
import { rupees } from '../util/format';

export default function FriendsScreen() {
  const { theme } = useTheme();
  const { user, token } = useAuth();
  const userId = user?.id ?? '';
  const queryClient = useQueryClient();
  const requestsKey = queryKeys.friendRequests(userId);
  const balancesKey = queryKeys.friendBalances;

  const {
    data: requests,
    isLoading: loadingRequests,
    error: requestsError,
    refetch: refetchRequests,
  } = useQuery({
    queryKey: requestsKey,
    queryFn: () => friendsApi.pendingRequests(userId, token ?? undefined),
  });
  const {
    data: balances,
    isLoading: loadingBalances,
    error: balancesError,
    refetch: refetchBalances,
  } = useQuery({
    queryKey: balancesKey,
    queryFn: () => friendsApi.balances(token ?? undefined),
  });

  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: requestsKey });
      queryClient.invalidateQueries({ queryKey: balancesKey });
    }, [queryClient, requestsKey, balancesKey]),
  );

  const acceptMutation = useMutation({
    mutationFn: (friendshipId: string) => friendsApi.accept(userId, friendshipId, token ?? undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: requestsKey });
      queryClient.invalidateQueries({ queryKey: balancesKey });
    },
    onError: (e: unknown) => Alert.alert('Could not accept', e instanceof Error ? e.message : 'Something went wrong.'),
  });

  const removeMutation = useMutation({
    mutationFn: (friendshipId: string) => friendsApi.remove(userId, friendshipId, token ?? undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: requestsKey });
      queryClient.invalidateQueries({ queryKey: balancesKey });
    },
    onError: (e: unknown) => Alert.alert('Could not remove', e instanceof Error ? e.message : 'Something went wrong.'),
  });

  const loading = loadingRequests || loadingBalances;
  const error = requestsError ?? balancesError;
  const errorMessage = error instanceof Error ? error.message : error ? 'Something went wrong' : null;
  function retry() {
    refetchRequests();
    refetchBalances();
  }

  const incoming = requests?.filter(r => r.incoming) ?? [];
  const outgoing = requests?.filter(r => !r.incoming) ?? [];

  return (
    <Screen padded scroll>
      <View style={{ marginTop: 8, marginBottom: 22 }}>
        <AppText size={22} weight="800">
          Friends
        </AppText>
      </View>

      {loading ? <Loading /> : null}
      {errorMessage ? <ErrorState message={errorMessage} onRetry={retry} /> : null}

      {incoming.length ? (
        <View style={{ marginBottom: 22 }}>
          <SectionLabel>Requests</SectionLabel>
          {incoming.map(r => (
            <View
              key={r.friendshipId}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: theme.border }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Avatar initials={r.person.initials} bg={r.person.avatarBg} size={34} textSize={12} />
                <AppText size={13} weight="700">
                  {r.person.name}
                </AppText>
              </View>
              <View style={{ flexDirection: 'row', gap: 14 }}>
                <TouchableOpacity onPress={() => acceptMutation.mutate(r.friendshipId)}>
                  <AppText size={13} weight="800" color={theme.teal}>
                    Accept
                  </AppText>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => removeMutation.mutate(r.friendshipId)}>
                  <AppText size={13} weight="800" color={theme.textFaint}>
                    Decline
                  </AppText>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {outgoing.length ? (
        <View style={{ marginBottom: 22 }}>
          <SectionLabel>Pending</SectionLabel>
          {outgoing.map(r => (
            <View
              key={r.friendshipId}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: theme.border }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Avatar initials={r.person.initials} bg={r.person.avatarBg} size={34} textSize={12} />
                <AppText size={13} weight="700">
                  {r.person.name}
                </AppText>
              </View>
              <TouchableOpacity onPress={() => removeMutation.mutate(r.friendshipId)}>
                <AppText size={12} weight="700" color={theme.textFaint}>
                  Cancel
                </AppText>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ) : null}

      {balances ? (
        <View>
          <SectionLabel>Balances</SectionLabel>
          {balances.length === 0 ? (
            <AppText size={13} weight="600" color={theme.textFaint} style={{ paddingVertical: 20, textAlign: 'center' }}>
              You're all settled up.
            </AppText>
          ) : (
            balances.map(({ person, amount }) => (
              <View
                key={person.id}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: theme.border }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Avatar initials={person.initials} bg={person.avatarBg} size={34} textSize={12} />
                  <AppText size={13} weight="700">
                    {person.name}
                  </AppText>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <AppText size={11} weight="600" color={theme.textFaint}>
                    {amount > 0 ? 'owes you' : 'you owe'}
                  </AppText>
                  <AppText size={13} weight="800" color={amount > 0 ? theme.teal : theme.coral}>
                    {rupees(Math.abs(amount))}
                  </AppText>
                </View>
              </View>
            ))
          )}
        </View>
      ) : null}
    </Screen>
  );
}
