import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  Modal,
  ScrollView,
} from 'react-native';
import { X, Plus, Minus, Sparkles, CheckCircle2, Layers } from 'lucide-react-native';
import { ErrorCard } from '@/components/ui/ErrorCard';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { useCardDetailQuery } from '@/hooks/useTcgdex';
import {
  useCardVariantCountsQuery,
  useAdjustCardVariantMutation,
} from '@/hooks/useDatabase';
import {
  getCardImageUrl,
  type TcgdexCardBrief,
} from '@/services/tcgdex';
import type { CardVariant } from '@/db/schema';
import type { CacheableCardInput } from '@/db/repository';
import { TOKENS } from '@/theme/tokens';

export interface CardSetContext {
  id: string;
  name: string;
  logo?: string;
  officialCount?: number;
  totalCount?: number;
}

interface CardDetailModalProps {
  cardId: string | null;
  fallbackCard?: TcgdexCardBrief | null;
  fallbackSet?: CardSetContext | null;
  onClose: () => void;
}

const VARIANT_ROWS: ReadonlyArray<{
  variant: CardVariant;
  code: 'NRM' | 'REV' | 'HLO';
  label: string;
  subtitle: string;
}> = [
  {
    variant: 'normal',
    code: 'NRM',
    label: 'Normal',
    subtitle: 'Impresión estándar sin lámina',
  },
  {
    variant: 'reverse',
    code: 'REV',
    label: 'Reverse Holo',
    subtitle: 'Brillo holográfico en el cuerpo de la carta',
  },
  {
    variant: 'holo',
    code: 'HLO',
    label: 'Holo Foil',
    subtitle: 'Lámina brillante en la ilustración principal',
  },
];

/**
 * Modal táctil de detalle de carta conectado al inventario SQLite para sumar/restar
 * copias físicas por variante (Normal, Reverse, Holo).
 */
export function CardDetailModal({
  cardId,
  fallbackCard,
  fallbackSet,
  onClose,
}: CardDetailModalProps) {
  const { language } = usePreferencesStore();
  const [imageError, setImageError] = useState(false);

  const detailQuery = useCardDetailQuery(language, cardId);
  const variantCountsQuery = useCardVariantCountsQuery(cardId);
  const adjustMutation = useAdjustCardVariantMutation();

  if (!cardId) return null;

  const detail = detailQuery.data;
  const counts = variantCountsQuery.data ?? {
    normal: 0,
    reverse: 0,
    holo: 0,
    total: 0,
  };

  const displayName = detail?.name ?? fallbackCard?.name ?? 'Detalle de Carta';
  const displayLocalId = detail?.localId ?? fallbackCard?.localId ?? '---';
  const rawImage = detail?.image ?? fallbackCard?.image;
  const highResUrl = getCardImageUrl(rawImage, 'high');

  const officialSetCount =
    detail?.set?.cardCount?.official ?? fallbackSet?.officialCount;
  const numberLabel = officialSetCount
    ? `${displayLocalId.padStart(3, '0')}/${String(officialSetCount).padStart(3, '0')}`
    : `#${displayLocalId}`;

  const resolvedSetId =
    detail?.set?.id ?? fallbackSet?.id ?? cardId.split('-')[0] ?? 'unknown';
  const resolvedSetName =
    detail?.set?.name ?? fallbackSet?.name ?? resolvedSetId.toUpperCase();

  const handleAdjustVariant = (variant: CardVariant, delta: 1 | -1) => {
    const cardInput: CacheableCardInput = {
      id: cardId,
      localId: displayLocalId,
      name: displayName,
      image: rawImage ?? null,
      setId: resolvedSetId,
      setName: resolvedSetName,
      setLogo: detail?.set?.logo ?? fallbackSet?.logo ?? null,
      setOfficialCount: officialSetCount ?? 0,
      setTotalCount:
        detail?.set?.cardCount?.total ?? fallbackSet?.totalCount ?? 0,
      rarity: detail?.rarity ?? null,
      types: detail?.types ?? [],
      variants: detail?.variants ?? {
        normal: true,
        reverse: false,
        holo: false,
      },
      illustrator: detail?.illustrator ?? null,
      language,
    };

    adjustMutation.mutate({
      card: cardInput,
      variant,
      delta,
    });
  };

  const canModifyInventory = !adjustMutation.isPending;

  return (
    <Modal
      visible={Boolean(cardId)}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        className="flex-1 bg-binder/80 justify-center items-center p-3"
        style={{
          flex: 1,
          backgroundColor: 'rgba(17, 16, 21, 0.85)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 12,
        }}
      >
        <View
          className="w-full max-w-md bg-page border border-stitch rounded-card overflow-hidden max-h-[92%]"
          style={{
            width: '100%',
            maxWidth: 440,
            backgroundColor: TOKENS.bgPage,
            borderColor: TOKENS.borderSubtle,
            borderWidth: 1,
            borderRadius: 12,
            overflow: 'hidden',
            maxHeight: '92%',
          }}
        >
          {/* Cabecera del modal */}
          <View
            className="px-4 py-3 bg-page border-b border-stitch flex-row items-center justify-between"
            style={{
              paddingHorizontal: 16,
              paddingVertical: 12,
              backgroundColor: TOKENS.bgPage,
              borderBottomColor: TOKENS.borderSubtle,
              borderBottomWidth: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View className="flex-1 pr-2" style={{ flex: 1, paddingRight: 8 }}>
              <View
                className="flex-row items-center gap-2"
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
              >
                <Text
                  className="font-mono text-xs text-foil uppercase"
                  style={{ fontFamily: 'JetBrainsMono_600SemiBold', fontSize: 11, color: TOKENS.accentPrimary }}
                >
                  {numberLabel}
                </Text>
                {detail?.category ? (
                  <Text
                    className="font-mono text-[10px] text-muted uppercase"
                    style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 10, color: TOKENS.textMuted }}
                  >
                    • {detail.category}
                  </Text>
                ) : null}
              </View>
              <Text
                className="font-display text-lg text-ink mt-0.5"
                style={{ fontFamily: 'SpaceGrotesk_700Bold', fontSize: 17, color: TOKENS.textPrimary, marginTop: 2 }}
                numberOfLines={1}
              >
                {displayName}
              </Text>
            </View>

            <AnimatedPressable
              onPress={onClose}
              className="min-h-[44px] min-w-[44px] rounded-pocket bg-pocket border border-stitch items-center justify-center active:border-foil"
              style={{
                minWidth: 44,
                minHeight: 44,
                borderRadius: 6,
                backgroundColor: TOKENS.bgPocket,
                borderColor: TOKENS.borderSubtle,
                borderWidth: 1,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={18} color={TOKENS.textPrimary} />
            </AnimatedPressable>
          </View>

          <ScrollView
            contentContainerStyle={{ padding: 16, gap: 14 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Imagen de carta en bolsillo 5:7 o esqueleto */}
            {detailQuery.isLoading && !fallbackCard ? (
              <View className="items-center" style={{ alignItems: 'center' }}>
                <View
                  style={{
                    aspectRatio: 5 / 7,
                    width: '62%',
                    backgroundColor: TOKENS.bgPocket,
                    borderColor: TOKENS.borderSubtle,
                    borderWidth: 1,
                    borderRadius: 6,
                    padding: 12,
                    justifyContent: 'space-between',
                    opacity: 0.75,
                  }}
                  className="bg-pocket border border-stitch rounded-pocket p-3 justify-between opacity-75"
                >
                  <View
                    className="h-3 w-20 rounded-pocket bg-page"
                    style={{ height: 12, width: 80, borderRadius: 4, backgroundColor: TOKENS.bgPage }}
                  />
                  <View
                    className="my-auto h-24 rounded-pocket bg-page/70 border border-stitch"
                    style={{
                      height: 96,
                      marginVertical: 'auto',
                      borderRadius: 6,
                      backgroundColor: 'rgba(26, 24, 32, 0.7)',
                      borderColor: TOKENS.borderSubtle,
                      borderWidth: 1,
                    }}
                  />
                  <View
                    className="h-3 w-12 rounded-pocket bg-page self-end"
                    style={{ height: 12, width: 48, borderRadius: 4, backgroundColor: TOKENS.bgPage, alignSelf: 'flex-end' }}
                  />
                </View>
              </View>
            ) : detailQuery.isError && !fallbackCard ? (
              <ErrorCard
                title="No se pudo descargar la ficha de la carta"
                description="Reintenta la conexión con TCGdex para visualizar la ilustración y metadatos."
                onRetry={() => detailQuery.refetch()}
              />
            ) : (
              <View className="items-center" style={{ alignItems: 'center' }}>
                <View
                  style={{
                    aspectRatio: 5 / 7,
                    width: '62%',
                    backgroundColor: TOKENS.bgPocket,
                    borderColor: counts.total > 0 ? TOKENS.accentPrimary : TOKENS.borderSubtle,
                    borderWidth: 1,
                    borderRadius: 6,
                    padding: 8,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  className={`bg-pocket border rounded-pocket p-2 items-center justify-center ${
                    counts.total > 0 ? 'border-foil' : 'border-stitch'
                  }`}
                >
                  {highResUrl && !imageError ? (
                    <Image
                      source={{ uri: highResUrl }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="contain"
                      onError={() => setImageError(true)}
                    />
                  ) : (
                    <View
                      className="flex-1 w-full items-center justify-center border border-dashed border-stitch rounded-pocket p-3"
                      style={{
                        flex: 1,
                        width: '100%',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderStyle: 'dashed',
                        borderColor: TOKENS.borderSubtle,
                        borderWidth: 1,
                        borderRadius: 6,
                        padding: 12,
                      }}
                    >
                      <Layers size={24} color={TOKENS.textMuted} />
                      <Text
                        className="font-display text-sm text-ink text-center mt-2"
                        style={{ fontFamily: 'SpaceGrotesk_700Bold', fontSize: 13, color: TOKENS.textPrimary, textAlign: 'center', marginTop: 8 }}
                      >
                        {displayName}
                      </Text>
                      <Text
                        className="font-mono text-xs text-muted mt-1 tabular-nums"
                        style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 11, color: TOKENS.textMuted, marginTop: 4 }}
                      >
                        {numberLabel}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Control de Inventario Físico por Variante (SQLite) */}
            <View
              className="bg-pocket border border-stitch rounded-card p-3 gap-2.5"
              style={{
                backgroundColor: TOKENS.bgPocket,
                borderColor: TOKENS.borderSubtle,
                borderWidth: 1,
                borderRadius: 12,
                padding: 12,
                gap: 10,
              }}
            >
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
                    className="font-display-semi text-sm text-ink"
                    style={{ fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 13, color: TOKENS.textPrimary }}
                  >
                    Inventario Físico por Variante
                  </Text>
                </View>
                <View
                  className="flex-row items-center gap-1"
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                >
                  <CheckCircle2
                    size={13}
                    color={
                      counts.total > 0 ? TOKENS.accentPrimary : TOKENS.textMuted
                    }
                  />
                  <Text
                    className="font-mono text-[11px] text-muted tabular-nums"
                    style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 11, color: TOKENS.textMuted }}
                  >
                    TOTAL: {counts.total}
                  </Text>
                </View>
              </View>

              {VARIANT_ROWS.map((row) => {
                const qty = counts[row.variant];
                const isOfficialVariant = detail?.variants
                  ? Boolean(detail.variants[row.variant])
                  : true;

                return (
                  <View
                    key={row.variant}
                    className={`flex-row items-center justify-between rounded-pocket border px-3 py-2 ${
                      qty > 0
                        ? 'bg-page border-foil/70'
                        : 'bg-binder border-stitch'
                    }`}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderRadius: 6,
                      borderWidth: 1,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      backgroundColor: qty > 0 ? TOKENS.bgPage : TOKENS.bgBinder,
                      borderColor: qty > 0 ? 'rgba(229, 169, 60, 0.7)' : TOKENS.borderSubtle,
                    }}
                  >
                    <View className="flex-1 pr-2" style={{ flex: 1, paddingRight: 8 }}>
                      <View
                        className="flex-row items-center gap-2"
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                      >
                        <View
                          className={`rounded-pocket px-1.5 py-0.5 border ${
                            qty > 0
                              ? 'bg-pocket border-foil'
                              : 'bg-page border-stitch'
                          }`}
                          style={{
                            borderRadius: 4,
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            borderWidth: 1,
                            backgroundColor: qty > 0 ? TOKENS.bgPocket : TOKENS.bgPage,
                            borderColor: qty > 0 ? TOKENS.accentPrimary : TOKENS.borderSubtle,
                          }}
                        >
                          <Text
                            className={`font-mono text-[10px] ${
                              qty > 0 ? 'text-foil' : 'text-muted'
                            }`}
                            style={{
                              fontFamily: 'JetBrainsMono_600SemiBold',
                              fontSize: 10,
                              color: qty > 0 ? TOKENS.accentPrimary : TOKENS.textMuted,
                            }}
                          >
                            {row.code}
                          </Text>
                        </View>
                        <Text
                          className="font-sans-semi text-sm text-ink"
                          style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13, color: TOKENS.textPrimary }}
                        >
                          {row.label}
                        </Text>
                        {detail?.variants && isOfficialVariant ? (
                          <Text
                            className="font-mono text-[9px] text-foil uppercase"
                            style={{ fontFamily: 'JetBrainsMono_600SemiBold', fontSize: 9, color: TOKENS.accentPrimary }}
                          >
                            • OFICIAL
                          </Text>
                        ) : null}
                      </View>
                      <Text
                        className="font-sans text-[11px] text-muted mt-0.5"
                        style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: 11, color: TOKENS.textMuted, marginTop: 2 }}
                        numberOfLines={1}
                      >
                        {row.subtitle}
                      </Text>
                    </View>

                    {/* Controles - / cantidad / + */}
                    <View
                      className="flex-row items-center gap-1.5"
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                    >
                      <AnimatedPressable
                        onPress={() => handleAdjustVariant(row.variant, -1)}
                        disabled={!canModifyInventory || qty <= 0}
                        className={`min-h-[44px] min-w-[44px] rounded-pocket border items-center justify-center ${
                          qty > 0
                            ? 'bg-pocket border-stitch active:border-lacquer'
                            : 'bg-binder border-stitch/50 opacity-40'
                        }`}
                        style={{
                          minWidth: 44,
                          minHeight: 44,
                          borderRadius: 6,
                          borderWidth: 1,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: qty > 0 ? TOKENS.bgPocket : TOKENS.bgBinder,
                          borderColor: TOKENS.borderSubtle,
                          opacity: qty > 0 ? 1 : 0.4,
                        }}
                      >
                        <Minus
                          size={16}
                          color={
                            qty > 0 ? TOKENS.textPrimary : TOKENS.textMuted
                          }
                        />
                      </AnimatedPressable>

                      <View
                        className="min-w-[38px] items-center justify-center"
                        style={{ minWidth: 38, alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Text
                          className={`font-mono-semi text-base tabular-nums ${
                            qty > 0 ? 'text-foil' : 'text-muted'
                          }`}
                          style={{
                            fontFamily: 'JetBrainsMono_600SemiBold',
                            fontSize: 16,
                            color: qty > 0 ? TOKENS.accentPrimary : TOKENS.textMuted,
                          }}
                        >
                          {String(qty).padStart(2, '0')}
                        </Text>
                      </View>

                      <AnimatedPressable
                        onPress={() => handleAdjustVariant(row.variant, 1)}
                        disabled={!canModifyInventory}
                        className="min-h-[44px] min-w-[44px] rounded-pocket bg-foil items-center justify-center active:opacity-85"
                        style={{
                          minWidth: 44,
                          minHeight: 44,
                          borderRadius: 6,
                          backgroundColor: TOKENS.accentPrimary,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Plus size={16} color={TOKENS.bgBinder} />
                      </AnimatedPressable>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Ficha técnica de la carta */}
            <View
              className="bg-pocket border border-stitch rounded-card p-3 gap-1.5"
              style={{
                backgroundColor: TOKENS.bgPocket,
                borderColor: TOKENS.borderSubtle,
                borderWidth: 1,
                borderRadius: 12,
                padding: 12,
                gap: 6,
              }}
            >
              <View
                className="flex-row items-center justify-between"
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <Text
                  className="font-mono text-[11px] text-muted uppercase"
                  style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 10, color: TOKENS.textMuted }}
                >
                  EXPANSIÓN
                </Text>
                <Text
                  className="font-sans-semi text-xs text-ink"
                  style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, color: TOKENS.textPrimary }}
                  numberOfLines={1}
                >
                  {detail?.set?.name ?? fallbackSet?.name ?? 'Catálogo TCGdex'}{' '}
                  {(detail?.set?.id ?? fallbackSet?.id)
                    ? `(${(detail?.set?.id ?? fallbackSet?.id ?? '').toUpperCase()})`
                    : ''}
                </Text>
              </View>

              {detail?.rarity ? (
                <View
                  className="flex-row items-center justify-between"
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <Text
                    className="font-mono text-[11px] text-muted uppercase"
                    style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 10, color: TOKENS.textMuted }}
                  >
                    RAREZA
                  </Text>
                  <Text
                    className="font-mono text-xs text-foil"
                    style={{ fontFamily: 'JetBrainsMono_600SemiBold', fontSize: 11, color: TOKENS.accentPrimary }}
                  >
                    {detail.rarity}
                  </Text>
                </View>
              ) : null}

              {detail?.types && detail.types.length > 0 ? (
                <View
                  className="flex-row items-center justify-between"
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <Text
                    className="font-mono text-[11px] text-muted uppercase"
                    style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 10, color: TOKENS.textMuted }}
                  >
                    TIPO ELEMENTAL
                  </Text>
                  <Text
                    className="font-sans-medium text-xs text-ink"
                    style={{ fontFamily: 'PlusJakartaSans_500Medium', fontSize: 12, color: TOKENS.textPrimary }}
                  >
                    {detail.types.join(' / ')}
                  </Text>
                </View>
              ) : null}

              {detail?.illustrator ? (
                <View
                  className="flex-row items-center justify-between"
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <Text
                    className="font-mono text-[11px] text-muted uppercase"
                    style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 10, color: TOKENS.textMuted }}
                  >
                    ILUSTRADOR
                  </Text>
                  <Text
                    className="font-sans text-xs text-ink"
                    style={{ fontFamily: 'PlusJakartaSans_400Regular', fontSize: 12, color: TOKENS.textPrimary }}
                  >
                    {detail.illustrator}
                  </Text>
                </View>
              ) : null}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
