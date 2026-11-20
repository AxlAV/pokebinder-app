import React, { useState, useEffect } from 'react';
import { View, Text, Image, Pressable } from 'react-native';
import Animated, { SlideInUp } from 'react-native-reanimated';
import {
  Plus,
  Minus,
  CheckCircle2,
  Sparkles,
  BookOpen,
  ChevronRight,
  Copy,
} from 'lucide-react-native';
import {
  getCardImageUrl,
  getSetSymbolUrl,
  type TcgdexCardBrief,
} from '@/services/tcgdex';
import type { CardVariant } from '@/db/schema';
import type { CardVariantCounts } from '@/db/repository';
import type { ResolvedCardVariantsInfo } from '@/utils/cardVariants';
import { inferSetIdFromCardId, getSetOfficialCode } from '@/utils/cardIds';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { TOKENS } from '@/theme/tokens';

interface FloatingScannedCardProps {
  card: TcgdexCardBrief;
  setName?: string | null;
  setSymbol?: string | null;
  setOfficialCount?: number;
  rarity?: string | null;
  variantsInfo: ResolvedCardVariantsInfo;
  selectedVariant: CardVariant;
  onSelectVariant: (variant: CardVariant) => void;
  variantCounts?: CardVariantCounts;
  targetBinderLabel: string;
  onCycleTargetBinder: () => void;
  onQuickAdd: () => void;
  onQuickSubtract?: () => void;
  onOpenFullDetail: () => void;
  justAddedCount: number;
}

const VARIANT_PILLS: ReadonlyArray<{
  id: CardVariant;
  code: 'NRM' | 'REV' | 'HLO';
  label: string;
}> = [
  { id: 'normal', code: 'NRM', label: 'Normal' },
  { id: 'reverse', code: 'REV', label: 'Reverse Holo' },
  { id: 'holo', code: 'HLO', label: 'Holo Foil' },
];

/**
 * Tarjeta flotante de agregado rápido en 1 toque cuando el OCR + TCGdex identifican una carta.
 * Oculta la selección Normal/Reverse en cartas Full Art/Secret/ex y muestra el contador de repetidas.
 */
export function FloatingScannedCard({
  card,
  setName,
  setSymbol,
  setOfficialCount,
  rarity,
  variantsInfo,
  selectedVariant,
  onSelectVariant,
  variantCounts,
  targetBinderLabel,
  onCycleTargetBinder,
  onQuickAdd,
  onQuickSubtract,
  onOpenFullDetail,
  justAddedCount,
}: FloatingScannedCardProps) {
  const [imgError, setImgError] = useState(false);
  const [symbolError, setSymbolError] = useState(false);

  useEffect(() => {
    setImgError(false);
    setSymbolError(false);
  }, [card.id]);

  const imageUrl = getCardImageUrl(card.image, 'low');
  const symbolUrl = getSetSymbolUrl(setSymbol ?? undefined);
  const inferredSetId = inferSetIdFromCardId(card.id, card.localId);
  const setCode = getSetOfficialCode(inferredSetId);
  const totalOwned = variantCounts?.total ?? 0;
  const duplicateCount = Math.max(0, totalOwned - 1);
  const activeVariantCount = variantCounts
    ? variantCounts[selectedVariant]
    : 0;

  const formattedNumber =
    setOfficialCount && setOfficialCount > 0
      ? `${card.localId.padStart(3, '0')}/${String(setOfficialCount).padStart(3, '0')}`
      : `#${card.localId}`;

  const visiblePills = VARIANT_PILLS.filter((pill) =>
    variantsInfo.availableVariants.includes(pill.id)
  );

  const selectedVariantLabel =
    VARIANT_PILLS.find((p) => p.id === selectedVariant)?.label ?? 'Holo';

  return (
    <Animated.View
      entering={SlideInUp.duration(280).springify()}
      className="bg-page border-2 border-foil rounded-card p-3 gap-2.5"
      style={{
        backgroundColor: TOKENS.bgPage,
        borderColor: TOKENS.accentPrimary,
        borderWidth: 2,
        borderRadius: 12,
        padding: 12,
        gap: 10,
      }}
    >
      {/* Cabecera de identificación instantánea + Contador de Repetidas */}
      <View
        className="flex-row items-center justify-between pb-2 border-b border-stitch"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: 8,
          borderBottomColor: TOKENS.borderSubtle,
          borderBottomWidth: 1,
        }}
      >
        <View
          className="flex-row items-center gap-1.5"
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
        >
          <Sparkles size={14} color={TOKENS.accentPrimary} />
          <Text
            className="font-mono text-xs uppercase tracking-wider text-foil"
            style={{
              fontFamily: 'JetBrainsMono_600SemiBold',
              fontSize: 11,
              color: TOKENS.accentPrimary,
            }}
          >
            CARTA DETECTADA // 1 TOQUE
          </Text>
        </View>

        <Pressable
          onPress={onOpenFullDetail}
          className="flex-row items-center gap-0.5"
          style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}
        >
          <Text
            className="font-mono text-[11px] text-muted underline uppercase"
            style={{
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 11,
              color: TOKENS.textMuted,
              textDecorationLine: 'underline',
            }}
          >
            Ficha completa
          </Text>
          <ChevronRight size={13} color={TOKENS.textMuted} />
        </Pressable>
      </View>

      {/* Cuerpo principal: Miniatura de carta + Colección + Variantes */}
      <View
        className="flex-row gap-3 items-center"
        style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}
      >
        <View
          style={{
            aspectRatio: 5 / 7,
            width: 74,
            backgroundColor: TOKENS.bgPocket,
            borderColor: totalOwned > 0 ? TOKENS.accentPrimary : TOKENS.borderSubtle,
            borderWidth: 1,
            borderRadius: 6,
            overflow: 'hidden',
          }}
          className="bg-pocket border border-stitch rounded-pocket overflow-hidden items-center justify-center"
        >
          {imageUrl && !imgError ? (
            <Image
              source={{ uri: imageUrl }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="contain"
              onError={() => setImgError(true)}
            />
          ) : (
            <Text
              className="font-mono text-xs text-muted"
              style={{ color: TOKENS.textMuted, fontSize: 11 }}
            >
              {formattedNumber}
            </Text>
          )}
        </View>

        <View className="flex-1" style={{ flex: 1 }}>
          {/* Cuadradito negro de la colección + Número XXX/YYY */}
          <View
            className="flex-row items-center flex-wrap gap-1.5"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 6,
            }}
          >
            <View
              style={{
                backgroundColor: TOKENS.bgBinder,
                borderColor: TOKENS.textPrimary,
                borderWidth: 1.5,
                borderRadius: 4,
                paddingHorizontal: 6,
                paddingVertical: 1.5,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
              }}
            >
              {symbolUrl && !symbolError ? (
                <Image
                  source={{ uri: symbolUrl }}
                  style={{ width: 11, height: 11 }}
                  resizeMode="contain"
                  onError={() => setSymbolError(true)}
                />
              ) : null}
              <Text
                style={{
                  fontFamily: 'JetBrainsMono_600SemiBold',
                  fontSize: 10,
                  color: TOKENS.textPrimary,
                  fontWeight: '700',
                }}
              >
                {setCode}
              </Text>
            </View>

            <View
              className="bg-pocket border border-stitch rounded-pocket px-1.5 py-0.5"
              style={{
                backgroundColor: TOKENS.bgPocket,
                borderColor: TOKENS.borderSubtle,
                borderWidth: 1,
                borderRadius: 4,
                paddingHorizontal: 6,
                paddingVertical: 2,
              }}
            >
              <Text
                className="font-mono text-[10px] text-foil uppercase tabular-nums"
                style={{
                  fontFamily: 'JetBrainsMono_600SemiBold',
                  fontSize: 10,
                  color: TOKENS.accentPrimary,
                }}
              >
                {formattedNumber}
              </Text>
            </View>

            {rarity ? (
              <Text
                style={{
                  fontFamily: 'JetBrainsMono_400Regular',
                  fontSize: 10,
                  color: TOKENS.textMuted,
                }}
                numberOfLines={1}
              >
                • {rarity}
              </Text>
            ) : null}
          </View>

          <Text
            className="font-display text-base text-ink mt-1"
            style={{
              fontFamily: 'SpaceGrotesk_700Bold',
              fontSize: 15,
              color: TOKENS.textPrimary,
              marginTop: 4,
            }}
            numberOfLines={1}
          >
            {card.name}
          </Text>

          <Text
            style={{
              fontFamily: 'PlusJakartaSans_500Medium',
              fontSize: 11,
              color: TOKENS.textMuted,
              marginTop: 1,
            }}
            numberOfLines={1}
          >
            Colección: {setName ?? inferredSetId.toUpperCase()}
          </Text>

          {/* Contador de copias y cartas repetidas */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              marginTop: 6,
              flexWrap: 'wrap',
            }}
          >
            <View
              style={{
                backgroundColor: TOKENS.bgPocket,
                borderColor: totalOwned > 0 ? TOKENS.accentPrimary : TOKENS.borderSubtle,
                borderWidth: 1,
                borderRadius: 4,
                paddingHorizontal: 6,
                paddingVertical: 2,
              }}
            >
              <Text
                style={{
                  fontFamily: 'JetBrainsMono_600SemiBold',
                  fontSize: 10,
                  color: totalOwned > 0 ? TOKENS.accentPrimary : TOKENS.textMuted,
                }}
              >
                EN ÁLBUM: {totalOwned} {totalOwned === 1 ? 'COPIA' : 'COPIAS'}
              </Text>
            </View>

            {duplicateCount > 0 ? (
              <View
                style={{
                  backgroundColor: TOKENS.bgBinder,
                  borderColor: TOKENS.accentSecondary,
                  borderWidth: 1,
                  borderRadius: 4,
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Copy size={10} color={TOKENS.accentSecondary} />
                <Text
                  style={{
                    fontFamily: 'JetBrainsMono_600SemiBold',
                    fontSize: 10,
                    color: TOKENS.accentSecondary,
                    fontWeight: '700',
                  }}
                >
                  REPETIDAS: +{duplicateCount}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      {/* Selector inteligente de variante: oculto en Full Art / Secret / ex */}
      {variantsInfo.isSingleVariantSpecial ? (
        <View
          style={{
            backgroundColor: TOKENS.bgPocket,
            borderColor: 'rgba(229, 169, 60, 0.55)',
            borderWidth: 1,
            borderRadius: 6,
            paddingHorizontal: 10,
            paddingVertical: 7,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
            <Sparkles size={13} color={TOKENS.accentPrimary} />
            <Text
              style={{
                fontFamily: 'JetBrainsMono_600SemiBold',
                fontSize: 10,
                color: TOKENS.accentPrimary,
              }}
              numberOfLines={1}
            >
              {variantsInfo.specialBadgeLabel ?? 'FULL ART // HOLO FOIL'}
            </Text>
          </View>
          <Text
            style={{
              fontFamily: 'JetBrainsMono_600SemiBold',
              fontSize: 10,
              color: TOKENS.textPrimary,
            }}
          >
            HLO ({variantCounts?.holo ?? 0})
          </Text>
        </View>
      ) : (
        <View style={{ gap: 4 }}>
          <Text
            style={{
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 10,
              color: TOKENS.textMuted,
              textTransform: 'uppercase',
            }}
          >
            ACABADO DE LA CARTA (SOLO VARIANTES DE ESTA EDICIÓN):
          </Text>
          <View
            className="flex-row gap-1.5"
            style={{ flexDirection: 'row', gap: 6 }}
          >
            {visiblePills.map((pill) => {
              const active = selectedVariant === pill.id;
              const currentVariantCount = variantCounts
                ? variantCounts[pill.id]
                : 0;
              return (
                <AnimatedPressable
                  key={pill.id}
                  onPress={() => onSelectVariant(pill.id)}
                  className={`flex-1 py-2 px-2 rounded-pocket border items-center justify-center ${
                    active
                      ? 'bg-foil border-foil'
                      : 'bg-pocket border-stitch'
                  }`}
                  style={{
                    flex: 1,
                    minHeight: 38,
                    paddingVertical: 6,
                    paddingHorizontal: 8,
                    borderRadius: 6,
                    borderWidth: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: active
                      ? TOKENS.accentPrimary
                      : TOKENS.bgPocket,
                    borderColor: active
                      ? TOKENS.accentPrimary
                      : TOKENS.borderSubtle,
                  }}
                >
                  <Text
                    className={`font-mono-semi text-[11px] uppercase ${
                      active ? 'text-binder' : 'text-ink'
                    }`}
                    style={{
                      fontFamily: 'JetBrainsMono_600SemiBold',
                      fontSize: 11,
                      fontWeight: '700',
                      color: active ? TOKENS.bgBinder : TOKENS.textPrimary,
                    }}
                  >
                    {pill.label} ({currentVariantCount})
                  </Text>
                </AnimatedPressable>
              );
            })}
          </View>
        </View>
      )}

      {/* Asignación a álbum virtual (Álbum Oficial del Set auto-creado o Carpeta Manual) */}
      <View
        className="pt-2 border-t border-stitch flex-row items-center justify-between"
        style={{
          paddingTop: 8,
          borderTopColor: TOKENS.borderSubtle,
          borderTopWidth: 1,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View
          className="flex-row items-center gap-1.5 flex-1 pr-2"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            flex: 1,
            paddingRight: 8,
          }}
        >
          <BookOpen size={13} color={TOKENS.accentPrimary} />
          <Text
            className="font-sans text-xs text-muted"
            style={{
              fontFamily: 'PlusJakartaSans_400Regular',
              fontSize: 11,
              color: TOKENS.textMuted,
            }}
            numberOfLines={1}
          >
            Guardar en:{' '}
            <Text
              className="font-sans-semi text-ink"
              style={{ color: TOKENS.textPrimary, fontWeight: '600' }}
            >
              {targetBinderLabel}
            </Text>
          </Text>
        </View>

        <AnimatedPressable
          onPress={onCycleTargetBinder}
          className="min-h-[38px] bg-pocket border border-stitch rounded-pocket px-2.5 items-center justify-center active:border-foil"
          style={{
            minHeight: 38,
            backgroundColor: TOKENS.bgPocket,
            borderColor: TOKENS.borderSubtle,
            borderWidth: 1,
            borderRadius: 6,
            paddingHorizontal: 10,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            className="font-mono text-[10px] text-foil uppercase"
            style={{
              fontFamily: 'JetBrainsMono_600SemiBold',
              fontSize: 10,
              color: TOKENS.accentPrimary,
            }}
          >
            Cambiar Álbum
          </Text>
        </AnimatedPressable>
      </View>

      {/* Botones de acción: [-1] para corregir repetidas y [+1 Agregar al Álbum] */}
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        {onQuickSubtract && activeVariantCount > 0 ? (
          <AnimatedPressable
            onPress={onQuickSubtract}
            style={{
              minHeight: 48,
              minWidth: 52,
              backgroundColor: TOKENS.bgPocket,
              borderColor: TOKENS.accentSecondary,
              borderWidth: 1,
              borderRadius: 6,
              paddingHorizontal: 10,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
            }}
          >
            <Minus size={15} color={TOKENS.accentSecondary} />
            <Text
              style={{
                fontFamily: 'JetBrainsMono_600SemiBold',
                fontSize: 12,
                color: TOKENS.accentSecondary,
                fontWeight: '700',
              }}
            >
              1
            </Text>
          </AnimatedPressable>
        ) : null}

        <AnimatedPressable
          onPress={onQuickAdd}
          className="flex-1 min-h-[48px] bg-foil rounded-pocket py-3 px-4 flex-row items-center justify-center gap-2 active:opacity-90"
          style={{
            flex: 1,
            minHeight: 48,
            backgroundColor: TOKENS.accentPrimary,
            borderRadius: 6,
            paddingVertical: 12,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          {justAddedCount > 0 ? (
            <>
              <CheckCircle2 size={18} color={TOKENS.bgBinder} />
              <Text
                className="font-sans-semi text-xs uppercase tracking-wider text-binder"
                style={{
                  fontFamily: 'PlusJakartaSans_600SemiBold',
                  fontSize: 12,
                  fontWeight: '700',
                  color: TOKENS.bgBinder,
                  letterSpacing: 0.4,
                }}
              >
                +1 {selectedVariantLabel} Guardada (Sesión: {justAddedCount})
              </Text>
            </>
          ) : (
            <>
              <Plus size={18} color={TOKENS.bgBinder} />
              <Text
                className="font-sans-semi text-xs uppercase tracking-wider text-binder"
                style={{
                  fontFamily: 'PlusJakartaSans_600SemiBold',
                  fontSize: 12,
                  fontWeight: '700',
                  color: TOKENS.bgBinder,
                  letterSpacing: 0.4,
                }}
              >
                Guardar en Álbum (+1 {selectedVariantLabel})
              </Text>
            </>
          )}
        </AnimatedPressable>
      </View>
    </Animated.View>
  );
}
