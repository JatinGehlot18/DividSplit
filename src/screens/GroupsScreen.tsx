import React, { useCallback, useMemo, useState } from 'react';
import { TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { groupsApi } from '../api/endpoints';
import { queryKeys } from '../api/queryKeys';
import { Group } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { AppText, Avatar, ErrorState, Loading, Screen } from '../components/primitives';
import { useNavigation } from '../nav/navigation';
import { useTheme } from '../theme/ThemeContext';
import { rupees } from '../util/format';

export default function GroupsScreen() {
  const { theme, toggle, isDark } = useTheme();
  const nav = useNavigation();
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  const groupsKey = useMemo(() => [...queryKeys.groups, token] as const, [token]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: groupsKey,
    queryFn: () => groupsApi.list(token ?? undefined),
  });
  const [query, setQuery] = useState('');
  const [showSettled, setShowSettled] = useState(false);

  // GroupsScreen lives inside the bottom-tab navigator and stays mounted while
  // other stack screens (CreateGroup, InviteMembers, GroupDetail) are pushed on
  // top, so a mount-only fetch never reruns when a new group is created
  // elsewhere and we navigate back here — invalidate on focus instead.
  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groups });
      queryClient.invalidateQueries({ queryKey: ['group'] });
    }, [queryClient]),
  );

  const activeGroupIds = useMemo(
    () =>
      (data ?? [])
        .filter(g => g.net !== 0)
        .map(g => g.id)
        .sort(),
    [data],
  );

  // Per-counterparty breakdown lines (e.g. "You owe Anand ₹120") shown under each
  // group. One aliased GraphQL request for all active groups instead of one
  // request per group (see groupsApi.suggestionsBatch) — avoids an N+1 fan-out.
  const { data: breakdowns = {} } = useQuery({
    queryKey: queryKeys.groupSuggestionsBatch(activeGroupIds, user?.id ?? ''),
    queryFn: () => groupsApi.suggestionsBatch(activeGroupIds, user!.id, token ?? undefined),
    enabled: !!user && activeGroupIds.length > 0,
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: (g: Group) => groupsApi.toggleFavorite(g.id, !g.favorite, token ?? undefined),
    onMutate: async g => {
      await queryClient.cancelQueries({ queryKey: groupsKey });
      const previous = queryClient.getQueryData<Group[]>(groupsKey);
      queryClient.setQueryData<Group[]>(groupsKey, old =>
        old?.map(x => (x.id === g.id ? { ...x, favorite: !x.favorite } : x)),
      );
      return { previous };
    },
    onError: (_err, _g, context) => {
      if (context?.previous) queryClient.setQueryData(groupsKey, context.previous);
    },
  });

  const { activeGroups, settledGroups, overall } = useMemo(() => {
    const list = data ?? [];
    const q = query.trim().toLowerCase();
    const filtered = q ? list.filter(g => g.name.toLowerCase().includes(q)) : list;
    return {
      activeGroups: filtered.filter(g => g.net !== 0),
      settledGroups: filtered.filter(g => g.net === 0),
      overall: list.reduce((sum, g) => sum + g.net, 0),
    };
  }, [data, query]);

  function balanceParts(net: number) {
    if (net > 0) return { label: 'you are owed', display: rupees(net), color: theme.teal };
    if (net < 0) return { label: 'you owe', display: rupees(net).replace('-', ''), color: theme.coral };
    return { label: '', display: 'settled up', color: theme.textFaint };
  }

  function renderGroup(g: Group) {
    const b = balanceParts(g.net);
    const rows = breakdowns[g.id] ?? [];
    return (
      <TouchableOpacity
        key={g.id}
        activeOpacity={0.85}
        onPress={() => nav.push('GroupDetail', { id: g.id, name: g.name })}
        style={{ backgroundColor: theme.surface, borderRadius: 20, padding: 18, marginBottom: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Avatar initials={g.emoji} bg={g.tint} size={44} radius={14} textSize={15} />
            <View>
              <AppText size={15} weight="700">
                {g.name}
              </AppText>
              <AppText size={12} weight="600" color={theme.textFaint} style={{ marginTop: 2 }}>
                {g.memberLabel}
              </AppText>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => toggleFavoriteMutation.mutate(g)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <AppText size={17} weight="700" color={g.favorite ? theme.teal : theme.starOff}>
              {g.favorite ? '★' : '☆'}
            </AppText>
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: rows.length ? 10 : 0 }}>
          {b.label ? (
            <AppText size={12} weight="600" color={theme.textFaint}>
              {b.label}
            </AppText>
          ) : null}
          <AppText size={16} weight="800" color={b.color}>
            {b.display}
          </AppText>
        </View>

        {rows.map(r => (
          <View key={r.id} style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
            <AppText size={12} weight="600" color={theme.textFaint}>
              {r.direction === 'owe' ? `You owe ${r.label}` : `${r.label} owes you`}
            </AppText>
            <AppText size={12} weight="800" color={r.direction === 'owe' ? theme.coral : theme.teal}>
              {rupees(r.amount)}
            </AppText>
          </View>
        ))}
      </TouchableOpacity>
    );
  }

  const overallParts = balanceParts(overall);
  const errorMessage = error instanceof Error ? error.message : error ? 'Something went wrong' : null;

  return (
    <Screen padded scroll>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22, marginTop: 8 }}>
        <AppText size={22} weight="800">
          Groups
        </AppText>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity
            onPress={toggle}
            style={{ width: 38, height: 38, borderRadius: 12, borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center' }}>
            <AppText size={15}>{isDark ? '☀' : '☾'}</AppText>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => nav.push('CreateGroup')}
            style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: theme.tealBg, alignItems: 'center', justifyContent: 'center' }}>
            <AppText size={18} weight="800" color={theme.teal}>
              +
            </AppText>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ backgroundColor: theme.surface, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 4, marginBottom: 20 }}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search groups"
          placeholderTextColor={theme.textFaint}
          style={{ fontWeight: '600', fontSize: 14, color: theme.text, paddingVertical: 12 }}
        />
      </View>

      {data && data.length ? (
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 20 }}>
          <AppText size={13} weight="700" color={theme.textDim}>
            {overallParts.label ? `Overall, ${overallParts.label}` : 'Overall, you’re all settled up'}
          </AppText>
          {overallParts.label ? (
            <AppText size={17} weight="900" color={overallParts.color}>
              {overallParts.display}
            </AppText>
          ) : null}
        </View>
      ) : null}

      {isLoading ? <Loading /> : null}
      {errorMessage ? <ErrorState message={errorMessage} onRetry={refetch} /> : null}

      {activeGroups.map(renderGroup)}

      {settledGroups.length ? (
        showSettled ? (
          settledGroups.map(renderGroup)
        ) : (
          <TouchableOpacity
            onPress={() => setShowSettled(true)}
            style={{ borderWidth: 1, borderColor: theme.border, borderRadius: 16, paddingVertical: 13, alignItems: 'center', marginTop: 4 }}>
            <AppText size={13} weight="800" color={theme.teal}>
              Show {settledGroups.length} settled-up group{settledGroups.length === 1 ? '' : 's'}
            </AppText>
          </TouchableOpacity>
        )
      ) : null}
    </Screen>
  );
}
