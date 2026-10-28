import { ReactElement } from 'react';
import { ActivityIndicator, FlatList, ListRenderItem, RefreshControl, StyleSheet, View } from 'react-native';
import { colors } from '../theme';
import { Banner, Empty, IconName, useBottomSpace, useSidePadding } from './ui';
import { Text } from './Text';
import { KeyboardAwareScrollView } from './KeyboardAware';

// FlatList with pull-to-refresh, infinite scroll and safe-area padding.
export function PagedList<T extends { id: string }>({
  paged,
  renderItem,
  header,
  emptyText,
  emptyIcon,
}: {
  paged: {
    items: T[];
    loading: boolean;
    refreshing: boolean;
    loadingMore: boolean;
    hasMore: boolean;
    error: string;
    refresh: () => void;
    loadMore: () => void;
  };
  renderItem: ListRenderItem<T>;
  header?: ReactElement;
  emptyText: string;
  emptyIcon?: IconName;
}) {
  const bottom = useBottomSpace();
  const side = useSidePadding();
  const { items, loading, refreshing, loadingMore, hasMore, error } = paged;

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.surface }}
      data={items}
      keyExtractor={(i) => i.id}
      renderItem={renderItem}
      contentContainerStyle={[{ paddingTop: 14, paddingBottom: bottom }, side]}
      ListHeaderComponent={
        <>
          {header}
          {error ? <Banner text={error} /> : null}
        </>
      }
      ListEmptyComponent={
        loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
        ) : (
          <View style={s.emptyCard}>
            <Empty icon={emptyIcon} text={emptyText} />
          </View>
        )
      }
      ListFooterComponent={
        items.length > 0 ? (
          loadingMore ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
          ) : !hasMore ? (
            <Text style={s.end}>You've reached the end</Text>
          ) : undefined
        ) : undefined
      }
      onEndReached={paged.loadMore}
      onEndReachedThreshold={0.4}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={paged.refresh} colors={[colors.primary]} tintColor={colors.primary} />}
      keyboardShouldPersistTaps="handled"
      renderScrollComponent={(props) => <KeyboardAwareScrollView {...props} />}
      showsVerticalScrollIndicator={false}
    />
  );
}

// Grouped list row: white background with rounded first/last row.
export function groupStyle(index: number, count: number) {
  return [
    s.groupRow,
    index === 0 && s.groupFirst,
    index === count - 1 && s.groupLast,
    index > 0 && s.groupDivider,
  ];
}

const s = StyleSheet.create({
  emptyCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  end: { textAlign: 'center', color: colors.faint, fontSize: 12, marginVertical: 14 },
  groupRow: { backgroundColor: '#fff', paddingHorizontal: 14, borderLeftWidth: StyleSheet.hairlineWidth, borderRightWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  groupFirst: { borderTopLeftRadius: 16, borderTopRightRadius: 16, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 4 },
  groupLast: { borderBottomLeftRadius: 16, borderBottomRightRadius: 16, borderBottomWidth: StyleSheet.hairlineWidth, paddingBottom: 4 },
  groupDivider: { borderTopWidth: 0 },
});
