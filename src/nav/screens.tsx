import React from 'react';
import { RootStackParamList } from './navigation';

import LoginScreen from '../screens/LoginScreen';
import ProfileSetupScreen from '../screens/ProfileSetupScreen';
import GroupDetailScreen from '../screens/GroupDetailScreen';
import CreateGroupScreen from '../screens/CreateGroupScreen';
import InviteMembersScreen from '../screens/InviteMembersScreen';
import AddExpenseScreen from '../screens/AddExpenseScreen';
import SplitUnevenScreen from '../screens/SplitUnevenScreen';
import ExpenseDetailScreen from '../screens/ExpenseDetailScreen';
import SettleUpScreen from '../screens/SettleUpScreen';
import SearchScreen from '../screens/SearchScreen';
import ScanCodeScreen from '../screens/ScanCodeScreen';
import ScanReceiptScreen from '../screens/ScanReceiptScreen';
import ScanReviewScreen from '../screens/ScanReviewScreen';

/**
 * Route -> screen registry for every root-stack entry except 'Tabs', which is
 * built separately in App.tsx (it nests its own TabParamList navigator rather
 * than a plain screen component). Keeping this in one file/table means adding
 * a screen is a one-line addition here instead of touching App.tsx's JSX.
 */
export const rootScreens: {
  [K in Exclude<keyof RootStackParamList, 'Tabs'>]: React.ComponentType<any>;
} = {
  Login: LoginScreen,
  ProfileSetup: ProfileSetupScreen,
  GroupDetail: GroupDetailScreen,
  CreateGroup: CreateGroupScreen,
  InviteMembers: InviteMembersScreen,
  AddExpense: AddExpenseScreen,
  SplitUneven: SplitUnevenScreen,
  ExpenseDetail: ExpenseDetailScreen,
  SettleUp: SettleUpScreen,
  Search: SearchScreen,
  ScanCode: ScanCodeScreen,
  ScanReceipt: ScanReceiptScreen,
  ScanReview: ScanReviewScreen,
};
