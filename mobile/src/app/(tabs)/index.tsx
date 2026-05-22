import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, StatusBar,
  RefreshControl, Dimensions, Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Converte string BRL (ex: "R$ 1.500,00") para número
function parseBRL(value: any): number {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  const str = String(value);
  // Se já for um número formatado com ponto, converte direto
  if (/^[-]?\d+(\.\d+)?$/.test(str)) return parseFloat(str);
  
  // Limpa tudo que não for dígito, vírgula ou sinal de menos
  const cleaned = str.replace(/[^\d,-]/g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

// Formata número ou string BRL para R$ X.XXX,XX
function fmtBRL(value: any): string {
  if (typeof value === 'string' && value.trim().startsWith('R$')) return value;
  const num = parseBRL(value);
  return `R$ ${num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Card de resumo memoizado
const SummaryCard = React.memo(({ label, value, icon, ibg, ic, toggle, showBalance, onToggle, diff }: any) => (
  <View style={s.card}>
    <View style={s.cardTop}>
      <Text style={s.cardLabel}>{label}</Text>
      <View style={[s.iconBg, { backgroundColor: ibg }]}>
        <Ionicons name={icon} size={16} color={ic} />
      </View>
    </View>
    <View style={s.valRow}>
      <Text style={[s.cardValue, { color: ic }]} numberOfLines={1}>
        {toggle && !showBalance ? 'R$ ••••' : value}
      </Text>
      {toggle && (
        <TouchableOpacity onPress={onToggle} style={{ marginLeft: 8, padding: 4 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name={showBalance ? 'eye-outline' : 'eye-off-outline'} size={18} color="#94a3b8" />
        </TouchableOpacity>
      )}
    </View>
    {diff !== undefined && (
      <Text style={[s.diffTxt, { color: diff >= 0 ? '#10b981' : '#ef4444' }]}>
        {diff >= 0 ? '↑' : '↓'} {Math.abs(diff).toFixed(1)}% vs mês anterior
      </Text>
    )}
  </View>
));

// Item de transação recente memoizado
const TxItem = React.memo(({ item, onPress }: any) => {
  const isExp = item.type === 'despesa';
  const val = parseFloat(item.value || 0);
  return (
    <TouchableOpacity style={s.txItem} onPress={() => onPress(item.id)} activeOpacity={0.7}>
      <View style={[s.txIcon, { backgroundColor: isExp ? '#fee2e2' : '#dcfce7' }]}>
        <Ionicons name={isExp ? 'arrow-down' : 'arrow-up'} size={14} color={isExp ? '#ef4444' : '#10b981'} />
      </View>
      <View style={s.txInfo}>
        <Text style={s.txDesc} numberOfLines={1}>{item.description}</Text>
        <Text style={s.txDate}>{new Date(item.date).toLocaleDateString('pt-BR')}</Text>
      </View>
      <Text style={[s.txVal, { color: isExp ? '#ef4444' : '#10b981' }]}>
        {isExp ? '-' : '+'}{fmtBRL(val)}
      </Text>
    </TouchableOpacity>
  );
});

export default function DashboardScreen() {
  const router = useRouter();
  const { user, token, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<any>(null);
  const [showBalance, setShowBalance] = useState(true);
  const [recentTx, setRecentTx] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());

  useFocusEffect(
    useCallback(() => {
      if (!token) { router.replace('/login'); return; }
      loadData();
    }, [month, year, token])
  );

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month + 1, 0).getDate();
      const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${lastDay}`;

      const [dashRes, txRes, notifRes] = await Promise.all([
        api.get('/reports/dashboard', { params: { start_date: startDate, end_date: endDate } }),
        api.get('/transactions', { params: { per_page: 5, date_from: startDate, date_to: endDate } }),
        api.get('/notifications', { params: { limit: 1 } }).catch(() => ({ data: { unread_count: 0 } })),
      ]);

      setData({
        ...dashRes.data,
        faturas_periodo: dashRes.data.faturas_periodo || 0,
      });
      setRecentTx(txRes.data.data || []);
      setUnreadCount(notifRes.data.unread_count || 0);
    } catch (e: any) {
      if (e.response?.status === 401) { signOut(); router.replace('/login'); }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const changeMonth = (d: 1 | -1) => {
    let m = month + d, y = year;
    if (m > 11) { m = 0; y++; }
    if (m < 0) { m = 11; y--; }
    setMonth(m); setYear(y);
  };

  const isCurrentMonth = month === now.getMonth() && year === now.getFullYear();
  const firstName = user?.name?.split(' ')[0] || 'Usuário';

  const handleTxPress = useCallback((id: number) => {
    router.push(`/transaction-detail?id=${id}` as any);
  }, [router]);

  if (loading) return (
    <View style={s.center}>
      <ActivityIndicator size="large" color="#10b981" />
    </View>
  );

  const cards = [
    {
      label: 'Saldo Atual',
      value: fmtBRL(data?.saldo_atual),
      icon: 'wallet-outline' as const,
      ibg: '#dcfce7', ic: '#10b981',
      toggle: true,
    },
    {
      label: 'Saldo Previsto',
      value: fmtBRL(data?.saldo_previsto),
      icon: 'bar-chart-outline' as const,
      ibg: '#f3e8ff', ic: '#a855f7',
    },
    {
      label: 'Receitas do Período',
      value: fmtBRL(data?.receitas_periodo),
      icon: 'arrow-up-circle-outline' as const,
      ibg: '#d1fae5', ic: '#10b981',
    },
    {
      label: 'Despesas do Período',
      value: fmtBRL(data?.despesas_periodo),
      icon: 'arrow-down-circle-outline' as const,
      ibg: '#fee2e2', ic: '#ef4444',
    },
    {
      label: 'Faturas do Período',
      value: fmtBRL(data?.faturas_periodo),
      icon: 'card-outline' as const,
      ibg: '#fef3c7', ic: '#f59e0b',
    },
  ];

  // Calcular balanço para barra de progresso
  const receitas = parseBRL(data?.receitas_periodo);
  const despesas = parseBRL(data?.despesas_periodo);
  const totalMov = receitas + despesas;
  const despesasPct = totalMov > 0 ? (despesas / totalMov) * 100 : 0;
  const receitasPct = totalMov > 0 ? (receitas / totalMov) * 100 : 0;

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Text style={s.greeting}>👋 Olá, {firstName}!</Text>
          <Text style={s.title}>Dashboard</Text>
        </View>
        <TouchableOpacity
          style={s.iconBtn}
          onPress={() => router.push('/notifications' as any)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="notifications-outline" size={22} color="#64748b" />
          {unreadCount > 0 && (
            <View style={s.badge}>
              <Text style={s.badgeTxt}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Seletor de mês */}
      <View style={s.monthRow}>
        <TouchableOpacity onPress={() => changeMonth(-1)} style={s.monthArrow} hitSlop={{ top: 12, bottom: 12, left: 12, right: 4 }}>
          <Ionicons name="chevron-back" size={20} color="#64748b" />
        </TouchableOpacity>
        <Text style={s.monthLabel}>{MONTHS[month]}/{year}</Text>
        <TouchableOpacity onPress={() => changeMonth(1)} style={s.monthArrow} hitSlop={{ top: 12, bottom: 12, left: 4, right: 12 }}>
          <Ionicons name="chevron-forward" size={20} color="#64748b" />
        </TouchableOpacity>
        {!isCurrentMonth && (
          <TouchableOpacity
            style={s.todayBtn}
            onPress={() => { setMonth(now.getMonth()); setYear(now.getFullYear()); }}
          >
            <Text style={s.todayTxt}>Hoje</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor="#10b981" colors={['#10b981']} />}
      >
        {/* Cards horizontais */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.cardsRow}>
          {cards.map((c, i) => (
            <SummaryCard
              key={i}
              {...c}
              showBalance={showBalance}
              onToggle={() => setShowBalance(v => !v)}
            />
          ))}
        </ScrollView>

        {/* Balanço do período */}
        {totalMov > 0 && (
          <View style={s.section}>
            <Text style={s.secTitle}>Balanço do Período</Text>
            <View style={s.balanceBar}>
              <View style={[s.barSegment, { flex: receitasPct, backgroundColor: '#10b981' }]} />
              <View style={[s.barSegment, { flex: despesasPct, backgroundColor: '#ef4444' }]} />
            </View>
            <View style={s.balanceLegend}>
              <View style={s.legendItem}>
                <View style={[s.legendDot, { backgroundColor: '#10b981' }]} />
                <Text style={s.legendTxt}>Receitas {receitasPct.toFixed(0)}%</Text>
              </View>
              <View style={s.legendItem}>
                <View style={[s.legendDot, { backgroundColor: '#ef4444' }]} />
                <Text style={s.legendTxt}>Despesas {despesasPct.toFixed(0)}%</Text>
              </View>
            </View>
          </View>
        )}

        {/* Transações Recentes */}
        <View style={s.section}>
          <View style={s.secHeader}>
            <Text style={s.secTitle}>Lançamentos Recentes</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/transactions')}>
              <Text style={s.seeAll}>Ver todos →</Text>
            </TouchableOpacity>
          </View>
          {recentTx.length === 0 ? (
            <View style={s.emptyBox}>
              <Ionicons name="receipt-outline" size={36} color="#e2e8f0" />
              <Text style={s.emptyTxt}>Nenhum lançamento no período</Text>
              <TouchableOpacity style={s.addTxBtn} onPress={() => router.push('/new-transaction')}>
                <Ionicons name="add" size={16} color="#10b981" />
                <Text style={s.addTxTxt}>Adicionar lançamento</Text>
              </TouchableOpacity>
            </View>
          ) : (
            recentTx.map(item => (
              <TxItem key={item.id} item={item} onPress={handleTxPress} />
            ))
          )}
        </View>

        {/* Atalhos Rápidos */}
        <View style={s.section}>
          <Text style={s.secTitle}>Atalhos Rápidos</Text>
          <View style={s.shortcutsGrid}>
            {[
              { label: 'Contas', icon: 'wallet-outline', route: '/accounts', color: '#10b981', bg: '#dcfce7' },
              { label: 'Cartões', icon: 'card-outline', route: '/cards', color: '#3b82f6', bg: '#dbeafe' },
              { label: 'Orçamentos', icon: 'pie-chart-outline', route: '/budgets', color: '#a855f7', bg: '#f3e8ff' },
              { label: 'Objetivos', icon: 'flag-outline', route: '/goals', color: '#f59e0b', bg: '#fef3c7' },
              { label: 'Recorrências', icon: 'repeat-outline', route: '/recurring', color: '#ef4444', bg: '#fee2e2' },
              { label: 'Insights', icon: 'bulb-outline', route: '/insights', color: '#06b6d4', bg: '#e0f7fa' },
            ].map(item => (
              <TouchableOpacity
                key={item.label}
                style={s.shortcutItem}
                onPress={() => router.push(item.route as any)}
                activeOpacity={0.7}
              >
                <View style={[s.shortcutIcon, { backgroundColor: item.bg }]}>
                  <Ionicons name={item.icon as any} size={22} color={item.color} />
                </View>
                <Text style={s.shortcutLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#fff', paddingTop: 56, paddingHorizontal: 24, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  headerLeft: {},
  greeting: { fontSize: 13, color: '#64748b', marginBottom: 2 },
  title: { fontSize: 24, fontWeight: '800', color: '#0f172a' },
  iconBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#f1f5f9',
  },
  badge: {
    position: 'absolute', top: 0, right: 0,
    backgroundColor: '#ef4444', minWidth: 18, height: 18,
    borderRadius: 9, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  badgeTxt: { color: '#fff', fontSize: 9, fontWeight: '800' },
  monthRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff', paddingVertical: 12, paddingHorizontal: 20, gap: 8,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  monthArrow: { padding: 4 },
  monthLabel: { fontSize: 16, fontWeight: '700', color: '#0f172a', minWidth: 90, textAlign: 'center' },
  todayBtn: { backgroundColor: '#dcfce7', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginLeft: 8 },
  todayTxt: { color: '#10b981', fontSize: 12, fontWeight: '700' },
  scroll: { padding: 20 },
  cardsRow: { paddingRight: 20, gap: 16, marginBottom: 24 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 18,
    minWidth: 180, maxWidth: 200,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  iconBg: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  cardLabel: { fontSize: 12, fontWeight: '600', color: '#64748b', flex: 1, marginRight: 4 },
  valRow: { flexDirection: 'row', alignItems: 'center' },
  cardValue: { fontSize: 18, fontWeight: '800', color: '#0f172a', flex: 1 },
  diffTxt: { fontSize: 11, fontWeight: '600', marginTop: 8 },
  section: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 24,
  },
  secHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  secTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  seeAll: { fontSize: 13, fontWeight: '600', color: '#10b981' },
  // Balanço
  balanceBar: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', marginTop: 12, marginBottom: 12 },
  barSegment: { height: '100%' },
  balanceLegend: { flexDirection: 'row', gap: 20 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendTxt: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  // Transações
  txItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f8fafc',
  },
  txIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  txInfo: { flex: 1 },
  txDesc: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  txDate: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  txVal: { fontSize: 14, fontWeight: '700' },
  // Empty
  emptyBox: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emptyTxt: { fontSize: 13, color: '#94a3b8', fontWeight: '500' },
  addTxBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, borderColor: '#10b981', marginTop: 8 },
  addTxTxt: { fontSize: 14, fontWeight: '600', color: '#10b981' },
  // Atalhos
  shortcutsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 },
  shortcutItem: { width: '30%', alignItems: 'center', gap: 8 },
  shortcutIcon: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  shortcutLabel: { fontSize: 11, fontWeight: '600', color: '#475569', textAlign: 'center' },
});
