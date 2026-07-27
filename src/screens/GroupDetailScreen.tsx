import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { groupsApi } from '../api/endpoints';
import { queryKeys } from '../api/queryKeys';
import { useAuth } from '../auth/AuthContext';
import { AppText, Avatar, ErrorState, Loading, Screen } from '../components/primitives';
import { useNavigation, useRoute } from '../nav/navigation';
import { useTheme } from '../theme/ThemeContext';
import { rupees } from '../util/format';

export default function GroupDetailScreen() {
  const { theme } = useTheme();
  const nav = useNavigation();
  const { token, user } = useAuth();
  const { params } = useRoute<{ id: string; name: string }>();
  const id = params.id;
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.group(id),
    queryFn: () => groupsApi.detail(id, user!.id, token ?? undefined),
    enabled: !!user,
  });
  const errorMessage = error instanceof Error ? error.message : error ? 'Something went wrong' : null;

  const summaryLabel = data
    ? data.balances.overallOwed > 0
      ? "You're owed, overall"
      : data.balances.overallOwed < 0
        ? 'You owe, overall'
        : "You're settled up"
    : '';

  return (
    <Screen padded scroll>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8, marginBottom: 18 }}>
        <TouchableOpacity onPress={nav.goBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <AppText size={22} weight="700" color={theme.textDim}>
            ‹
          </AppText>
        </TouchableOpacity>
        <AppText size={19} weight="800" numberOfLines={1}>
          {params.name ?? data?.name ?? 'Group'}
        </AppText>
      </View>

      {isLoading ? <Loading /> : null}
      {errorMessage ? <ErrorState message={errorMessage} onRetry={refetch} /> : null}

      {data ? (
        <View>
          <View style={{ backgroundColor: theme.tealBg, borderRadius: 18, padding: 18, alignItems: 'center', marginBottom: 16 }}>
            <AppText size={12} weight="800" color={theme.tealText}>
              {summaryLabel}
            </AppText>
            <AppText size={30} weight="900" color={theme.teal} style={{ marginTop: 4 }}>
              {rupees(Math.abs(data.balances.overallOwed))}
            </AppText>
          </View>

          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
            <TouchableOpacity
              onPress={() => nav.push('SettleUp', { id })}
              style={{ flex: 1, backgroundColor: theme.surface, borderRadius: 14, paddingVertical: 14, alignItems: 'center' }}>
              <AppText size={13} weight="800">
                Settle up
              </AppText>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => nav.push('AddExpense', { id })}
              style={{ flex: 1, backgroundColor: theme.teal, borderRadius: 14, paddingVertical: 14, alignItems: 'center' }}>
              <AppText size={13} weight="800" color={theme.onAccent}>
                Add expense
              </AppText>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => nav.push('Search', { id })}
            style={{ backgroundColor: theme.surface, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13, marginBottom: 6 }}>
            <AppText size={14} weight="600" color={theme.textFaint}>
              🔍 Search expenses
            </AppText>
          </TouchableOpacity>
          {data.expenses.map(e => (
            <TouchableOpacity
              key={e.id}
              activeOpacity={0.85}
              onPress={() => nav.push('ExpenseDetail', { groupId: id, expenseId: e.id })}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                <Avatar initials={e.icon} bg={e.tint} size={38} radius={13} textSize={13} />
                <View style={{ flex: 1 }}>
                  <AppText size={13} weight="800" numberOfLines={1}>
                    {e.title}
                  </AppText>
                  <AppText size={11} weight="700" color={theme.textFaint} style={{ marginTop: 2 }}>
                    {e.category} · paid by {e.paidByName}
                  </AppText>
                </View>
              </View>
              <AppText size={13} weight="900">
                {rupees(e.amount)}
              </AppText>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            onPress={() => nav.push('ScanReceipt', { id })}
            style={{ backgroundColor: theme.tealBg, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 16 }}>
            <AppText size={13} weight="800" color={theme.tealText}>
              Scan a receipt
            </AppText>
          </TouchableOpacity>
        </View>
      ) : null}
    </Screen>
  );
}
