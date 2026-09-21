/**
 * DividSplit — split shared expenses with flatmates & friends.
 *
 * Navigation is react-navigation (native-stack + a nested bottom-tabs
 * navigator for the four top-level sections). All data and auth come from
 * the mock API server in /server (static JSON responses).
 */

import React from 'react';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/auth/AuthContext';
import { Loading } from './src/components/primitives';
import { RootStackParamList, TabParamList } from './src/nav/navigation';
import { navigationRef } from './src/nav/navigationRef';
import { TabBar } from './src/nav/TabBar';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';

import LoginScreen from './src/screens/LoginScreen';
import ProfileSetupScreen from './src/screens/ProfileSetupScreen';
import GroupsScreen from './src/screens/GroupsScreen';
import FriendsScreen from './src/screens/FriendsScreen';
import ActivityScreen from './src/screens/ActivityScreen';
import AccountScreen from './src/screens/AccountScreen';
import ScanCodeScreen from './src/screens/ScanCodeScreen';
import GroupDetailScreen from './src/screens/GroupDetailScreen';
import CreateGroupScreen from './src/screens/CreateGroupScreen';
import AddExpenseScreen from './src/screens/AddExpenseScreen';
import SplitUnevenScreen from './src/screens/SplitUnevenScreen';
import ExpenseDetailScreen from './src/screens/ExpenseDetailScreen';
import SettleUpScreen from './src/screens/SettleUpScreen';
import SearchScreen from './src/screens/SearchScreen';
import ScanReceiptScreen from './src/screens/ScanReceiptScreen';
import ScanReviewScreen from './src/screens/ScanReviewScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function Tabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }} tabBar={props => <TabBar {...props} />}>
      <Tab.Screen name="Groups" component={GroupsScreen} />
      <Tab.Screen name="Friends" component={FriendsScreen} />
      <Tab.Screen name="Activity" component={ActivityScreen} />
      <Tab.Screen name="Account" component={AccountScreen} />
    </Tab.Navigator>
  );
}

/**
 * Gates the navigator on AuthContext's session restore, so the app either
 * lands directly on Tabs (restored session) or Login (none) with no visible
 * flash between the two.
 */
function RootNavigator() {
  const { theme } = useTheme();
  const { isRestoring, token } = useAuth();

  if (isRestoring) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: theme.bg }}>
        <Loading />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator initialRouteName={token ? 'Tabs' : 'Login'} screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Tabs" component={Tabs} />
        <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
        <Stack.Screen name="ScanCode" component={ScanCodeScreen} />
        <Stack.Screen name="GroupDetail" component={GroupDetailScreen} />
        <Stack.Screen name="CreateGroup" component={CreateGroupScreen} />
        <Stack.Screen name="AddExpense" component={AddExpenseScreen} />
        <Stack.Screen name="SplitUneven" component={SplitUnevenScreen} />
        <Stack.Screen name="ExpenseDetail" component={ExpenseDetailScreen} />
        <Stack.Screen name="SettleUp" component={SettleUpScreen} />
        <Stack.Screen name="Search" component={SearchScreen} />
        <Stack.Screen name="ScanReceipt" component={ScanReceiptScreen} />
        <Stack.Screen name="ScanReview" component={ScanReviewScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

export default App;
