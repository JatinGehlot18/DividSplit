import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, ScrollView, TextInput, TouchableOpacity, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { categoriesApi, expensesApi, groupsApi } from '../api/endpoints';
import { queryKeys } from '../api/queryKeys';
import { Member } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { AppText, Avatar, Loading, Screen, SectionLabel } from '../components/primitives';
import { useNavigation, useRoute } from '../nav/navigation';
import { useTheme } from '../theme/ThemeContext';

export default function AddExpenseScreen() {
  const { theme } = useTheme();
  const nav = useNavigation();
  const { token, user } = useAuth();
  const { params } = useRoute<{ id: string }>();
  const groupId = params.id;
  const queryClient = useQueryClient();

  const { data: categories } = useQuery({
    queryKey: queryKeys.categories,
    queryFn: () => categoriesApi.list(token ?? undefined),
  });
  const { data: members, isLoading: loading } = useQuery({
    queryKey: queryKeys.groupMembers(groupId),
    queryFn: () => groupsApi.members(groupId, user?.id, token ?? undefined),
  });

  function invalidateGroup() {
    queryClient.invalidateQueries({ queryKey: queryKeys.groups });
    // Prefix match also covers ['group', groupId, 'suggestions', meId].
    queryClient.invalidateQueries({ queryKey: queryKeys.group(groupId) });
  }

  const createExpenseMutation = useMutation({
    mutationFn: (input: Parameters<typeof expensesApi.create>[0]) => expensesApi.create(input, token ?? undefined),
    onSuccess: invalidateGroup,
  });

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [paidBy, setPaidBy] = useState(user?.id ?? '');
  const [splitType, setSplitType] = useState<'equal' | 'unequal'>('equal');
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.id) setPaidBy(id => id || user.id);
  }, [user?.id]);

  // Default everyone selected once members load.
  const participantChecks = useMemo(() => {
    if (!members) return {};
    const base: Record<string, boolean> = {};
    members.forEach(m => (base[m.id] = checks[m.id] ?? true));
    return base;
  }, [members, checks]);

  const allChecked = members ? members.every(m => participantChecks[m.id]) : false;
  const paidByMember = members?.find(m => m.id === paidBy);

  function toggle(id: string) {
    setChecks(c => ({ ...c, [id]: !(participantChecks[id] ?? true) }));
  }
  function toggleAll() {
    if (!members) return;
    const next: Record<string, boolean> = {};
    members.forEach(m => (next[m.id] = !allChecked));
    setChecks(next);
  }

  async function save() {
    if (!description.trim() || !Number(amount)) {
      Alert.alert('Missing details', 'Enter a description and amount.');
      return;
    }
    if (splitType === 'unequal') {
      nav.push('SplitUneven', { id: groupId, description, amount, categoryId, paidBy });
      return;
    }
    try {
      setSaving(true);
      await createExpenseMutation.mutateAsync({
        groupId,
        description,
        amount: Number(amount) || 0,
        categoryId: categoryId || undefined,
        paidBy,
        splitType: 'EQUAL',
        participants: (members ?? []).filter(m => participantChecks[m.id]).map(m => ({ userId: m.id })),
      });
      Alert.alert('Saved', 'Expense added to the group.', [
        { text: 'OK', onPress: () => nav.goBack() },
      ]);
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : 'Check that the API is running.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen padded scroll>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginBottom: 20 }}>
        <TouchableOpacity onPress={nav.goBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <AppText size={20} weight="700" color={theme.textDim}>
            ✕
          </AppText>
        </TouchableOpacity>
        <AppText size={16} weight="800">
          Add expense
        </AppText>
        <TouchableOpacity onPress={save} disabled={saving}>
          <AppText size={13} weight="800" color={theme.teal}>
            {saving ? 'Saving…' : 'Save'}
          </AppText>
        </TouchableOpacity>
      </View>

      <View style={{ backgroundColor: theme.surface, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 12 }}>
        <AppText size={10} weight="700" color={theme.textFaint} style={{ textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 4 }}>
          Description
        </AppText>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="What was it for?"
          placeholderTextColor={theme.textFaint}
          style={{ fontWeight: '700', fontSize: 14, color: theme.text, padding: 0 }}
        />
      </View>

      <View style={{ backgroundColor: theme.surface, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 16 }}>
        <AppText size={10} weight="700" color={theme.textFaint} style={{ textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 4 }}>
          Amount
        </AppText>
        <TextInput
          value={amount}
          onChangeText={t => setAmount(t.replace(/[^0-9]/g, ''))}
          keyboardType="number-pad"
          placeholder="0"
          placeholderTextColor={theme.textFaint}
          style={{ fontWeight: '900', fontSize: 20, color: theme.text, padding: 0 }}
        />
      </View>

      <SectionLabel>Category</SectionLabel>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(categories ?? []).map(c => {
            const selected = categoryId === c.id;
            return (
              <TouchableOpacity
                key={c.id}
                onPress={() => setCategoryId(c.id)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: selected ? theme.teal : theme.surface, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9 }}>
                <AppText size={11} weight="800" color={selected ? theme.onAccent : theme.textDim}>
                  {c.icon}
                </AppText>
                <AppText size={12} weight="700" color={selected ? theme.onAccent : theme.text}>
                  {c.label}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <SectionLabel>Paid by</SectionLabel>
      <TouchableOpacity
        onPress={() => setPickerOpen(true)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: theme.surface, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 20 }}>
        {paidByMember ? <Avatar initials={paidByMember.initials} bg={paidByMember.avatarBg} size={32} /> : null}
        <AppText size={13} weight="700">
          {paidByMember?.name ?? 'Choose'}
        </AppText>
        <AppText size={13} weight="700" color={theme.textFaint} style={{ marginLeft: 'auto' }}>
          Change ›
        </AppText>
      </TouchableOpacity>

      <SectionLabel>Split</SectionLabel>
      <View style={{ flexDirection: 'row', backgroundColor: theme.surface, borderRadius: 14, padding: 4, marginBottom: 14 }}>
        {(['equal', 'unequal'] as const).map(t => {
          const active = splitType === t;
          return (
            <TouchableOpacity
              key={t}
              onPress={() => setSplitType(t)}
              style={{ flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 11, backgroundColor: active ? theme.teal : 'transparent' }}>
              <AppText size={12} weight="800" color={active ? theme.onAccent : theme.textDim}>
                {t === 'equal' ? 'Equally' : 'Unequally'}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <AppText size={11} weight="700" color={theme.textFaint} style={{ textTransform: 'uppercase', letterSpacing: 0.3 }}>
          Split between
        </AppText>
        <TouchableOpacity onPress={toggleAll}>
          <AppText size={12} weight="800" color={theme.teal}>
            {allChecked ? 'Deselect all' : 'Select all'}
          </AppText>
        </TouchableOpacity>
      </View>

      {loading ? <Loading /> : null}
      {(members ?? []).map(m => {
        const checked = participantChecks[m.id];
        return (
          <TouchableOpacity
            key={m.id}
            onPress={() => toggle(m.id)}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.border }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Avatar initials={m.initials} bg={m.avatarBg} size={30} textSize={11} />
              <AppText size={13} weight="700">
                {m.name}
              </AppText>
            </View>
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 7,
                backgroundColor: checked ? theme.teal : theme.surface,
                borderWidth: checked ? 0 : 1,
                borderColor: theme.border,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              {checked ? <AppText size={12} weight="800" color={theme.onAccent}>✓</AppText> : null}
            </View>
          </TouchableOpacity>
        );
      })}

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
        <View style={{ flex: 1, backgroundColor: theme.surface, borderRadius: 12, paddingVertical: 13, alignItems: 'center' }}>
          <AppText size={12} weight="800">
            📷 Add photo
          </AppText>
        </View>
        <TouchableOpacity
          onPress={() => nav.push('ScanReceipt', { id: groupId })}
          style={{ flex: 1, backgroundColor: theme.tealBg, borderRadius: 12, paddingVertical: 13, alignItems: 'center' }}>
          <AppText size={12} weight="800" color={theme.tealText}>
            Scan receipt
          </AppText>
        </TouchableOpacity>
      </View>

      <PaidByPicker
        open={pickerOpen}
        members={members ?? []}
        selected={paidBy}
        onClose={() => setPickerOpen(false)}
        onChoose={id => {
          setPaidBy(id);
          setPickerOpen(false);
        }}
      />
    </Screen>
  );
}

function PaidByPicker({
  open,
  members,
  selected,
  onClose,
  onChoose,
}: {
  open: boolean;
  members: Member[];
  selected: string;
  onClose: () => void;
  onChoose: (id: string) => void;
}) {
  const { theme } = useTheme();
  return (
    <Modal visible={open} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: theme.bg, paddingHorizontal: 22, paddingTop: 60 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 22 }}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <AppText size={22} weight="700" color={theme.textDim}>
              ‹
            </AppText>
          </TouchableOpacity>
          <AppText size={18} weight="800">
            Who paid?
          </AppText>
        </View>
        {members.map(m => {
          const isSel = m.id === selected;
          return (
            <TouchableOpacity
              key={m.id}
              onPress={() => onChoose(m.id)}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: theme.border, backgroundColor: isSel ? theme.tealBg : 'transparent', borderRadius: isSel ? 12 : 0, paddingHorizontal: isSel ? 10 : 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Avatar initials={m.initials} bg={m.avatarBg} size={38} radius={13} textSize={13} />
                <AppText size={14} weight="700">
                  {m.name}
                </AppText>
              </View>
              {isSel ? (
                <AppText size={15} weight="800" color={theme.teal}>
                  ✓
                </AppText>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>
    </Modal>
  );
}
