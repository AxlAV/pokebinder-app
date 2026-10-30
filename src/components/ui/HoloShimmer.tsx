import React, { useEffect } from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';

interface HoloShimmerProps {
  style?: StyleProp<ViewStyle>;
  /** Duración de un ciclo en milisegundos */
  durationMs?: number;
}

/**
 * Efecto de brillo holográfico / foil para cartas raras y distintivos de álbumes.
 * Recrea el destello diagonal sutil característico de los cromos foil de Pokémon.
 */
export function HoloShimmer({ style, durationMs = 3200 }: HoloShimmerProps) {
  const shimmerTranslate = useSharedValue(-120);

  useEffect(() => {
    shimmerTranslate.value = withRepeat(
      withSequence(
        withTiming(140, {
          duration: durationMs,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(-120, { duration: 0 })
      ),
      -1,
      false
    );
  }, [shimmerTranslate, durationMs]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerTranslate.value }, { rotate: '25deg' }],
  }));

  return (
    <View style={[styles.container, style]} pointerEvents="none">
      <Animated.View style={[styles.shimmerBar, animatedStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  shimmerBar: {
    width: 32,
    height: '240%',
    top: '-70%',
    backgroundColor: 'rgba(229, 169, 60, 0.18)',
  },
});
