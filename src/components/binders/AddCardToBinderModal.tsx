import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  FlatList,
  Image,
} from 'react-native';
import { X, Search, Plus, Check, Sparkles, Layers } from 'lucide-react-native';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { useCardSearchQuery } from '@/hooks/useTcgdex';
import {
  useOwnedCardsQuery,
  useAddCardToManualBinderMutation,
  useManualBinderCardsQuery,
} from '@/hooks/useDatabase';
import { getCardImageUrl, type TcgdexCardBrief } from '@/services/tcgdex';
import { BinderGridSkeleton } from '@/components/ui/BinderGridSkeleton';
import { ErrorCard } from '@/components/ui/ErrorCard';
import { TOKENS } from '@/theme/tokens';

interface AddCardToBinderModalProps {
  visible: boolean;
  binderId: string;
  binderName: string;
  onClose: () => void;
}

type SourceTab = 'owned' | 'catalog';

/**
 * Modal para agregar cartas a una carpeta manual desde el inventario propio o buscando en TCGdex.
 */
export function AddCardToBinderModal({
  visible,
  binderId,
  binderName,
  onClose,
}: AddCardToBinderModalProps) {
  const { language } = usePreferencesStore();
  const [sourceTab, setSourceTab] = useState<SourceTab>('owned');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const ownedQuery = useOwnedCardsQuery();
  const existingBinderCardsQuery = useManualBinderCardsQuery(binderId);
  const catalogSearchQuery = useCardSearchQuery(
    language,
    sourceTab === 'catalog' ? debouncedQuery : ''
  );
  const addCardMutation = useAddCardToManualBinderMutation();

  const existingIds = new Set(
    (existingBinderCardsQuery.data ?? []).map((c) => c.id)
  );

  const ownedCards = (ownedQuery.data ?? []).filter((item) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      item.card.name.toLowerCase().includes(q) ||
      item.card.localId.toLowerCase().includes(q)
    );
  });

  const handleAddFromOwned = (card: (typeof ownedCards)[number]['card']) => {
    addCardMutation.mutate({
      binderId,
      card: {
        id: card.id,
        localId: card.localId,
        name: card.name,
        image: card.image,
        setId: card.setId,
        setName: card.setName,
        setLogo: card.setLogo,
        setOfficialCount: card.setOfficialCount,
        setTotalCount: card.setTotalCount,
        rarity: card.rarity,
      },
      position: (existingBinderCardsQuery.data ?? []).length,
    });
  };

  const handleAddFromCatalog = (card: TcgdexCardBrief) => {
    const inferredSetId = card.id.split('-')[0] ?? 'custom';
    addCardMutation.mutate({
      binderId,
      card: {
        id: card.id,
        localId: card.localId,
        name: card.name,
        image: card.image ?? null,
        setId: inferredSetId,
        setName: inferredSetId.toUpperCase(),
        language,
      },
      position: (existingBinderCardsQuery.data ?? []).length,
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-binder/90 justify-center p-3">
        <View className="bg-page border border-stitch rounded-card max-h-[90%] overflow-hidden">
          <View className="flex-row items-center justify-between px-4 pt-3.5 pb-3 border-b border-stitch">
            <View className="flex-1 pr-2">
              <Text className="font-mono text-[10px] uppercase text-foil">
                INSERTAR EN BOLSILLO // CARPETA MANUAL
              </Text>
              <Text
                className="font-display text-lg text-ink mt-0.5"
                numberOfLines={1}
              >
                {binderName}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              className="min-h-[44px] min-w-[44px] rounded-pocket bg-pocket border border-stitch items-center justify-center"
            >
              <X size={18} color={TOKENS.textPrimary} />
            </Pressable>
          </View>

          <View className="px-4 pt-3 pb-2 gap-2.5">
            <View className="flex-row gap-2">
              <Pressable
                onPress={() => setSourceTab('owned')}
                className={`flex-1 min-h-[44px] rounded-pocket border flex-row items-center justify-center gap-1.5 ${
                  sourceTab === 'owned'
                    ? 'bg-pocket border-foil'
                    : 'bg-binder border-stitch'
                }`}
              >
                <Sparkles
                  size={14}
                  color={
                    sourceTab === 'owned'
                      ? TOKENS.accentPrimary
                      : TOKENS.textMuted
                  }
                />
                <Text
                  className={`font-sans-semi text-xs uppercase ${
                    sourceTab === 'owned' ? 'text-foil' : 'text-muted'
                  }`}
                >
                  Mi Inventario ({(ownedQuery.data ?? []).length})
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setSourceTab('catalog')}
                className={`flex-1 min-h-[44px] rounded-pocket border flex-row items-center justify-center gap-1.5 ${
                  sourceTab === 'catalog'
                    ? 'bg-pocket border-foil'
                    : 'bg-binder border-stitch'
                }`}
              >
                <Layers
                  size={14}
                  color={
                    sourceTab === 'catalog'
                      ? TOKENS.accentPrimary
                      : TOKENS.textMuted
                  }
                />
                <Text
                  className={`font-sans-semi text-xs uppercase ${
                    sourceTab === 'catalog' ? 'text-foil' : 'text-muted'
                  }`}
                >
                  Buscar en TCGdex
                </Text>
              </Pressable>
            </View>

            <View className="min-h-[44px] flex-row items-center bg-pocket border border-stitch rounded-pocket px-3">
              <Search size={15} color={TOKENS.textMuted} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={
                  sourceTab === 'owned'
                    ? 'Filtrar en tu inventario...'
                    : 'Buscar Pokémon en TCGdex (ej. Mew, Lugia)...'
                }
                placeholderTextColor={TOKENS.textMuted}
                className="flex-1 font-sans text-sm text-ink ml-2 py-2"
              />
              {searchQuery.length > 0 ? (
                <Pressable
                  onPress={() => {
                    setSearchQuery('');
                    setDebouncedQuery('');
                  }}
                  className="min-h-[44px] min-w-[44px] items-center justify-center -mr-2"
                >
                  <X size={15} color={TOKENS.textMuted} />
                </Pressable>
              ) : null}
            </View>
          </View>

          <View className="px-4 pb-4 h-80">
            {sourceTab === 'owned' ? (
              ownedCards.length === 0 ? (
                <View className="flex-1 items-center justify-center bg-binder border border-stitch rounded-card p-4">
                  <Text className="font-display text-sm text-ink text-center">
                    No hay cartas en tu inventario que coincidan
                  </Text>
                  <Text className="font-sans text-xs text-muted text-center mt-1">
                    Cambia a la pestaña &quot;Buscar en TCGdex&quot; para insertar cualquier carta del catálogo.
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={ownedCards}
                  keyExtractor={(item) => item.card.id}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ gap: 6 }}
                  renderItem={({ item }) => {
                    const alreadyInBinder = existingIds.has(item.card.id);
                    const img = getCardImageUrl(item.card.image ?? undefined, 'low');
                    return (
                      <Pressable
                        onPress={() => {
                          if (!alreadyInBinder) handleAddFromOwned(item.card);
                        }}
                        className={`min-h-[44px] rounded-pocket border px-3 py-2 flex-row items-center justify-between ${
                          alreadyInBinder
                            ? 'bg-pocket border-foil/60'
                            : 'bg-binder border-stitch'
                        }`}
                      >
                        <View className="flex-row items-center gap-2.5 flex-1 pr-2">
                          <View className="w-8 h-11 bg-pocket border border-stitch rounded-pocket overflow-hidden items-center justify-center">
                            {img ? (
                              <Image
                                source={{ uri: img }}
                                style={{ width: '100%', height: '100%' }}
                                resizeMode="contain"
                              />
                            ) : null}
                          </View>
                          <View className="flex-1">
                            <Text
                              className="font-display text-sm text-ink"
                              numberOfLines={1}
                            >
                              {item.card.name}
                            </Text>
                            <Text className="font-mono text-[10px] text-muted tabular-nums">
                              #{item.card.localId} • {item.card.setName} (×{item.counts.total})
                            </Text>
                          </View>
                        </View>

                        <View
                          className={`min-h-[36px] px-2.5 rounded-pocket border flex-row items-center gap-1 ${
                            alreadyInBinder
                              ? 'bg-page border-foil'
                              : 'bg-foil border-foil'
                          }`}
                        >
                          {alreadyInBinder ? (
                            <>
                              <Check size={13} color={TOKENS.accentPrimary} />
                              <Text className="font-mono text-[10px] text-foil">
                                EN ÁLBUM
                              </Text>
                            </>
                          ) : (
                            <>
                              <Plus size={13} color={TOKENS.bgBinder} />
                              <Text className="font-mono-semi text-[10px] text-binder">
                                AGREGAR
                              </Text>
                            </>
                          )}
                        </View>
                      </Pressable>
                    );
                  }}
                />
              )
            ) : debouncedQuery.length < 2 ? (
              <View className="flex-1 items-center justify-center bg-binder border border-stitch rounded-card p-4">
                <Text className="font-display text-sm text-ink text-center">
                  Escribe el nombre de un Pokémon (mín. 2 letras)
                </Text>
                <Text className="font-sans text-xs text-muted text-center mt-1">
                  Puedes agregar cartas de cualquier expansión a los bolsillos de tu carpeta manual.
                </Text>
              </View>
            ) : catalogSearchQuery.isLoading ? (
              <BinderGridSkeleton pageLabel="BUSCANDO CARTAS..." />
            ) : catalogSearchQuery.isError ? (
              <ErrorCard
                title="Error al consultar TCGdex"
                description="No se pudo obtener la lista de cartas."
                onRetry={() => catalogSearchQuery.refetch()}
              />
            ) : (
              <FlatList
                data={catalogSearchQuery.data ?? []}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ gap: 6 }}
                renderItem={({ item }) => {
                  const alreadyInBinder = existingIds.has(item.id);
                  const img = getCardImageUrl(item.image, 'low');
                  return (
                    <Pressable
                      onPress={() => {
                        if (!alreadyInBinder) handleAddFromCatalog(item);
                      }}
                      className={`min-h-[44px] rounded-pocket border px-3 py-2 flex-row items-center justify-between ${
                        alreadyInBinder
                          ? 'bg-pocket border-foil/60'
                          : 'bg-binder border-stitch'
                      }`}
                    >
                      <View className="flex-row items-center gap-2.5 flex-1 pr-2">
                        <View className="w-8 h-11 bg-pocket border border-stitch rounded-pocket overflow-hidden items-center justify-center">
                          {img ? (
                            <Image
                              source={{ uri: img }}
                              style={{ width: '100%', height: '100%' }}
                              resizeMode="contain"
                            />
                          ) : null}
                        </View>
                        <View className="flex-1">
                          <Text
                            className="font-display text-sm text-ink"
                            numberOfLines={1}
                          >
                            {item.name}
                          </Text>
                          <Text className="font-mono text-[10px] text-muted tabular-nums">
                            #{item.localId} • ID: {item.id.toUpperCase()}
                          </Text>
                        </View>
                      </View>

                      <View
                        className={`min-h-[36px] px-2.5 rounded-pocket border flex-row items-center gap-1 ${
                          alreadyInBinder
                            ? 'bg-page border-foil'
                            : 'bg-foil border-foil'
                        }`}
                      >
                        {alreadyInBinder ? (
                          <>
                            <Check size={13} color={TOKENS.accentPrimary} />
                            <Text className="font-mono text-[10px] text-foil">
                              EN ÁLBUM
                            </Text>
                          </>
                        ) : (
                          <>
                            <Plus size={13} color={TOKENS.bgBinder} />
                            <Text className="font-mono-semi text-[10px] text-binder">
                              AGREGAR
                            </Text>
                          </>
                        )}
                      </View>
                    </Pressable>
                  );
                }}
              />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}
