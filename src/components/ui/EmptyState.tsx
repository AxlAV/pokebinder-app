import React from 'react';
import { View, Text, Pressable } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { TOKENS } from '@/theme/tokens';

interface EmptyStateProps {
  icon: LucideIcon;
  badge?: string;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

/**
 * Estado vacío con contexto coleccionista y acción sugerida.
 */
export function EmptyState({
  icon: Icon,
  badge,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
}: EmptyStateProps) {
  return (
    <View className="bg-page border border-stitch rounded-card p-4">
      <View className="flex-row items-center justify-between mb-3">
        <View className="w-10 h-10 rounded-pocket bg-pocket border border-stitch items-center justify-center">
          <Icon size={20} color={TOKENS.accentPrimary} />
        </View>
        {badge ? (
          <View className="bg-pocket border border-stitch rounded-pocket px-2.5 py-1">
            <Text className="font-mono text-[11px] text-foil">{badge}</Text>
          </View>
        ) : null}
      </View>

      <Text className="font-display text-lg text-ink">{title}</Text>
      <Text className="font-sans text-sm text-muted mt-1.5 leading-5">{description}</Text>

      <View className="mt-4 flex-row flex-wrap gap-2">
        <Pressable
          onPress={onAction}
          className="min-h-[44px] bg-foil rounded-pocket py-2.5 px-4 items-center justify-center active:opacity-85"
        >
          <Text className="font-sans-semi text-xs uppercase tracking-wider text-binder">
            {actionLabel}
          </Text>
        </Pressable>

        {secondaryActionLabel && onSecondaryAction ? (
          <Pressable
            onPress={onSecondaryAction}
            className="min-h-[44px] bg-pocket border border-stitch rounded-pocket py-2.5 px-4 items-center justify-center active:opacity-80"
          >
            <Text className="font-sans-medium text-xs uppercase tracking-wider text-ink">
              {secondaryActionLabel}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
