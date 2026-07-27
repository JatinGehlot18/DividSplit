import { api, graphql } from './client';
import { avatarColorFor, initialsOf, longDate, shortDate, timeAgo } from '../util/format';
import {
  ActivityItem,
  AuthResponse,
  BalanceRow,
  Category,
  Expense,
  ExpenseDetail,
  FriendRequest,
  FriendRequestView,
  Group,
  GroupDetail,
  Member,
  NotificationView,
  PersonBalance,
  ReceiptScan,
  User,
  UserSummary,
} from './types';

/** Maps a raw backend user onto the Member-shaped type used across the UI. */
function memberFrom(summary: UserSummary, meId?: string): Member {
  return {
    id: summary.id,
    name: summary.displayName,
    first: summary.displayName.split(/\s+/)[0] ?? summary.displayName,
    initials: initialsOf(summary.displayName),
    avatarBg: avatarColorFor(summary.id),
    email: summary.email,
    isMe: meId ? summary.id === meId : undefined,
  };
}

/** Maps the backend's UserSummary onto the signed-in User (Member + email). */
export function toUser(summary: UserSummary): User {
  return { ...memberFrom(summary), profilePictureUrl: summary.profilePictureUrl, isMe: true };
}

export const authApi = {
  register: (email: string, password: string, displayName: string) =>
    api.post<AuthResponse>('/api/auth/register', { email, password, displayName }),
  login: (email: string, password: string) =>
    api.post<AuthResponse>('/api/auth/login', { email, password }),
  loginWithGoogle: (idToken: string) =>
    api.post<AuthResponse>('/api/auth/google', { idToken }),
  refresh: (refreshToken: string) =>
    api.post<AuthResponse>('/api/auth/refresh', { refreshToken }),
  logout: (refreshToken: string) =>
    api.post<void>('/api/auth/logout', { refreshToken }),
  logoutAll: (userId: string, token?: string) =>
    api.post<void>(`/api/auth/logout-all?userId=${encodeURIComponent(userId)}`, undefined, token),
  /** Looks up any user by id (e.g. a group member), not just the signed-in one. */
  getUser: (userId: string, token?: string) =>
    api.get<UserSummary>(`/api/users?userId=${encodeURIComponent(userId)}`, token),
  changePassword: (
    userId: string,
    payload: { currentPassword: string; newPassword: string },
    token?: string,
  ) => api.post<void>(`/api/users/password?userId=${encodeURIComponent(userId)}`, payload, token),
};

const ME_FIELDS = 'id email displayName profilePictureUrl';

/** Signed-in user's own profile, backed by GraphQL (no userId needed — scoped by the bearer token). */
export const profileApi = {
  me: (token: string) =>
    graphql<{ me: UserSummary }>(`query { me { ${ME_FIELDS} } }`, undefined, token).then(d => d.me),
  updateProfile: (input: { displayName: string; profilePictureUrl?: string }, token: string) =>
    graphql<{ updateProfile: UserSummary }>(
      `mutation($input: UpdateProfileInput!) { updateProfile(input: $input) { ${ME_FIELDS} } }`,
      { input },
      token,
    ).then(d => d.updateProfile),
};

// ---- Groups / expenses / settlements (all GraphQL) --------------------------------------

type GqlUser = UserSummary;
type GqlGroup = {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  emoji: string | null;
  favorite: boolean;
  netBalance: number;
  members: GqlUser[];
};
type GqlCategory = { id: string; name: string; icon: string | null };
type GqlExpense = {
  id: string;
  description: string;
  amount: number;
  expenseDate: string;
  splitType: 'EQUAL' | 'EXACT' | 'PERCENTAGE';
  paidBy: GqlUser;
  category: GqlCategory | null;
  splits?: { user: GqlUser; amountOwed: number }[];
};

const USER_FIELDS = 'id email displayName profilePictureUrl';
const GROUP_FIELDS = `id name description color emoji favorite netBalance members { ${USER_FIELDS} }`;
const EXPENSE_LIST_FIELDS = `id description amount expenseDate splitType paidBy { ${USER_FIELDS} } category { id name icon }`;

/** Deterministic color for a category chip/expense icon tile (backend doesn't supply one). */
function categoryTint(categoryId?: string | null): string {
  return categoryId ? avatarColorFor(categoryId) : '#8AB4F8';
}

/** React Native's style system only understands hex/rgb(a)/hsl(a)/named colors — not e.g. oklch(). */
function isRenderableColor(c?: string | null): c is string {
  return !!c && /^(#|rgb|hsl)/i.test(c.trim());
}

function toGroup(g: GqlGroup): Group {
  const count = g.members.length;
  return {
    id: g.id,
    name: g.name,
    memberLabel: `${count} member${count === 1 ? '' : 's'}`,
    net: Number(g.netBalance),
    tint: isRenderableColor(g.color) ? g.color : avatarColorFor(g.id),
    emoji: g.emoji || '💰',
    favorite: g.favorite,
  };
}

function toExpenseListItem(e: GqlExpense): Expense {
  return {
    id: e.id,
    title: e.description,
    category: e.category?.name ?? 'Other',
    paidByName: e.paidBy.displayName,
    amount: Number(e.amount),
    tint: categoryTint(e.category?.id),
    icon: e.category?.icon || '🧾',
    date: shortDate(e.expenseDate),
  };
}

/** Shared by groupsApi.detail (full group view) and groupsApi.suggestionsBatch (Groups list breakdown lines). */
function toBalanceRows(suggestions: { from: GqlUser; to: GqlUser; amount: number }[], meId: string): BalanceRow[] {
  return suggestions
    .filter(s => s.from.id === meId || s.to.id === meId)
    .map(s => {
      const mine = s.from.id === meId;
      const counterpart = memberFrom(mine ? s.to : s.from);
      return {
        id: counterpart.id,
        label: counterpart.name,
        initials: counterpart.initials,
        avatarBg: counterpart.avatarBg,
        direction: mine ? 'owe' : 'owed',
        amount: Number(s.amount),
      };
    });
}

export const groupsApi = {
  list: (token?: string) =>
    graphql<{ myGroups: GqlGroup[] }>(`query { myGroups { ${GROUP_FIELDS} } }`, undefined, token).then(d =>
      d.myGroups.map(toGroup),
    ),

  detail: async (id: string, meId: string, token?: string): Promise<GroupDetail> => {
    const query = `
      query($id: ID!) {
        group(id: $id) { ${GROUP_FIELDS} }
        expenses: groupExpenses(groupId: $id) { ${EXPENSE_LIST_FIELDS} }
        suggestions: groupSettleSuggestions(groupId: $id) { from { ${USER_FIELDS} } to { ${USER_FIELDS} } amount }
      }
    `;
    const d = await graphql<{
      group: GqlGroup;
      expenses: GqlExpense[];
      suggestions: { from: GqlUser; to: GqlUser; amount: number }[];
    }>(query, { id }, token);

    return {
      ...toGroup(d.group),
      members: d.group.members.map(m => memberFrom(m, meId)),
      // group.netBalance is already "my" net position in this group — groupBalances
      // omits the caller from its own results, so it can't be used for this figure.
      balances: { overallOwed: Number(d.group.netBalance), rows: toBalanceRows(d.suggestions, meId) },
      expenses: d.expenses.map(toExpenseListItem),
    };
  },

  /**
   * Per-counterparty "you owe X / X owes you" lines for every given group, shown on the Groups
   * list. One aliased GraphQL request for all groups instead of one request per group — GraphQL
   * lets a single query ask for N differently-parameterized fields at once via aliases, so this
   * avoids an N+1 round-trip fan-out on a slow backend.
   */
  suggestionsBatch: (groupIds: string[], meId: string, token?: string): Promise<Record<string, BalanceRow[]>> => {
    if (groupIds.length === 0) return Promise.resolve({});
    const varDefs = groupIds.map((_, i) => `$id${i}: ID!`).join(', ');
    const fields = groupIds
      .map(
        (_, i) =>
          `g${i}: groupSettleSuggestions(groupId: $id${i}) { from { ${USER_FIELDS} } to { ${USER_FIELDS} } amount }`,
      )
      .join('\n');
    const variables = Object.fromEntries(groupIds.map((id, i) => [`id${i}`, id]));
    return graphql<Record<string, { from: GqlUser; to: GqlUser; amount: number }[]>>(
      `query(${varDefs}) { ${fields} }`,
      variables,
      token,
    ).then(d => {
      const out: Record<string, BalanceRow[]> = {};
      groupIds.forEach((id, i) => {
        out[id] = toBalanceRows(d[`g${i}`] ?? [], meId);
      });
      return out;
    });
  },

  /** Group members, for participant pickers (add expense / split unevenly). */
  members: (groupId: string, meId?: string, token?: string) =>
    graphql<{ group: { members: GqlUser[] } }>(
      `query($id: ID!) { group(id: $id) { members { ${USER_FIELDS} } } }`,
      { id: groupId },
      token,
    ).then(d => d.group.members.map(m => memberFrom(m, meId))),

  toggleFavorite: (id: string, favorite: boolean, token?: string) =>
    graphql<{ setGroupFavorite: { favorite: boolean } }>(
      `mutation($id: ID!, $favorite: Boolean!) { setGroupFavorite(groupId: $id, favorite: $favorite) { favorite } }`,
      { id, favorite },
      token,
    ).then(d => ({ id, favorite: d.setGroupFavorite.favorite })),

  create: async (
    payload: { name: string; color: string; emoji: string },
    token?: string,
  ): Promise<{ group: Group }> => {
    const d = await graphql<{ createGroup: GqlGroup }>(
      `mutation($input: CreateGroupInput!) { createGroup(input: $input) { ${GROUP_FIELDS} } }`,
      { input: { name: payload.name, color: payload.color, emoji: payload.emoji } },
      token,
    );
    return { group: toGroup(d.createGroup) };
  },

  addMember: (groupId: string, email: string, token?: string) =>
    graphql<{ addGroupMember: { id: string } }>(
      `mutation($id: ID!, $email: String!) { addGroupMember(groupId: $id, email: $email) { id } }`,
      { id: groupId, email },
      token,
    ),

  /**
   * Generates a shareable join link for the group (Copy link / WhatsApp on the
   * post-create invite step). Requires the `createGroupInviteLink` mutation —
   * see INVITE_LINK_SPEC.txt in the backend repo for the server-side piece.
   */
  createInviteLink: (groupId: string, token?: string) =>
    graphql<{ createGroupInviteLink: { token: string; expiresAt: string } }>(
      `mutation($id: ID!) { createGroupInviteLink(groupId: $id) { token expiresAt } }`,
      { id: groupId },
      token,
    ).then(d => d.createGroupInviteLink),

  /** No server-side search endpoint — filters the group's expenses client-side. */
  search: async (groupId: string, q: string, token?: string) => {
    const d = await graphql<{ groupExpenses: GqlExpense[] }>(
      `query($id: ID!) { groupExpenses(groupId: $id) { ${EXPENSE_LIST_FIELDS} } }`,
      { id: groupId },
      token,
    );
    const query = q.trim().toLowerCase();
    const all = d.groupExpenses.map(toExpenseListItem);
    return { query: q, results: query ? all.filter(e => e.title.toLowerCase().includes(query)) : all };
  },

  expenseDetail: (expenseId: string, token?: string): Promise<ExpenseDetail> =>
    graphql<{ expense: GqlExpense & { splits: { user: GqlUser; amountOwed: number }[] } }>(
      `query($id: ID!) {
        expense(id: $id) {
          id description amount expenseDate splitType
          paidBy { ${USER_FIELDS} }
          category { id name icon }
          splits { user { ${USER_FIELDS} } amountOwed }
        }
      }`,
      { id: expenseId },
      token,
    ).then(d => {
      const e = d.expense;
      return {
        id: e.id,
        title: e.description,
        category: e.category?.name ?? 'Other',
        amount: Number(e.amount),
        icon: e.category?.icon || '🧾',
        tint: categoryTint(e.category?.id),
        paidByName: e.paidBy.displayName,
        splitLabel: `${e.splitType === 'EQUAL' ? 'split equally' : 'split unevenly'} · ${e.splits.length} people`,
        addedAt: `Added ${longDate(e.expenseDate)}`,
        hasReceipt: false,
        split: e.splits.map(s => ({ name: s.user.displayName, amount: Number(s.amountOwed) })),
      };
    }),
};

export const categoriesApi = {
  list: (token?: string) =>
    graphql<{ categories: GqlCategory[] }>(`query { categories { id name icon } }`, undefined, token).then(d =>
      d.categories.map((c): Category => ({ id: c.id, label: c.name, icon: c.icon || '🏷️', tint: categoryTint(c.id) })),
    ),
};

export const expensesApi = {
  create: (
    input: {
      groupId: string;
      description: string;
      amount: number;
      paidBy?: string;
      splitType: 'EQUAL' | 'EXACT';
      participants: { userId: string; value?: number }[];
      categoryId?: string;
    },
    token?: string,
  ) =>
    graphql<{ addExpense: { id: string } }>(
      `mutation($input: AddExpenseInput!) { addExpense(input: $input) { id } }`,
      { input: { ...input, currency: 'INR' } },
      token,
    ).then(d => ({ id: d.addExpense.id, saved: true })),
};

export const settlementsApi = {
  record: (payload: { groupId: string; receiverId: string; amount: number; note?: string }, token?: string) =>
    graphql<{ recordSettlement: { id: string } }>(
      `mutation($input: RecordSettlementInput!) { recordSettlement(input: $input) { id } }`,
      { input: payload },
      token,
    ).then(d => ({ id: d.recordSettlement.id, recorded: true })),
};

export const receiptsApi = {
  scan: (): Promise<ReceiptScan> =>
    Promise.reject(new Error('Receipt scanning isn’t available yet — the API has no OCR endpoint.')),
};

function toFriendRequest(r: FriendRequestView): FriendRequest {
  return { friendshipId: r.friendshipId, person: memberFrom(r.otherUser), incoming: r.incoming };
}

export const friendsApi = {
  list: (userId: string, token?: string) =>
    api.get<UserSummary[]>(`/api/friends?userId=${encodeURIComponent(userId)}`, token).then(list => list.map(u => memberFrom(u))),
  pendingRequests: (userId: string, token?: string) =>
    api
      .get<FriendRequestView[]>(`/api/friends/requests?userId=${encodeURIComponent(userId)}`, token)
      .then(list => list.map(toFriendRequest)),
  sendRequest: (userId: string, email: string, token?: string) =>
    api.post<FriendRequestView>(`/api/friends/requests?userId=${encodeURIComponent(userId)}`, { email }, token).then(toFriendRequest),
  accept: (userId: string, friendshipId: string, token?: string) =>
    api
      .post<FriendRequestView>(
        `/api/friends/requests/${encodeURIComponent(friendshipId)}/accept?userId=${encodeURIComponent(userId)}`,
        undefined,
        token,
      )
      .then(toFriendRequest),
  remove: (userId: string, friendshipId: string, token?: string) =>
    api.del<void>(`/api/friends/${encodeURIComponent(friendshipId)}?userId=${encodeURIComponent(userId)}`, token),
  /**
   * Net balance with every person you share expenses with — not just accepted
   * friends (GraphQL `overallBalances`, scoped by the bearer token). Positive
   * = they owe you, negative = you owe them. Zero balances are dropped.
   */
  balances: (token?: string): Promise<PersonBalance[]> =>
    graphql<{ overallBalances: { user: UserSummary; netAmount: number }[] }>(
      `query { overallBalances { user { ${USER_FIELDS} } netAmount } }`,
      undefined,
      token,
    ).then(d =>
      d.overallBalances
        .map(b => ({ person: memberFrom(b.user), amount: Number(b.netAmount) }))
        .filter(b => b.amount !== 0)
        .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount)),
    ),
};

const NOTIFICATION_ICONS: Record<NotificationView['type'], string> = {
  EXPENSE_ADDED: '🧾',
  EXPENSE_UPDATED: '✏️',
  EXPENSE_DELETED: '🗑️',
  SETTLEMENT_RECORDED: '🤝',
  ADDED_TO_GROUP: '👥',
  FRIEND_REQUEST: '👋',
  FRIEND_ACCEPTED: '✅',
  COMMENT_ADDED: '💬',
};

function toActivityItem(n: NotificationView): ActivityItem {
  return { id: n.id, message: n.message, read: n.read, when: timeAgo(n.createdAt), icon: NOTIFICATION_ICONS[n.type] ?? '🔔' };
}

export const notificationsApi = {
  list: (userId: string, token?: string) =>
    api.get<NotificationView[]>(`/api/notifications?userId=${encodeURIComponent(userId)}`, token).then(list => list.map(toActivityItem)),
  unreadCount: (userId: string, token?: string) =>
    api
      .get<Record<string, number>>(`/api/notifications/unread-count?userId=${encodeURIComponent(userId)}`, token)
      .then(d => Object.values(d)[0] ?? 0),
  markRead: (userId: string, notificationId: string, token?: string) =>
    api.post<void>(`/api/notifications/${encodeURIComponent(notificationId)}/read?userId=${encodeURIComponent(userId)}`, undefined, token),
  markAllRead: (userId: string, token?: string) =>
    api.post<void>(`/api/notifications/read-all?userId=${encodeURIComponent(userId)}`, undefined, token),
};
