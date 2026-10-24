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
    subtitle: 'Ilustración holográfica o arte especial',
  },
];

/**
 * Modal de detalle de carta conectado a SQLite local para sumar o restar copias por variante.
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
  const countsQuery = useCardVariantCountsQuery(cardId);
  const adjustMutation = useAdjustCardVariantMutation();

  if (!cardId) return null;

  const detail = detailQuery.data ?? null;
  const counts = countsQuery.data ?? {
    normal: 0,
    reverse: 0,
    holo: 0,
    total: 0,
  };

  const displayName = detail?.name ?? fallbackCard?.name ?? 'Cargando carta...';
  const displayLocalId = detail?.localId ?? fallbackCard?.localId ?? '---';
  const officialCount =
    detail?.set?.cardCount?.official ?? fallbackSet?.officialCount ?? 0;
  const totalCount =
    detail?.set?.cardCount?.total ?? fallbackSet?.totalCount ?? 0;

  const numberLabel =
    officialCount > 0
      ? `${displayLocalId.padStart(3, '0')}/${String(officialCount).padStart(3, '0')}`
      : `#${displayLocalId}`;

  const highResUrl = getCardImageUrl(
    detail?.image ?? fallbackCard?.image,
    'high'
  );

  // Construye el payload cacheable combinando el detalle de TCGdex o el fallback de grilla
  const buildCacheableInput = (): CacheableCardInput | null => {
    if (detail) {
      return {
        id: detail.id,
        localId: detail.localId,
        name: detail.name,
        image: detail.image ?? null,
        setId: detail.set.id,
        setName: detail.set.name,
        setLogo: detail.set.logo ?? null,
        setOfficialCount: detail.set.cardCount.official,
        setTotalCount: detail.set.cardCount.total,
        rarity: detail.rarity ?? null,
        types: detail.types ?? [],
        variants: detail.variants,
        illustrator: detail.illustrator ?? null,
        language,
      };
    }

    if (fallbackCard) {
      const inferredSetId =
        fallbackSet?.id ?? fallbackCard.id.split('-')[0] ?? 'unknown';
      return {
        id: fallbackCard.id,
        localId: fallbackCard.localId,
        name: fallbackCard.name,
        image: fallbackCard.image ?? null,
        setId: inferredSetId,
        setName: fallbackSet?.name ?? inferredSetId.toUpperCase(),
        setLogo: fallbackSet?.logo ?? null,
        setOfficialCount: officialCount,
        setTotalCount: totalCount,
        language,
      };
    }

    return null;
  };

  const handleAdjustVariant = (variant: CardVariant, delta: number) => {
    const cacheable = buildCacheableInput();
    if (!cacheable) return;
    adjustMutation.mutate({
      card: cacheable,
      variant,
      delta,
    });
  };

  const canModifyInventory = Boolean(detail || fallbackCard);

  return (
    <Modal
      visible={Boolean(cardId)}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-binder/90 justify-center p-3">
        <View className="bg-page border border-stitch rounded-card max-h-[92%] overflow-hidden">
          {/* Cabecera del modal */}
          <View className="flex-row items-center justify-between px-4 pt-3.5 pb-3 border-b border-stitch">
            <View className="flex-1 pr-2">
              <View className="flex-row items-center gap-2">
                <Text className="font-mono text-xs text-foil tabular-nums">
                  {numberLabel}
                </Text>
                <View
                  className={`rounded-pocket px-2 py-0.5 border ${
                    counts.total > 0
                      ? 'bg-pocket border-foil'
                      : 'bg-binder border-stitch'
                  }`}
                >
                  <Text
                    className={`font-mono-semi text-[10px] tabular-nums ${
                      counts.total > 0 ? 'text-foil' : 'text-muted'
                    }`}
                  >
                    {counts.total > 0
                      ? `EN COLECCIÓN: ${counts.total}`
                      : 'FALTANTE: 0'}
                  </Text>
                </View>
              </View>

              <Text
                className="font-display text-lg text-ink mt-1"
                numberOfLines={1}
              >
                {displayName}
              </Text>
            </View>

            <Pressable
              onPress={onClose}
              className="min-h-[44px] min-w-[44px] rounded-pocket bg-pocket border border-stitch items-center justify-center active:border-foil"
            >
              <X size={18} color={TOKENS.textPrimary} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerClassName="p-4 gap-3.5"
            showsVerticalScrollIndicator={false}
          >
            {/* Imagen de carta en bolsillo 5:7 o esqueleto */}
            {detailQuery.isLoading && !fallbackCard ? (
              <View className="items-center">
                <View
                  style={{ aspectRatio: 5 / 7, width: '62%' }}
                  className="bg-pocket border border-stitch rounded-pocket p-3 justify-between opacity-75"
                >
                  <View className="h-3 w-20 rounded-pocket bg-page" />
                  <View className="my-auto h-24 rounded-pocket bg-page/70 border border-stitch" />
                  <View className="h-3 w-12 rounded-pocket bg-page self-end" />
                </View>
              </View>
            ) : detailQuery.isError && !fallbackCard ? (
              <ErrorCard
                title="No se pudo descargar la ficha de la carta"
                description="Reintenta la conexión con TCGdex para visualizar la ilustración y metadatos."
                onRetry={() => detailQuery.refetch()}
              />
            ) : (
              <View className="items-center">
                <View
                  style={{ aspectRatio: 5 / 7, width: '62%' }}
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
                    <View className="flex-1 w-full items-center justify-center border border-dashed border-stitch rounded-pocket p-3">
                      <Layers size={24} color={TOKENS.textMuted} />
                      <Text className="font-display text-sm text-ink text-center mt-2">
                        {displayName}
                      </Text>
                      <Text className="font-mono text-xs text-muted mt-1 tabular-nums">
                        {numberLabel}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Control de Inventario Físico por Variante (SQLite) */}
            <View className="bg-pocket border border-stitch rounded-card p-3 gap-2.5">
              <View className="flex-row items-center justify-between pb-2 border-b border-stitch">
                <View className="flex-row items-center gap-1.5">
                  <Sparkles size={14} color={TOKENS.accentPrimary} />
                  <Text className="font-display-semi text-sm text-ink">
                    Inventario Físico por Variante
                  </Text>
                </View>
                <View className="flex-row items-center gap-1">
                  <CheckCircle2
                    size={13}
                    color={
                      counts.total > 0 ? TOKENS.accentPrimary : TOKENS.textMuted
                    }
                  />
                  <Text className="font-mono text-[11px] text-muted tabular-nums">
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
                  >
                    <View className="flex-1 pr-2">
                      <View className="flex-row items-center gap-2">
                        <View
                          className={`rounded-pocket px-1.5 py-0.5 border ${
                            qty > 0
                              ? 'bg-pocket border-foil'
                              : 'bg-page border-stitch'
                          }`}
                        >
                          <Text
                            className={`font-mono text-[10px] ${
                              qty > 0 ? 'text-foil' : 'text-muted'
                            }`}
                          >
                            {row.code}
                          </Text>
                        </View>
                        <Text className="font-sans-semi text-sm text-ink">
                          {row.label}
                        </Text>
                        {detail?.variants && isOfficialVariant ? (
                          <Text className="font-mono text-[9px] text-foil uppercase">
                            • OFICIAL
                          </Text>
                        ) : null}
                      </View>
                      <Text
                        className="font-sans text-[11px] text-muted mt-0.5"
                        numberOfLines={1}
                      >
                        {row.subtitle}
                      </Text>
                    </View>

                    {/* Controles - / cantidad / + con objetivos táctiles >= 44px */}
                    <View className="flex-row items-center gap-1.5">
                      <Pressable
                        onPress={() => handleAdjustVariant(row.variant, -1)}
                        disabled={!canModifyInventory || qty <= 0}
                        className={`min-h-[44px] min-w-[44px] rounded-pocket border items-center justify-center ${
                          qty > 0
                            ? 'bg-pocket border-stitch active:border-lacquer'
                            : 'bg-binder border-stitch/50 opacity-40'
                        }`}
                      >
                        <Minus
                          size={16}
                          color={
                            qty > 0 ? TOKENS.textPrimary : TOKENS.textMuted
                          }
                        />
                      </Pressable>

                      <View className="min-w-[38px] items-center justify-center">
                        <Text
                          className={`font-mono-semi text-base tabular-nums ${
                            qty > 0 ? 'text-foil' : 'text-muted'
                          }`}
                        >
                          {String(qty).padStart(2, '0')}
                        </Text>
                      </View>

                      <Pressable
                        onPress={() => handleAdjustVariant(row.variant, 1)}
                        disabled={!canModifyInventory}
                        className="min-h-[44px] min-w-[44px] rounded-pocket bg-foil items-center justify-center active:opacity-85"
                      >
                        <Plus size={16} color={TOKENS.bgBinder} />
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Ficha técnica de la carta */}
            <View className="bg-pocket border border-stitch rounded-card p-3 gap-1.5">
              <View className="flex-row items-center justify-between">
                <Text className="font-mono text-[11px] text-muted uppercase">
                  EXPANSIÓN
                </Text>
                <Text
                  className="font-sans-semi text-xs text-ink"
                  numberOfLines={1}
                >
                  {detail?.set?.name ?? fallbackSet?.name ?? 'Catálogo TCGdex'}{' '}
                  {(detail?.set?.id ?? fallbackSet?.id)
                    ? `(${(detail?.set?.id ?? fallbackSet?.id ?? '').toUpperCase()})`
                    : ''}
                </Text>
              </View>

              {detail?.rarity ? (
                <View className="flex-row items-center justify-between">
                  <Text className="font-mono text-[11px] text-muted uppercase">
                    RAREZA
                  </Text>
                  <Text className="font-mono text-xs text-foil">
                    {detail.rarity}
                  </Text>
                </View>
              ) : null}

              {detail?.types && detail.types.length > 0 ? (
                <View className="flex-row items-center justify-between">
                  <Text className="font-mono text-[11px] text-muted uppercase">
                    TIPO ELEMENTAL
                  </Text>
                  <Text className="font-sans-medium text-xs text-ink">
                    {detail.types.join(' / ')}
                  </Text>
                </View>
              ) : null}

              {detail?.illustrator ? (
                <View className="flex-row items-center justify-between">
                  <Text className="font-mono text-[11px] text-muted uppercase">
                    ILUSTRADOR
                  </Text>
                  <Text className="font-sans text-xs text-ink">
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
