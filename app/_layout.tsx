import '../global.css';
import React, { useState, useEffect, useCallback } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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

  const [fontsLoaded] = useFonts({
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    JetBrainsMono_400Regular,
    JetBrainsMono_600SemiBold,
  });

  if (!fontsLoaded || (!dbReady && !dbError)) {
    return (
      <View className="flex-1 bg-binder items-center justify-center">
        <StatusBar style="light" />
        <ActivityIndicator color={TOKENS.accentPrimary} size="small" />
      </View>
    );
  }

  if (dbError) {
    return (
      <View className="flex-1 bg-binder justify-center p-4">
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
    <QueryClientProvider client={queryClient}>
      <View className="flex-1 bg-binder">
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
  );
}
