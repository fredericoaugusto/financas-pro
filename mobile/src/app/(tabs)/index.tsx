import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, StatusBar, RefreshControl, Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PieChart, LineChart } from 'react-native-chart-kit';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

export default function DashboardScreen() {
  const router = useRouter();
  const { user, token, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<any>(null);
  const [showBalance, setShowBalance] = useState(true);
  const [recentTx, setRecentTx] = useState<any[]>([]);
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [unreadCount, setUnreadCount] = useState(0);

  useFocusEffect(
    React.useCallback(() => {
      if (!token) { router.replace('/login'); return; }
      loadData();
    }, [month, year, token])
  );

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      // Monta intervalo de datas para o mês selecionado
      const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month + 1, 0).getDate();
      const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${lastDay}`;

      const [dashRes, txRes, notifRes] = await Promise.all([
        api.get('/reports/dashboard', { params: { start_date: startDate, end_date: endDate } }),
        api.get('/transactions', { params: { per_page: 5, date_from: startDate, date_to: endDate } }),
        api.get('/notifications', { params: { limit: 1 } })
      ]);
      setData({
        ...dashRes.data,
        faturas_periodo: dashRes.data.faturas_periodo || 0,
        receitas_diff: 0, // Mock for 'vs mês anterior'
        despesas_diff: 0,
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
    if (m < 0)  { m = 11; y--; }
    setMonth(m); setYear(y);
  };

  const mask = (v: string) => showBalance ? v : 'R$ ••••••';

  const firstName = user?.name?.split(' ')[0] || 'Usuário';

  if (loading) return (
    <View style={s.center}><ActivityIndicator size="large" color="#10b981" /></View>
  );

  const cards = [
    { label: 'Saldo Atual',    value: data?.saldo_atual      || 'R$ 0,00', icon: 'card-outline'             as const, ibg: '#dcfce7', ic: '#10b981', toggle: true },
    { label: 'Saldo Previsto', value: data?.saldo_previsto   || 'R$ 0,00', icon: 'bar-chart-outline'        as const, ibg: '#f3e8ff', ic: '#a855f7' },
    { label: 'Receitas do Período', value: data?.receitas_periodo || 'R$ 0,00', icon: 'arrow-up-outline'    as const, ibg: '#d1fae5', ic: '#10b981', diff: data?.receitas_diff },
    { label: 'Despesas do Período', value: data?.despesas_periodo || 'R$ 0,00', icon: 'arrow-down-outline'  as const, ibg: '#fee2e2', ic: '#ef4444', diff: data?.despesas_diff },
    { label: 'Faturas do Período',  value: `R$ ${data?.faturas_periodo?.toFixed(2) || '0,00'}`, icon: 'card-outline' as const, ibg: '#fef3c7', ic: '#f59e0b' },
  ];

  const screenWidth = Dimensions.get('window').width;

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={s.header}>
        <View>
          <Text style={s.greeting}>👋 Olá, {firstName}!</Text>
          <Text style={s.title}>Dashboard</Text>
        </View>
        <TouchableOpacity style={s.iconBtn} onPress={() => router.push('/notifications' as any)}>
          <Ionicons name="notifications-outline" size={22} color="#64748b" />
          {unreadCount > 0 && (
            <View style={s.badge}>
              <Text style={s.badgeTxt}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={s.monthRow}>
        <TouchableOpacity onPress={() => changeMonth(-1)} style={s.monthArrow}>
          <Ionicons name="chevron-back" size={20} color="#64748b" />
        </TouchableOpacity>
        <Text style={s.monthLabel}>{MONTHS[month]}/{year}</Text>
        <TouchableOpacity onPress={() => changeMonth(1)} style={s.monthArrow}>
          <Ionicons name="chevron-forward" size={20} color="#64748b" />
        </TouchableOpacity>
        <TouchableOpacity style={s.todayBtn} onPress={() => { setMonth(now.getMonth()); setYear(now.getFullYear()); }}>
          <Text style={s.todayTxt}>Hoje</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor="#10b981" colors={['#10b981']} />}
      >
        <View style={s.banner}>
          <Ionicons name="information-circle-outline" size={18} color="#3b82f6" />
          <Text style={s.bannerTxt}>Os valores consideram os lançamentos pela data da transação.</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.cardsRow}>
          {cards.map((c, i) => (
            <View key={i} style={s.card}>
              <View style={s.cardTop}>
                <Text style={s.cardLabel}>{c.label}</Text>
                <View style={[s.iconBg, { backgroundColor: c.ibg }]}>
                  <Ionicons name={c.icon} size={16} color={c.ic} />
                </View>
              </View>
              <View style={s.valRow}>
                <Text style={[s.cardValue, c.ic === '#ef4444' ? { color: c.ic } : c.ic === '#10b981' && i > 1 ? { color: c.ic } : {}]}>{mask(c.value)}</Text>
                {c.toggle && (
                  <TouchableOpacity onPress={() => setShowBalance(!showBalance)} style={{marginLeft: 8}}>
                    <Ionicons name={showBalance ? 'eye-outline' : 'eye-off-outline'} size={18} color="#94a3b8" />
                  </TouchableOpacity>
                )}
              </View>
              {c.diff !== undefined && (
                <Text style={[s.diffTxt, { color: c.diff >= 0 ? '#10b981' : '#ef4444' }]}>
                  {c.diff >= 0 ? '↑' : '↓'} {Math.abs(c.diff)}% vs mês anterior
                </Text>
              )}
            </View>
          ))}
        </ScrollView>

        {/* Despesas por Categoria */}
        <View style={s.section}>
          <Text style={s.secTitle}>Despesas por Categoria</Text>
          <View style={s.chartBox}>
            <View style={s.donutCenter}>
              <View style={s.donutHole} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16 }}>
              <View style={[s.legendDot, { backgroundColor: '#22c55e' }]} />
              <Text style={s.emptyTxt}>Sem dados</Text>
            </View>
          </View>
        </View>

        {/* Evolução do Saldo */}
        <View style={s.section}>
          <Text style={s.secTitle}>Evolução do Saldo</Text>
          <LineChart
            data={{ labels: ["Dez", "Jan", "Fev", "Mar", "Abr", "Mai"], datasets: [{ data: [0, 0, 0, 0, 0, 0] }] }}
            width={screenWidth - 80} // from padding
            height={180}
            chartConfig={{
              backgroundColor: '#fff', backgroundGradientFrom: '#fff', backgroundGradientTo: '#fff',
              decimalPlaces: 1, color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
              style: { borderRadius: 16 }, propsForDots: { r: "3", strokeWidth: "2", stroke: "#22c55e" }
            }}
            bezier
            style={{ marginVertical: 8, borderRadius: 16 }}
          />
        </View>

        {/* Blocos Inferiores (Transações, Faturas, Orçamentos) */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
          <View style={[s.section, { flex: 1, marginBottom: 0 }]}>
            <View style={s.secHeader}>
              <Text style={s.secTitle}>Transações do Período</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/transactions')}><Text style={s.seeAll}>Ver todas</Text></TouchableOpacity>
            </View>
            <View style={s.emptyBoxSm}>
              <Text style={s.emptyTxt}>Nenhum lançamento ainda</Text>
            </View>
          </View>
          <View style={[s.section, { flex: 1, marginBottom: 0 }]}>
            <View style={s.secHeader}>
              <Text style={s.secTitle}>Faturas do Período</Text>
              <TouchableOpacity onPress={() => router.push('/cards')}><Text style={s.seeAll}>Ver cartões</Text></TouchableOpacity>
            </View>
            <View style={s.emptyBoxSm}>
              <Text style={s.emptyTxt}>Nenhuma fatura no período</Text>
            </View>
          </View>
        </View>

        <View style={s.section}>
          <View style={s.secHeader}>
            <Text style={s.secTitle}>Orçamentos do Período</Text>
            <TouchableOpacity onPress={() => router.push('/budgets')}><Text style={s.seeAll}>Ver todos</Text></TouchableOpacity>
          </View>
          <View style={s.emptyBoxSm}>
            <Text style={[s.seeAll, { textAlign: 'center' }]}>Criar primeiro orçamento →</Text>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', paddingTop: 56, paddingHorizontal: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  greeting: { fontSize: 13, color: '#64748b', marginBottom: 2 },
  title: { fontSize: 24, fontWeight: '800', color: '#0f172a' },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center' },
  badge: { position: 'absolute', top: -2, right: -2, backgroundColor: '#ef4444', minWidth: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  badgeTxt: { color: '#fff', fontSize: 9, fontWeight: '800' },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', paddingBottom: 12, gap: 12 },
  monthArrow: { padding: 6 },
  monthLabel: { fontSize: 15, fontWeight: '700', color: '#0f172a', minWidth: 80, textAlign: 'center' },
  todayBtn: { backgroundColor: '#dcfce7', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  todayTxt: { color: '#10b981', fontSize: 12, fontWeight: '700' },
  scroll: { padding: 20 },
  banner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 12, padding: 14, marginBottom: 20, gap: 10 },
  bannerTxt: { flex: 1, fontSize: 13, color: '#1e40af', lineHeight: 18 },
  cardsRow: { paddingRight: 20, gap: 12, marginBottom: 24 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, minWidth: 200, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  iconBg: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  cardLabel: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  valRow: { flexDirection: 'row', alignItems: 'center' },
  cardValue: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  diffTxt: { fontSize: 12, fontWeight: '600', marginTop: 8 },
  section: { backgroundColor: '#fff', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 16 },
  secHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  secTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  seeAll: { fontSize: 13, fontWeight: '600', color: '#10b981' },
  chartBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 20 },
  donutCenter: { width: 140, height: 140, borderRadius: 70, backgroundColor: '#22c55e', justifyContent: 'center', alignItems: 'center' },
  donutHole: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#fff' },
  legendDot: { width: 16, height: 6, borderRadius: 3, marginRight: 8 },
  emptyBoxSm: { paddingVertical: 20, alignItems: 'center', justifyContent: 'center' },
  emptyTxt: { fontSize: 13, color: '#94a3b8', fontWeight: '500' },
});
