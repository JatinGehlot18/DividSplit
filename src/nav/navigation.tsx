import {
  CommonActions,
  NavigatorScreenParams,
  StackActions,
  useRoute as useRNRoute,
} from '@react-navigation/native';
import { ReceiptScan } from '../api/types';
import { navigationRef } from './navigationRef';

/**
 * Screens reachable only through the bottom tab bar live in TabParamList and
 * are nested under the root stack's single 'Tabs' entry (see App.tsx). Every
 * other screen is a direct root-stack route.
 */
export type TabParamList = {
  Groups: undefined;
  Friends: undefined;
  Activity: undefined;
  Account: undefined;
};

export type RootStackParamList = {
  Login: undefined;
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  ProfileSetup: undefined;
  ScanCode: undefined;
  GroupDetail: { id: string; name: string };
  CreateGroup: undefined;
  InviteMembers: { id: string; name: string };
  AddExpense: { id: string };
  SplitUneven: {
    id: string;
    description?: string;
    amount?: string;
    categoryId?: string;
    paidBy?: string;
  };
  ExpenseDetail: { groupId: string; expenseId: string };
  SettleUp: { id: string };
  Search: { id: string };
  ScanReceipt: { id: string };
  ScanReview: { id: string; scan: ReceiptScan };
};

type ResettableRoute = keyof RootStackParamList | keyof TabParamList;

const TAB_ROUTES: (keyof TabParamList)[] = ['Groups', 'Friends', 'Activity', 'Account'];

/**
 * Imperative reset usable both from screens (via useNavigation().reset) and
 * from outside the component tree (AuthContext's session-expiry handler).
 * Tab routes don't exist on the root stack directly, so resetting to one
 * dispatches through the nested 'Tabs' screen instead.
 */
export function resetTo(name: ResettableRoute, params?: Record<string, any>) {
  if (!navigationRef.isReady()) return;
  if (TAB_ROUTES.includes(name as keyof TabParamList)) {
    navigationRef.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Tabs', params: { screen: name, params } }],
      }),
    );
  } else {
    navigationRef.dispatch(
      CommonActions.reset({ index: 0, routes: [{ name: name as string, params }] }),
    );
  }
}

export function useNavigation() {
  return {
    push: <T extends keyof RootStackParamList>(name: T, params?: RootStackParamList[T]) =>
      navigationRef.dispatch(StackActions.push(name as string, params)),
    replace: <T extends keyof RootStackParamList>(name: T, params?: RootStackParamList[T]) =>
      navigationRef.dispatch(StackActions.replace(name as string, params)),
    reset: resetTo,
    goBack: () => navigationRef.dispatch(CommonActions.goBack()),
    canGoBack: () => navigationRef.canGoBack(),
  };
}

export function useRoute<T = Record<string, any>>() {
  const route = useRNRoute();
  return { name: route.name, params: (route.params || {}) as T };
}
