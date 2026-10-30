import React from 'react';
import { View, Text } from 'react-native';
import { TOKENS } from '@/theme/tokens';

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
    <View
      className="px-3 pt-3 pb-3 border-b border-stitch bg-page"
      style={{
        paddingHorizontal: 12,
        paddingTop: 12,
        paddingBottom: 12,
        borderBottomColor: TOKENS.borderSubtle,
        borderBottomWidth: 1,
        backgroundColor: TOKENS.bgPage,
      }}
    >
      <View
        className="flex-row items-center justify-between"
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <Text
          className="font-mono text-[11px] uppercase tracking-widest text-foil"
          style={{
            fontFamily: 'JetBrainsMono_600SemiBold',
            fontSize: 11,
            color: TOKENS.accentPrimary,
            letterSpacing: 1.2,
          }}
        >
          {sectionCode}
        </Text>
        {counterText ? (
          <View
            className="bg-pocket border border-stitch rounded-pocket px-2 py-0.5"
            style={{
              backgroundColor: TOKENS.bgPocket,
              borderColor: TOKENS.borderSubtle,
              borderWidth: 1,
              borderRadius: 6,
              paddingHorizontal: 8,
              paddingVertical: 2,
            }}
          >
            <Text
              className="font-mono-semi text-[11px] text-ink tabular-nums"
              style={{
                fontFamily: 'JetBrainsMono_600SemiBold',
                fontSize: 11,
                color: TOKENS.textPrimary,
              }}
            >
              {counterText}
            </Text>
          </View>
        ) : null}
      </View>
      <Text
        className="font-display text-2xl text-ink mt-1"
        style={{
          fontFamily: 'SpaceGrotesk_700Bold',
          fontSize: 22,
          color: TOKENS.textPrimary,
          marginTop: 4,
        }}
      >
        {title}
      </Text>
      <Text
        className="font-sans text-xs text-muted mt-0.5"
        style={{
          fontFamily: 'PlusJakartaSans_400Regular',
          fontSize: 12,
          color: TOKENS.textMuted,
          marginTop: 2,
        }}
      >
        {subtitle}
      </Text>
    </View>
  );
}
