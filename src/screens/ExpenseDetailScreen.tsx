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

export default function ExpenseDetailScreen() {
  const { theme } = useTheme();
  const nav = useNavigation();
  const { token } = useAuth();
  const { params } = useRoute<{ groupId: string; expenseId: string }>();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.expense(params.expenseId),
    queryFn: () => groupsApi.expenseDetail(params.expenseId, token ?? undefined),
  });
  const errorMessage = error instanceof Error ? error.message : error ? 'Something went wrong' : null;

  return (
    <Screen padded scroll>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginBottom: 20 }}>
        <TouchableOpacity onPress={nav.goBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <AppText size={22} weight="700" color={theme.textDim}>
            ‹
          </AppText>
        </TouchableOpacity>
        <AppText size={16} weight="700" color={theme.textDim}>
          ⋯
        </AppText>
      </View>

      {isLoading ? <Loading /> : null}
      {errorMessage ? <ErrorState message={errorMessage} onRetry={refetch} /> : null}

      {data ? (
        <>
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <Avatar initials={data.icon} bg={data.tint} size={56} radius={18} textSize={18} />
            <AppText size={19} weight="800" style={{ marginTop: 14 }}>
              {data.title}
            </AppText>
            <AppText size={30} weight="900" style={{ marginTop: 6 }}>
              {rupees(data.amount)}
            </AppText>
            <View style={{ backgroundColor: theme.tealBg, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, marginTop: 10 }}>
              <AppText size={11} weight="800" color={theme.tealText}>
                {data.category}
              </AppText>
            </View>
          </View>

          {data.hasReceipt ? (
            <View
              style={{
                width: '100%',
                height: 140,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.surface,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 20,
              }}>
              <AppText size={11} weight="700" color={theme.textFaint}>
                receipt photo
              </AppText>
            </View>
          ) : null}

          <View style={{ backgroundColor: theme.surface, borderRadius: 16, padding: 16, marginBottom: 14 }}>
            <AppText size={12} weight="700" color={theme.textFaint} style={{ marginBottom: 10 }}>
              Paid by <AppText size={12} weight="700" color={theme.text}>{data.paidByName}</AppText> · {data.splitLabel}
            </AppText>
            {data.split.map((s, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 }}>
                <AppText size={13} weight="700">
                  {s.name}
                </AppText>
                <AppText size={13} weight="700" color={theme.textDim}>
                  {rupees(s.amount)}
                </AppText>
              </View>
            ))}
          </View>

          <AppText size={12} weight="600" color={theme.textFaint}>
            {data.addedAt}
          </AppText>
        </>
      ) : null}
    </Screen>
  );
}
