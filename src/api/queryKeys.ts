/** Central query-key registry so invalidations from one screen reliably hit caches populated by another. */
export const queryKeys = {
  groups: ['groups'] as const,
  group: (id: string) => ['group', id] as const,
  groupMembers: (groupId: string) => ['group', groupId, 'members'] as const,
  /** Namespaced under 'groups' (not 'group') so invalidating the groups list also invalidates this batch. */
  groupSuggestionsBatch: (groupIds: string[], meId: string) =>
    ['groups', 'suggestions', meId, ...[...groupIds].sort()] as const,
  categories: ['categories'] as const,
  expense: (expenseId: string) => ['expense', expenseId] as const,
  friends: (userId: string) => ['friends', userId] as const,
  friendRequests: (userId: string) => ['friendRequests', userId] as const,
  friendBalances: ['friendBalances'] as const,
  notifications: (userId: string) => ['notifications', userId] as const,
};
