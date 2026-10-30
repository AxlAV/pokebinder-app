import React from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable);

export interface AnimatedPressableProps extends PressableProps {
  scaleDownTo?: number;
  style?: StyleProp<ViewStyle>;
  className?: string;
  children: React.ReactNode;
}

/**
 * Componente Pressable táctil con microinteracción física basada en resortes (Spring).
 * Ofrece retroalimentación háptica visual inmediata al pulsar botones y tarjetas.
 */
export function AnimatedPressable({
  scaleDownTo = 0.96,
  style,
  className,
  onPressIn,
  onPressOut,
  children,
  ...props
}: AnimatedPressableProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <AnimatedPressableBase
      {...props}
      className={className}
      style={[style, animatedStyle]}
      onPressIn={(e) => {
        scale.value = withSpring(scaleDownTo, { damping: 14, stiffness: 320 });
        opacity.value = withTiming(0.85, { duration: 80 });
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, { damping: 14, stiffness: 320 });
        opacity.value = withTiming(1, { duration: 120 });
        onPressOut?.(e);
      }}
    >
      {children}
    </AnimatedPressableBase>
  );
}
