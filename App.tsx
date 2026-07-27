/**
 * Splitkaro — split shared expenses with flatmates & friends.
 *
 * Navigation is react-navigation (native-stack + a nested bottom-tabs
 * navigator for the four top-level sections). All data and auth come from
 * the mock API server in /server (static JSON responses).
 */

import React, { useEffect } from 'react';
import { AppState, AppStateStatus, Platform, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { focusManager, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/auth/AuthContext';
import { Loading } from './src/components/primitives';
import { RootStackParamList, TabParamList } from './src/nav/navigation';
import { navigationRef } from './src/nav/navigationRef';
import { rootScreens } from './src/nav/screens';
import { TabBar } from './src/nav/TabBar';
import { queryClient } from './src/query/queryClient';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';

import GroupsScreen from './src/screens/GroupsScreen';
import FriendsScreen from './src/screens/FriendsScreen';
import ActivityScreen from './src/screens/ActivityScreen';
import AccountScreen from './src/screens/AccountScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

/** React Query only knows "focused" via this listener — without it, RN never refetches on app foreground. */
function onAppStateChange(status: AppStateStatus) {
  if (Platform.OS !== 'web') {
    focusManager.setFocused(status === 'active');
  }
}
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
        <Stack.Screen name="Tabs" component={Tabs} />
        {(Object.keys(rootScreens) as (keyof typeof rootScreens)[]).map(name => (
          <Stack.Screen key={name} name={name} component={rootScreens[name]} />
        ))}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function App() {
  useEffect(() => {
    const subscription = AppState.addEventListener('change', onAppStateChange);
    return () => subscription.remove();
  }, []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

export default App;
