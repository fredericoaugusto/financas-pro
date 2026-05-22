import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Dimensions, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { PieChart, LineChart, BarChart } from 'react-native-chart-kit';
import api from '../services/api';

const { width: SW } = Dimensions.get('window');
const CHART_W = SW - 80;

const chartCfg = {
  backgroundGradientFrom: '#fff',
  backgroundGradientTo: '#fff',
  color: (opacity = 1) => `rgba(15, 23, 42, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
  strokeWidth: 2,
  decimalPlaces: 0,
  propsForDots: { r: '4', strokeWidth: '2', stroke: '#10b981' },
};

const PERIODS = ['Este Mês', 'Últimos 3 meses', 'Últimos 6 meses', 'Este Ano'];
const TABS = ['Visão Geral', 'Despesas', 'Receitas'];

export default function ChartsScreenFull() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState('Últimos 6 meses');
  const [tab, setTab] = useState('Visão Geral');

  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any>(null);
  const [barData, setBarData] = useState<any>(null);
  const [savingsRate, setSavingsRate] = useState(0);
  const [savingsSaved, setSavingsSaved] = useState(0);
  const [savingsRevenues, setSavingsRevenues] = useState(0);
  const [savingsExpenses, setSavingsExpenses] = useState(0);

  useFocusEffect(useCallback(() => { loadData(); }, [period]));

  const getDateFrom = () => {
    const d = new Date();
    if (period === 'Este Mês') d.setDate(1);
    else if (period === 'Últimos 3 meses') d.setMonth(d.getMonth() - 2);
    else if (period === 'Últimos 6 meses') d.setMonth(d.getMonth() - 5);
    else d.setMonth(0), d.setDate(1); // Este ano
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`;
  };

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const strFrom = getDateFrom();
      const COLORS = ['#10b981','#3b82f6','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#ec4899'];

      const [catRes, evoRes, saveRes] = await Promise.all([
        api.get('/reports/by-category', { params: { type: tab === 'Receitas' ? 'receita' : 'despesa', date_from: strFrom } }),
        api.get('/reports/monthly-evolution', { params: { date_from: strFrom } }),
        api.get('/reports/savings-rate', { params: { date_from: strFrom } }),
      ]);

      setCategoryData(
        (catRes.data.data || []).slice(0, 8).map((c: any, i: number) => ({
          name: c.name.length > 12 ? c.name.slice(0, 12) + '…' : c.name,
          population: parseFloat(c.total) || 0,
          color: c.color || COLORS[i % COLORS.length],
          legendFontColor: '#1e293b',
          legendFontSize: 11,
        }))
      );

      const rawEvo = evoRes.data.data || evoRes.data;
      if (rawEvo?.length > 0) {
        setMonthlyData({
          labels: rawEvo.map((m: any) => m.month || ''),
          datasets: [
            { data: rawEvo.map((m: any) => parseFloat(m.receita) || 0), color: (o=1) => `rgba(16,185,129,${o})`, strokeWidth: 2 },
            { data: rawEvo.map((m: any) => parseFloat(m.despesa) || 0), color: (o=1) => `rgba(239,68,68,${o})`, strokeWidth: 2 },
          ],
          legend: ['Receitas', 'Despesas'],
        });
        setBarData({
          labels: rawEvo.map((m: any) => m.month || ''),
          datasets: [{ data: rawEvo.map((m: any) => parseFloat(m.despesa) || 0) }],
        });
      }

      const rate = parseFloat(saveRes.data.rate || saveRes.data.savings_rate || 0);
      setSavingsRate(Math.max(0, Math.min(100, rate)));
      setSavingsSaved(parseFloat(saveRes.data.saved || 0));
      setSavingsRevenues(parseFloat(saveRes.data.revenues || 0));
      setSavingsExpenses(parseFloat(saveRes.data.expenses || 0));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Gráficos</Text>
          <Text style={s.sub}>Análise financeira avançada</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor="#10b981" colors={['#10b981']} />}
      >
        {/* Período */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 8, paddingRight: 4 }}>
          {PERIODS.map(p => (
            <TouchableOpacity key={p} style={[s.periodBtn, period === p && s.periodBtnA]} onPress={() => setPeriod(p)}>
              <Text style={[s.periodTxt, period === p && s.periodTxtA]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabsWrap} contentContainerStyle={s.tabsContent}>
          {TABS.map(t => (
            <TouchableOpacity key={t} style={[s.tabBtn, tab === t && s.tabBtnA]} onPress={() => setTab(t)}>
              <Text style={[s.tabTxt, tab === t && s.tabTxtA]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading ? (
          <View style={{ padding: 40, alignItems: 'center' }}><ActivityIndicator size="large" color="#10b981" /></View>
        ) : (
          <>
            {/* Savings Card */}
            {tab === 'Visão Geral' && (
              <View style={s.card}>
                <Text style={s.cardTitle}>Taxa de Poupança</Text>
                <View style={s.savingsRow}>
                  <View style={s.savingsCircle}>
                    <Text style={[s.ringPct, { color: savingsRate >= 20 ? '#10b981' : savingsRate >= 10 ? '#f59e0b' : '#ef4444' }]}>{savingsRate.toFixed(1)}%</Text>
                    <Text style={s.ringSub}>poupado</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={s.barBg}>
                      <View style={[s.barFill, { width: `${savingsRate}%` as any, backgroundColor: savingsRate >= 20 ? '#10b981' : savingsRate >= 10 ? '#f59e0b' : '#ef4444' }]} />
                    </View>
                    <Text style={s.savingsAmt}>Economizou R$ {savingsSaved.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                      <View>
                        <Text style={s.savingsFtrLbl}>Receitas</Text>
                        <Text style={[s.savingsFtrVal, { color: '#10b981' }]}>R$ {savingsRevenues.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={s.savingsFtrLbl}>Despesas</Text>
                        <Text style={[s.savingsFtrVal, { color: '#ef4444' }]}>R$ {savingsExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* Line Chart */}
            {tab === 'Visão Geral' && (
              <View style={s.card}>
                <Text style={s.cardTitle}>Receitas vs Despesas</Text>
                <View style={s.legendRow}>
                  <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: '#10b981' }]} /><Text style={s.legendTxt}>Receitas</Text></View>
                  <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: '#ef4444' }]} /><Text style={s.legendTxt}>Despesas</Text></View>
                </View>
                {monthlyData ? (
                  <LineChart
                    data={monthlyData}
                    width={CHART_W}
                    height={200}
                    chartConfig={chartCfg}
                    bezier
                    style={s.chartStyle}
                    withShadow={false}
                  />
                ) : (
                  <View style={s.emptyChart}><Ionicons name="trending-up" size={32} color="#cbd5e1" /><Text style={s.emptyTxt}>Dados insuficientes</Text></View>
                )}
              </View>
            )}

            {/* Bar Chart - Despesas Mensais */}
            {(tab === 'Despesas' || tab === 'Visão Geral') && barData && (
              <View style={s.card}>
                <Text style={s.cardTitle}>{tab === 'Despesas' ? 'Despesas Mensais' : 'Despesas por Mês'}</Text>
                <BarChart
                  data={barData}
                  width={CHART_W}
                  height={200}
                  chartConfig={{ ...chartCfg, color: (o=1) => `rgba(239,68,68,${o})` }}
                  style={s.chartStyle}
                  showValuesOnTopOfBars
                  yAxisLabel="R$"
                  yAxisSuffix=""
                />
              </View>
            )}

            {/* Pie Chart */}
            <View style={s.card}>
              <Text style={s.cardTitle}>{tab === 'Receitas' ? 'Receitas por Categoria' : 'Despesas por Categoria'}</Text>
              {categoryData.length > 0 ? (
                <PieChart
                  data={categoryData}
                  width={CHART_W}
                  height={200}
                  chartConfig={chartCfg}
                  accessor="population"
                  backgroundColor="transparent"
                  paddingLeft="0"
                  absolute
                />
              ) : (
                <View style={s.emptyChart}>
                  <Ionicons name="pie-chart-outline" size={32} color="#cbd5e1" />
                  <Text style={s.emptyTxt}>Nenhum lançamento no período</Text>
                </View>
              )}
            </View>
          </>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', gap: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '800', color: '#0f172a' }, sub: { fontSize: 13, color: '#64748b', marginTop: 2 },
  scroll: { padding: 20, paddingBottom: 40 },
  periodBtn: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  periodBtnA: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  periodTxt: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  periodTxtA: { color: '#fff' },
  tabsWrap: { marginBottom: 20, maxHeight: 48 },
  tabsContent: { gap: 20, borderBottomWidth: 2, borderBottomColor: '#f1f5f9', paddingBottom: 10 },
  tabBtn: { paddingBottom: 10, borderBottomWidth: 2, borderBottomColor: 'transparent', marginBottom: -12 },
  tabBtnA: { borderBottomColor: '#10b981' },
  tabTxt: { fontSize: 15, fontWeight: '600', color: '#94a3b8' },
  tabTxtA: { color: '#10b981' },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 16, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 16 },
  chartStyle: { marginVertical: 4, borderRadius: 12, marginLeft: -16 },
  savingsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  savingsCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  ringPct: { fontSize: 18, fontWeight: '900', lineHeight: 20 },
  ringSub: { fontSize: 10, color: '#94a3b8', fontWeight: '600' },
  barBg: { height: 8, backgroundColor: '#f1f5f9', borderRadius: 4, overflow: 'hidden', marginBottom: 10 },
  barFill: { height: '100%', borderRadius: 4 },
  savingsAmt: { fontSize: 13, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  savingsFtrLbl: { fontSize: 11, color: '#94a3b8', fontWeight: '600', marginBottom: 3 },
  savingsFtrVal: { fontSize: 14, fontWeight: '700' },
  legendRow: { flexDirection: 'row', gap: 16, marginBottom: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendTxt: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  emptyChart: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyTxt: { fontSize: 13, color: '#94a3b8', fontWeight: '500' },
});
