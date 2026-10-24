import React from 'react';
import { View, Text } from 'react-native';

interface ScreenHeaderProps {
  sectionCode: string;
  title: string;
  subtitle: string;
  counterText?: string;
}

/**
 * Cabecera estilo lomo de carpeta Ultra PRO con etiqueta técnica en monospace.
 */
export function ScreenHeader({
  sectionCode,
  title,
  subtitle,
  counterText,
}: ScreenHeaderProps) {
  return (
    <View className="px-3 pt-3 pb-3 border-b border-stitch bg-page">
      <View className="flex-row items-center justify-between">
        <Text className="font-mono text-[11px] uppercase tracking-widest text-foil">
          {sectionCode}
        </Text>
        {counterText ? (
          <View className="bg-pocket border border-stitch rounded-pocket px-2 py-0.5">
            <Text className="font-mono-semi text-[11px] text-ink tabular-nums">
              {counterText}
            </Text>
          </View>
        ) : null}
      </View>
      <Text className="font-display text-2xl text-ink mt-1">{title}</Text>
      <Text className="font-sans text-xs text-muted mt-0.5">{subtitle}</Text>
    </View>
  );
}
