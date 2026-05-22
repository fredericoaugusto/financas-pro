import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import api from '../../services/api';

const TYPE_FILTERS = [
  { label: 'Todos', value: '' },
  { label: 'Receitas', value: 'receita' },
  { label: 'Despesas', value: 'despesa' },
];

export default function TransactionsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      setPage(1);
      fetchTransactions(1, true);
    }, [typeFilter])
  );

  const fetchTransactions = async (p = 1, reset = false) => {
    try {
      const params: any = { page: p, per_page: 20 };
      if (typeFilter) params.type = typeFilter;
      if (search.trim()) params.search = search.trim();

      const res = await api.get('/transactions', { params });
      const items = res.data.data || [];
      const meta = res.data.meta || {};

      setTransactions(prev => reset ? items : [...prev, ...items]);
      setHasMore(p < (meta.last_page || 1));
      setPage(p);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (hasMore && !loading) {
      const next = page + 1;
      fetchTransactions(next);
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const isExp = item.type === 'despesa';
    const val = parseFloat(item.value || 0);
    return (
      <TouchableOpacity style={s.txCard} onPress={() => router.push(`/transaction-detail?id=${item.id}` as any)} activeOpacity={0.7}>
        <View style={[s.txIconBox, { backgroundColor: isExp ? '#fee2e2' : '#dcfce7' }]}>
          <Ionicons name={isExp ? 'arrow-down' : 'arrow-up'} size={18} color={isExp ? '#ef4444' : '#10b981'} />
        </View>
        <View style={s.txMid}>
          <Text style={s.txDesc} numberOfLines={1}>{item.description}</Text>
          <View style={s.txMeta}>
            {item.category?.name && (
              <View style={s.badge}><Text style={s.badgeTxt}>{item.category.name}</Text></View>
            )}
            <Text style={s.txDate}>{new Date(item.date).toLocaleDateString('pt-BR')}</Text>
          </View>
        </View>
        <Text style={[s.txVal, { color: isExp ? '#ef4444' : '#10b981' }]}>
          {isExp ? '-' : '+'}R$ {val.toFixed(2).replace('.', ',')}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Text style={s.title}>Lançamentos</Text>
        <Text style={s.sub}>Histórico de movimentações</Text>
      </View>

      {/* Barra de pesquisa */}
      <View style={s.searchBar}>
        <Ionicons name="search-outline" size={18} color="#94a3b8" />
        <TextInput
          style={s.searchInput}
          placeholder="Buscar descrição..."
          placeholderTextColor="#cbd5e1"
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={() => fetchTransactions(1, true)}
          returnKeyType="search"
        />
      </View>

      {/* Filtros por pílulas */}
      <View style={s.filtersRow}>
        {TYPE_FILTERS.map(f => (
          <TouchableOpacity
            key={f.value}
            style={[s.pill, typeFilter === f.value && s.pillActive]}
            onPress={() => setTypeFilter(f.value)}
          >
            <Text style={[s.pillTxt, typeFilter === f.value && s.pillTxtActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && page === 1 ? (
        <View style={s.center}><ActivityIndicator size="large" color="#10b981" /></View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={item => item.id?.toString()}
          renderItem={renderItem}
          contentContainerStyle={s.list}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchTransactions(1, true).finally(() => setRefreshing(false)); }} tintColor="#10b981" colors={['#10b981']} />}
          ListEmptyComponent={
            <View style={s.emptyBox}>
              <Ionicons name="receipt-outline" size={56} color="#e2e8f0" />
              <Text style={s.emptyTitle}>Nenhum lançamento</Text>
              <Text style={s.emptyTxt}>Adicione seu primeiro lançamento usando o botão "+".</Text>
            </View>
          }
          ListFooterComponent={hasMore ? <ActivityIndicator color="#10b981" style={{ marginVertical: 16 }} /> : null}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#fff', paddingTop: 56, paddingHorizontal: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  title: { fontSize: 24, fontWeight: '800', color: '#0f172a' },
  sub: { fontSize: 14, color: '#64748b', marginTop: 2 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, marginHorizontal: 20, marginTop: 16, paddingHorizontal: 14, height: 46, gap: 10 },
  searchInput: { flex: 1, fontSize: 14, color: '#0f172a' },
  filtersRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginTop: 12, marginBottom: 4 },
  pill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  pillActive: { backgroundColor: '#10b981', borderColor: '#10b981' },
  pillTxt: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  pillTxtActive: { color: '#fff' },
  list: { padding: 20, paddingBottom: 100 },
  txCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#f1f5f9', gap: 12 },
  txIconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  txMid: { flex: 1 },
  txDesc: { fontSize: 14, fontWeight: '600', color: '#1e293b', marginBottom: 4 },
  txMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { backgroundColor: '#f1f5f9', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  badgeTxt: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  txDate: { fontSize: 12, color: '#94a3b8' },
  txVal: { fontSize: 15, fontWeight: '700' },
  emptyBox: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#64748b' },
  emptyTxt: { fontSize: 14, color: '#94a3b8', textAlign: 'center', lineHeight: 20 },
});
