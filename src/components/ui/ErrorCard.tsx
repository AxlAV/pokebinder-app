import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { AlertTriangle, RotateCcw } from 'lucide-react-native';
import { TOKENS } from '@/theme/tokens';

interface ErrorCardProps {
  title: string;
  description: string;
  retryLabel?: string;
  onRetry: () => void;
}

/**
 * Tarjeta de error en superficie de hoja con borde de acento lacado y acción de reintento.
 */
export function ErrorCard({
  title,
  description,
  retryLabel = 'Reintentar lectura',
  onRetry,
}: ErrorCardProps) {
  return (
    <View className="bg-page border border-lacquer/60 rounded-card p-4">
      <View className="flex-row items-start gap-3">
        <View className="w-9 h-9 rounded-pocket bg-pocket border border-lacquer/40 items-center justify-center">
          <AlertTriangle size={18} color={TOKENS.accentSecondary} />
        </View>
        <View className="flex-1">
          <Text className="font-display text-base text-ink">{title}</Text>
          <Text className="font-sans text-sm text-muted mt-1 leading-5">{description}</Text>
        </View>
      </View>

      <Pressable
        onPress={onRetry}
        className="mt-4 min-h-[44px] bg-pocket border border-stitch rounded-pocket py-2.5 px-4 flex-row items-center justify-center gap-2 active:opacity-80"
      >
        <RotateCcw size={15} color={TOKENS.accentPrimary} />
        <Text className="font-sans-semi text-xs uppercase tracking-wider text-foil">
          {retryLabel}
        </Text>
      </Pressable>
    </View>
  );
}
