import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, TextInput, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import api from '../../services/api';
import EmptyState from '../../components/EmptyState';

const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

const TYPE_FILTERS = [
  { label: 'Todos', value: '' },
  { label: '↑ Receitas', value: 'receita' },
  { label: '↓ Despesas', value: 'despesa' },
];

// Item de transação memoizado para performance
const TxCard = React.memo(({ item, onPress }: { item: any; onPress: (id: number) => void }) => {
  const isExp = item.type === 'despesa';
  const val = parseFloat(item.value || 0);
  return (
    <TouchableOpacity
      style={s.txCard}
      onPress={() => onPress(item.id)}
      activeOpacity={0.7}
    >
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
      <View style={s.txRight}>
        <Text style={[s.txVal, { color: isExp ? '#ef4444' : '#10b981' }]}>
          {isExp ? '-' : '+'}R$ {val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </Text>
        {item.status === 'pendente' && (
          <View style={s.pendenteBadge}>
            <Text style={s.pendenteTxt}>Pendente</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
});

export default function TransactionsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalReceitas, setTotalReceitas] = useState(0);
  const [totalDespesas, setTotalDespesas] = useState(0);

  // Filtro de mês
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());

  useFocusEffect(
    useCallback(() => {
      setPage(1);
      fetchTransactions(1, true);
    }, [typeFilter, month, year])
  );

  const fetchTransactions = async (p = 1, reset = false) => {
    if (reset) setLoading(true);
    try {
      const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month + 1, 0).getDate();
      const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${lastDay}`;

      const params: any = { page: p, per_page: 25, date_from: startDate, date_to: endDate };
      if (typeFilter) params.type = typeFilter;
      if (search.trim()) params.search = search.trim();

      const res = await api.get('/transactions', { params });
      const items = res.data.data || [];
      const meta = res.data.meta || {};

      setTransactions(prev => reset ? items : [...prev, ...items]);
      setHasMore(p < (meta.last_page || 1));
      setPage(p);

      // Totais do período (soma local)
      if (reset) {
        const receita = items.filter((i: any) => i.type === 'receita').reduce((a: number, i: any) => a + parseFloat(i.value || 0), 0);
        const despesa = items.filter((i: any) => i.type === 'despesa').reduce((a: number, i: any) => a + parseFloat(i.value || 0), 0);
        setTotalReceitas(receita);
        setTotalDespesas(despesa);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadMore = useCallback(() => {
    if (hasMore && !loading) {
      fetchTransactions(page + 1);
    }
  }, [hasMore, loading, page]);

  const handleTxPress = useCallback((id: number) => {
    router.push(`/transaction-detail?id=${id}` as any);
  }, [router]);

  const renderItem = useCallback(({ item }: { item: any }) => (
    <TxCard item={item} onPress={handleTxPress} />
  ), [handleTxPress]);

  const keyExtractor = useCallback((item: any) => item.id?.toString(), []);

  const changeMonth = (d: 1 | -1) => {
    let m = month + d, y = year;
    if (m > 11) { m = 0; y++; }
    if (m < 0) { m = 11; y--; }
    setMonth(m); setYear(y);
  };

  const handleSearch = () => fetchTransactions(1, true);

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Lançamentos</Text>
        <TouchableOpacity
          style={s.addBtn}
          onPress={() => router.push('/new-transaction')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Seletor de mês */}
      <View style={s.monthRow}>
        <TouchableOpacity onPress={() => changeMonth(-1)} style={s.monthArrow} hitSlop={{ top: 12, bottom: 12, left: 12, right: 4 }}>
          <Ionicons name="chevron-back" size={18} color="#64748b" />
        </TouchableOpacity>
        <Text style={s.monthLabel}>{MONTHS[month]}/{year}</Text>
        <TouchableOpacity onPress={() => changeMonth(1)} style={s.monthArrow} hitSlop={{ top: 12, bottom: 12, left: 4, right: 12 }}>
          <Ionicons name="chevron-forward" size={18} color="#64748b" />
        </TouchableOpacity>
      </View>

      {/* Totais do mês */}
      {(totalReceitas > 0 || totalDespesas > 0) && (
        <View style={s.totalsRow}>
          <View style={s.totalItem}>
            <Ionicons name="arrow-up-circle" size={16} color="#10b981" />
            <Text style={s.totalLabel}>Receitas</Text>
            <Text style={[s.totalVal, { color: '#10b981' }]}>
              R$ {totalReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </Text>
          </View>
          <View style={s.totalDivider} />
          <View style={s.totalItem}>
            <Ionicons name="arrow-down-circle" size={16} color="#ef4444" />
            <Text style={s.totalLabel}>Despesas</Text>
            <Text style={[s.totalVal, { color: '#ef4444' }]}>
              R$ {totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </Text>
          </View>
        </View>
      )}

      {/* Barra de pesquisa */}
      <View style={s.searchBar}>
        <Ionicons name="search-outline" size={18} color="#94a3b8" />
        <TextInput
          style={s.searchInput}
          placeholder="Buscar descrição..."
          placeholderTextColor="#cbd5e1"
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => { setSearch(''); fetchTransactions(1, true); }}>
            <Ionicons name="close-circle" size={18} color="#cbd5e1" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filtros por tipo */}
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
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={s.list}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          maxToRenderPerBatch={15}
          windowSize={7}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchTransactions(1, true); }}
              tintColor="#10b981"
              colors={['#10b981']}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="receipt-outline"
              title="Nenhum lançamento"
              subtitle={`Sem lançamentos em ${MONTHS[month]}/${year}. Adicione usando o botão "+".`}
              actionLabel="Novo Lançamento"
              onAction={() => router.push('/new-transaction')}
            />
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
  header: {
    backgroundColor: '#fff', paddingTop: 56, paddingHorizontal: 24, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
  },
  title: { fontSize: 24, fontWeight: '800', color: '#0f172a' },
  addBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#10b981', justifyContent: 'center', alignItems: 'center' },
  monthRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff', paddingVertical: 10, paddingHorizontal: 20, gap: 8,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  monthArrow: { padding: 4 },
  monthLabel: { fontSize: 15, fontWeight: '700', color: '#0f172a', minWidth: 90, textAlign: 'center' },
  totalsRow: {
    flexDirection: 'row', backgroundColor: '#fff',
    marginHorizontal: 20, marginTop: 12,
    borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#f1f5f9',
    alignItems: 'center',
  },
  totalItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  totalDivider: { width: 1, height: 24, backgroundColor: '#f1f5f9', marginHorizontal: 8 },
  totalLabel: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  totalVal: { fontSize: 13, fontWeight: '700', flex: 1, textAlign: 'right' },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: 12, marginHorizontal: 20, marginTop: 12,
    paddingHorizontal: 14, height: 46, gap: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#0f172a' },
  filtersRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginTop: 10, marginBottom: 4 },
  pill: {
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20,
    backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0',
  },
  pillActive: { backgroundColor: '#10b981', borderColor: '#10b981' },
  pillTxt: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  pillTxtActive: { color: '#fff' },
  list: { padding: 20, paddingBottom: 100 },
  txCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 16, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: '#f1f5f9',
    gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  txIconBox: { width: 42, height: 42, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  txMid: { flex: 1 },
  txDesc: { fontSize: 14, fontWeight: '600', color: '#1e293b', marginBottom: 4 },
  txMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { backgroundColor: '#f1f5f9', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  badgeTxt: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  txDate: { fontSize: 12, color: '#94a3b8' },
  txRight: { alignItems: 'flex-end', gap: 4 },
  txVal: { fontSize: 14, fontWeight: '700' },
  pendenteBadge: { backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  pendenteTxt: { fontSize: 10, fontWeight: '700', color: '#d97706' },
});
