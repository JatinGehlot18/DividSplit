export type Member = {
  id: string;
  name: string;
  first: string;
  initials: string;
  avatarBg: string;
  email: string;
  isMe?: boolean;
};

export type User = Member & { profilePictureUrl?: string };

/** Raw shape returned by GET/PUT /api/users (Swagger: UserSummary). */
export type UserSummary = {
  id: string;
  email: string;
  displayName: string;
  profilePictureUrl?: string;
};

/** Raw shape returned by /api/auth/{register,login,refresh,google} (Swagger: AuthResponse). */
export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
};

export type Group = {
  id: string;
  name: string;
  memberLabel: string;
  net: number;
  tint: string;
  emoji: string;
  favorite: boolean;
};

export type BalanceRow = {
  id: string;
  label: string;
  initials: string;
  avatarBg: string;
  direction: 'owe' | 'owed';
  amount: number;
};

export type Expense = {
  id: string;
  title: string;
  category: string;
  paidByName: string;
  amount: number;
  tint: string;
  icon: string;
  date: string;
};

export type GroupDetail = Group & {
  members: Member[];
  balances: { overallOwed: number; rows: BalanceRow[] };
  expenses: Expense[];
};

export type ExpenseDetail = {
  id: string;
  title: string;
  category: string;
  amount: number;
  icon: string;
  tint: string;
  paidByName: string;
  splitLabel: string;
  addedAt: string;
  hasReceipt: boolean;
  split: { name: string; amount: number }[];
};

export type Category = { id: string; label: string; icon: string; tint: string };

export type ReceiptScan = {
  merchant: string;
  amount: number;
  category: string;
  date: string;
  targetGroup: string;
};

/** Raw shape returned by GET /api/friends/requests (Swagger: FriendRequestView). */
export type FriendRequestView = {
  friendshipId: string;
  otherUser: UserSummary;
  status: 'PENDING' | 'ACCEPTED';
  incoming: boolean;
};

export type FriendRequest = {
  friendshipId: string;
  person: Member;
  incoming: boolean;
};

/** A person you share expenses with and your net balance with them (positive = they owe you). */
export type PersonBalance = { person: Member; amount: number };

/** Raw shape returned by GET /api/notifications (Swagger: NotificationView). */
export type NotificationView = {
  id: string;
  type:
    | 'EXPENSE_ADDED'
    | 'EXPENSE_UPDATED'
    | 'EXPENSE_DELETED'
    | 'SETTLEMENT_RECORDED'
    | 'ADDED_TO_GROUP'
    | 'FRIEND_REQUEST'
    | 'FRIEND_ACCEPTED'
    | 'COMMENT_ADDED';
  message: string;
  actorId?: string;
  groupId?: string;
  expenseId?: string;
  read: boolean;
  createdAt: string;
};

export type ActivityItem = {
  id: string;
  message: string;
  read: boolean;
  when: string;
  icon: string;
};
