import React, { useEffect } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, LogBox } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { AuthProvider } from './src/context/AuthContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { theme } from './src/theme';
import { app as firebaseApp } from './src/services/firebase';

// Ignore non-fatal push notification banner in Expo Go
LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
  'Android Push notifications (remote notifications)',
]);

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    // Startup Diagnostics (WITHOUT exposing sensitive secrets)
    const isExpoGo =
      Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
    const sdkVersion =
      Constants.expoConfig?.sdkVersion ||
      Constants.manifest2?.extra?.expoClient?.sdkVersion ||
      '57.0.0';

    console.log('=== [Sabena CRM Startup Diagnostics] ===');
    console.log('  Expo SDK Version:', sdkVersion);
    console.log('  Execution Environment:', isExpoGo ? 'Expo Go' : 'Custom Development Build / Bare');
    console.log('  Firebase App Initialized:', Boolean(firebaseApp && firebaseApp.name));
    if (fontError) {
      console.warn('  Fonts loaded with fallback due to error:', fontError);
    }
    console.log('========================================');
  }, [fontError]);

  if (!fontsLoaded && !fontError) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={styles.container}>
        <SafeAreaProvider>
          <AuthProvider>
            <NavigationContainer>
              <RootNavigator />
              <StatusBar style="dark" />
            </NavigationContainer>
          </AuthProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
});
