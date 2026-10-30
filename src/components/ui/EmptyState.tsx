import React from 'react';
import { View, Text } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import type { LucideIcon } from 'lucide-react-native';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
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
 * Estado vacío con contexto coleccionista, microinteracción táctil y acción sugerida.
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
    <Animated.View
      entering={FadeInUp.duration(280).springify()}
      className="bg-page border border-stitch rounded-card p-4"
      style={{
        backgroundColor: TOKENS.bgPage,
        borderColor: TOKENS.borderSubtle,
        borderWidth: 1,
        borderRadius: 12,
        padding: 16,
      }}
    >
      <View
        className="flex-row items-center justify-between mb-3"
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}
      >
        <View
          className="w-10 h-10 rounded-pocket bg-pocket border border-stitch items-center justify-center"
          style={{
            width: 40,
            height: 40,
            borderRadius: 6,
            backgroundColor: TOKENS.bgPocket,
            borderColor: TOKENS.borderSubtle,
            borderWidth: 1,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={20} color={TOKENS.accentPrimary} />
        </View>
        {badge ? (
          <View
            className="bg-pocket border border-stitch rounded-pocket px-2.5 py-1"
            style={{
              backgroundColor: TOKENS.bgPocket,
              borderColor: TOKENS.borderSubtle,
              borderWidth: 1,
              borderRadius: 6,
              paddingHorizontal: 10,
              paddingVertical: 4,
            }}
          >
            <Text
              className="font-mono text-[11px] text-foil"
              style={{ color: TOKENS.accentPrimary, fontSize: 11 }}
            >
              {badge}
            </Text>
          </View>
        ) : null}
      </View>

      <Text
        className="font-display text-lg text-ink"
        style={{ color: TOKENS.textPrimary, fontSize: 18, fontWeight: '700' }}
      >
        {title}
      </Text>
      <Text
        className="font-sans text-sm text-muted mt-1.5 leading-5"
        style={{ color: TOKENS.textMuted, fontSize: 13, marginTop: 6, lineHeight: 18 }}
      >
        {description}
      </Text>

      <View
        className="mt-4 flex-row flex-wrap gap-2"
        style={{ marginTop: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}
      >
        <AnimatedPressable
          onPress={onAction}
          className="min-h-[44px] bg-foil rounded-pocket py-2.5 px-4 items-center justify-center active:opacity-85"
          style={{
            minHeight: 44,
            backgroundColor: TOKENS.accentPrimary,
            borderRadius: 6,
            paddingVertical: 10,
            paddingHorizontal: 16,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            className="font-sans-semi text-xs uppercase tracking-wider text-binder"
            style={{ color: TOKENS.bgBinder, fontSize: 12, fontWeight: '700', letterSpacing: 0.5 }}
          >
            {actionLabel}
          </Text>
        </AnimatedPressable>

        {secondaryActionLabel && onSecondaryAction ? (
          <AnimatedPressable
            onPress={onSecondaryAction}
            className="min-h-[44px] bg-pocket border border-stitch rounded-pocket py-2.5 px-4 items-center justify-center active:opacity-80"
            style={{
              minHeight: 44,
              backgroundColor: TOKENS.bgPocket,
              borderColor: TOKENS.borderSubtle,
              borderWidth: 1,
              borderRadius: 6,
              paddingVertical: 10,
              paddingHorizontal: 16,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              className="font-sans-semi text-xs uppercase tracking-wider text-ink"
              style={{ color: TOKENS.textPrimary, fontSize: 12, fontWeight: '600', letterSpacing: 0.5 }}
            >
              {secondaryActionLabel}
            </Text>
          </AnimatedPressable>
        ) : null}
      </View>
    </Animated.View>
  );
}
