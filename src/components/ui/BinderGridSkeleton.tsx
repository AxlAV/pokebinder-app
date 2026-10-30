import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { TOKENS } from '@/theme/tokens';

interface BinderGridSkeletonProps {
  pageLabel?: string;
}

const POCKET_SLOTS = ['001', '002', '003', '004', '005', '006', '007', '008', '009'] as const;

/**
 * Esqueleto de carga animado con la forma real de una hoja de carpeta Ultra PRO (3x3 bolsillos 5:7).
 */
export function BinderGridSkeleton({
  pageLabel = 'HOJA 3×3 // SINCRONIZANDO',
}: BinderGridSkeletonProps) {
  const pulseOpacity = useSharedValue(0.45);

  useEffect(() => {
    pulseOpacity.value = withRepeat(
      withTiming(0.95, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [pulseOpacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          backgroundColor: TOKENS.bgPage,
          borderColor: TOKENS.borderSubtle,
          borderWidth: 1,
          borderRadius: 12,
          padding: 12,
        },
        animatedStyle,
      ]}
      className="bg-page border border-stitch rounded-card p-3"
    >
      <View
        className="flex-row items-center justify-between mb-2.5 pb-2 border-b border-stitch"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
          paddingBottom: 8,
          borderBottomColor: TOKENS.borderSubtle,
          borderBottomWidth: 1,
        }}
      >
        <Text
          className="font-mono text-xs text-muted tracking-wider"
          style={{ color: TOKENS.textMuted, fontSize: 11, letterSpacing: 0.8 }}
        >
          {pageLabel}
        </Text>
        <View
          className="h-3 w-16 rounded-pocket bg-pocket border border-stitch"
          style={{
            height: 12,
            width: 64,
            borderRadius: 4,
            backgroundColor: TOKENS.bgPocket,
            borderColor: TOKENS.borderSubtle,
            borderWidth: 1,
          }}
        />
      </View>

      <View className="flex-row flex-wrap -mx-1" style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 }}>
        {POCKET_SLOTS.map((slot) => (
          <View key={slot} className="w-1/3 p-1" style={{ width: '33.3333%', padding: 4 }}>
            <View
              style={{
                aspectRatio: 5 / 7,
                backgroundColor: TOKENS.bgPocket,
                borderColor: TOKENS.borderSubtle,
                borderWidth: 1,
                borderRadius: 6,
                padding: 8,
                justifyContent: 'space-between',
              }}
              className="bg-pocket border border-stitch rounded-pocket p-2 justify-between"
            >
              <View
                className="flex-row justify-between items-center"
                style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <View
                  className="h-2 w-10 rounded-pocket bg-page"
                  style={{ height: 8, width: 40, borderRadius: 3, backgroundColor: TOKENS.bgPage }}
                />
                <View
                  className="h-2 w-2 rounded-full bg-page"
                  style={{ height: 8, width: 8, borderRadius: 4, backgroundColor: TOKENS.bgPage }}
                />
              </View>
              <View
                className="my-auto h-10 rounded-pocket bg-page/60 border border-stitch/50"
                style={{
                  height: 40,
                  marginVertical: 'auto',
                  borderRadius: 6,
                  backgroundColor: 'rgba(26, 24, 32, 0.6)',
                  borderColor: TOKENS.borderSubtle,
                  borderWidth: 1,
                }}
              />
              <View
                className="flex-row justify-between items-end"
                style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}
              >
                <Text
                  className="font-mono text-[10px] text-muted/60"
                  style={{ color: 'rgba(142, 136, 153, 0.6)', fontSize: 10 }}
                >
                  {slot}/---
                </Text>
                <View
                  className="h-2 w-6 rounded-pocket bg-page"
                  style={{ height: 8, width: 24, borderRadius: 3, backgroundColor: TOKENS.bgPage }}
                />
              </View>
            </View>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}
