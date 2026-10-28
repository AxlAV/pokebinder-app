import '../global.css';
import React, { useState, useEffect, useCallback } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import {
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_600SemiBold,
} from '@expo-google-fonts/jetbrains-mono';
import { runDatabaseMigrations } from '@/db/client';
import { ErrorCard } from '@/components/ui/ErrorCard';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { TOKENS } from '@/theme/tokens';

export default function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [fontTimeout, setFontTimeout] = useState(false);

  const initDatabase = useCallback(() => {
    try {
      setDbError(null);
      runDatabaseMigrations();
      setDbReady(true);
    } catch (error) {
      setDbError(
        error instanceof Error
          ? error.message
          : 'Error al inicializar SQLite local'
      );
    }
  }, []);

  useEffect(() => {
    initDatabase();
  }, [initDatabase]);

  // Si la carga de fuentes tarda más de 1.2 segundos (ej. sin red), continúa con fuentes de sistema
  useEffect(() => {
    const timer = setTimeout(() => {
      setFontTimeout(true);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  const [fontsLoaded, fontError] = useFonts({
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    JetBrainsMono_400Regular,
    JetBrainsMono_600SemiBold,
  });

  const fontsSettled = fontsLoaded || fontError != null || fontTimeout;

  if (!fontsSettled || (!dbReady && !dbError)) {
    return (
      <View
        className="flex-1 bg-binder items-center justify-center"
        style={{ flex: 1, backgroundColor: TOKENS.bgBinder, justifyContent: 'center', alignItems: 'center' }}
      >
        <StatusBar style="light" />
        <ActivityIndicator color={TOKENS.accentPrimary} size="large" />
      </View>
    );
  }

  if (dbError) {
    return (
      <View
        className="flex-1 bg-binder justify-center p-4"
        style={{ flex: 1, backgroundColor: TOKENS.bgBinder, justifyContent: 'center', padding: 16 }}
      >
        <StatusBar style="light" />
        <ErrorCard
          title="Fallo al inicializar la base de datos local"
          description={dbError}
          retryLabel="Reintentar migración SQLite"
          onRetry={initDatabase}
        />
      </View>
    );
  }

  return (
    <SafeAreaProvider style={{ flex: 1, backgroundColor: TOKENS.bgBinder }}>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <View
            className="flex-1 bg-binder"
            style={{ flex: 1, backgroundColor: TOKENS.bgBinder }}
          >
            <StatusBar style="light" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: TOKENS.bgBinder },
              }}
            >
              <Stack.Screen name="(tabs)" />
            </Stack>
          </View>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
