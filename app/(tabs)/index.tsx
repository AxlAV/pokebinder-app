import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BookOpen, Layers, Plus, Sparkles } from 'lucide-react-native';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { BinderGridSkeleton } from '@/components/ui/BinderGridSkeleton';
import { ErrorCard } from '@/components/ui/ErrorCard';
import { BinderListItem } from '@/components/binders/BinderListItem';
import {
  CreateBinderModal,
  type CreationMode,
} from '@/components/binders/CreateBinderModal';
import { BinderPaginatedView } from '@/components/binders/BinderPaginatedView';
import {
  useBindersQuery,
  useOwnedCardsQuery,
  useManualBinderCountsMapQuery,
  useDeleteBinderMutation,
} from '@/hooks/useDatabase';
import { matchesElementalType } from '@/utils/elementalTypes';
import type { BinderRow } from '@/db/schema';
import { TOKENS } from '@/theme/tokens';

type FilterType = 'all' | 'set' | 'manual' | 'dynamic';

export default function BindersScreen() {
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createInitialMode, setCreateInitialMode] =
    useState<CreationMode>('set');
  const [openedBinderId, setOpenedBinderId] = useState<string | null>(null);

  const bindersQuery = useBindersQuery();
  const ownedCardsQuery = useOwnedCardsQuery();
  const manualCountsQuery = useManualBinderCountsMapQuery();
  const deleteBinderMutation = useDeleteBinderMutation();

  const allBinders = bindersQuery.data ?? [];
  const ownedCards = ownedCardsQuery.data ?? [];
  const manualCountsMap = manualCountsQuery.data ?? {};

  // Mapa setId -> cantidad de cartas únicas obtenidas en inventario
  const ownedUniqueBySet = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const entry of ownedCards) {
      const sId = entry.card.setId;
      counts[sId] = (counts[sId] ?? 0) + 1;
    }
    return counts;
  }, [ownedCards]);

  const filteredBinders = useMemo(() => {
    if (filterType === 'all') return allBinders;
    return allBinders.filter((b) => b.type === filterType);
  }, [allBinders, filterType]);

  const openedBinder = useMemo(
    () => allBinders.find((b) => b.id === openedBinderId) ?? null,
    [allBinders, openedBinderId]
  );

  const openCreateModal = (mode: CreationMode) => {
    setCreateInitialMode(mode);
    setCreateModalVisible(true);
  };

  const getBinderCardCount = (binder: BinderRow): number => {
    if (binder.type === 'set' && binder.setId) {
      return ownedUniqueBySet[binder.setId] ?? 0;
    }
    if (binder.type === 'manual') {
      return manualCountsMap[binder.id] ?? 0;
    }
    if (binder.type === 'dynamic' && binder.ruleValue) {
      const ruleVal = binder.ruleValue.trim().toLowerCase();
      if (binder.ruleType === 'pokemon') {
        return ownedCards.filter((entry) =>
          entry.card.name.toLowerCase().includes(ruleVal)
        ).length;
      }
      if (binder.ruleType === 'element') {
        return ownedCards.filter((entry) =>
          matchesElementalType(entry.card.typesJson, binder.ruleValue ?? '')
        ).length;
      }
    }
    return 0;
  };

  // Si hay un álbum abierto, mostrar su vista de carpeta paginada de 3x3 bolsillos
  if (openedBinder) {
    return (
      <BinderPaginatedView
        binder={openedBinder}
        onBack={() => setOpenedBinderId(null)}
      />
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-binder" edges={['top']}>
      <ScreenHeader
        sectionCode="BÓVEDA LOCAL // SQLITE"
        title="Mis Álbumes"
        subtitle="Carpetas por expansión oficial, manuales o reglas dinámicas"
        counterText={`${String(allBinders.length).padStart(2, '0')} ÁLBUMES`}
      />

      {/* Barra de creación rápida (Set / Manual / Dinámico) y filtros */}
      <View className="px-3 pt-3 pb-2 gap-2.5">
        <View className="bg-page border border-stitch rounded-card p-2.5 gap-2.5">
          <View className="flex-row gap-1.5">
            <Pressable
              onPress={() => openCreateModal('set')}
              className="flex-1 min-h-[44px] bg-foil rounded-pocket px-2 flex-row items-center justify-center gap-1 active:opacity-85"
            >
              <Plus size={14} color={TOKENS.bgBinder} />
              <Text className="font-sans-semi text-[11px] uppercase text-binder">
                Set Oficial
              </Text>
            </Pressable>

            <Pressable
              onPress={() => openCreateModal('manual')}
              className="flex-1 min-h-[44px] bg-pocket border border-foil/60 rounded-pocket px-2 flex-row items-center justify-center gap-1 active:opacity-80"
            >
              <BookOpen size={14} color={TOKENS.accentPrimary} />
              <Text className="font-sans-semi text-[11px] uppercase text-foil">
                Manual
              </Text>
            </Pressable>

            <Pressable
              onPress={() => openCreateModal('dynamic')}
              className="flex-1 min-h-[44px] bg-pocket border border-foil/60 rounded-pocket px-2 flex-row items-center justify-center gap-1 active:opacity-80"
            >
              <Sparkles size={14} color={TOKENS.accentPrimary} />
              <Text className="font-sans-semi text-[11px] uppercase text-foil">
                Dinámico
              </Text>
            </Pressable>
          </View>

          <View className="flex-row items-center justify-between pt-2 border-t border-stitch">
            <View className="flex-row items-center gap-1.5">
              <Layers size={14} color={TOKENS.accentPrimary} />
              <Text className="font-mono text-[10px] text-muted">
                FILTRAR
              </Text>
            </View>

            <View className="flex-row gap-1">
              {(
                [
                  { id: 'all', label: 'Todos' },
                  { id: 'set', label: 'Sets' },
                  { id: 'manual', label: 'Manual' },
                  { id: 'dynamic', label: 'Reglas' },
                ] as const
              ).map((tab) => {
                const active = filterType === tab.id;
                return (
                  <Pressable
                    key={tab.id}
                    onPress={() => setFilterType(tab.id)}
                    className={`min-h-[44px] px-2.5 rounded-pocket border items-center justify-center ${
                      active
                        ? 'bg-pocket border-foil'
                        : 'bg-binder border-stitch'
                    }`}
                  >
                    <Text
                      className={`font-mono text-[10px] uppercase ${
                        active ? 'text-foil' : 'text-muted'
                      }`}
                    >
                      {tab.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </View>

      {/* Listado de álbumes persistidos en SQLite */}
      <View className="flex-1 px-3">
        {bindersQuery.isLoading ? (
          <BinderGridSkeleton pageLabel="SQLITE // CARGANDO ÁLBUMES..." />
        ) : bindersQuery.isError ? (
          <ErrorCard
            title="No se pudo abrir el índice de álbumes"
            description="El archivo local de base de datos no respondió a la lectura inicial."
            retryLabel="Reintentar lectura"
            onRetry={() => bindersQuery.refetch()}
          />
        ) : (
          <FlatList
            data={filteredBinders}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingBottom: 24 }}
            renderItem={({ item }) => (
              <BinderListItem
                binder={item}
                cardCount={getBinderCardCount(item)}
                onSelect={(binder) => setOpenedBinderId(binder.id)}
                onDelete={(binderId) => deleteBinderMutation.mutate(binderId)}
              />
            )}
            ListEmptyComponent={
              <EmptyState
                icon={BookOpen}
                badge="SIN LÍMITES"
                title={
                  filterType === 'all'
                    ? 'Tu estantería de carpetas está vacía'
                    : filterType === 'set'
                      ? 'Aún no tienes álbumes de Set Oficial'
                      : filterType === 'manual'
                        ? 'Aún no tienes carpetas manuales'
                        : 'Aún no tienes álbumes dinámicos por regla'
                }
                description="Crea un álbum vinculado a un Set Oficial de TCGdex, una carpeta manual o un álbum dinámico por Pokémon o tipo elemental."
                actionLabel="Crear Álbum de Set Oficial"
                onAction={() => openCreateModal('set')}
                secondaryActionLabel="Crear Álbum Dinámico"
                onSecondaryAction={() => openCreateModal('dynamic')}
              />
            }
          />
        )}
      </View>

      <CreateBinderModal
        visible={createModalVisible}
        initialMode={createInitialMode}
        onClose={() => setCreateModalVisible(false)}
      />
    </SafeAreaView>
  );
}
