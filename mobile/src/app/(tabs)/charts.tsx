import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Dimensions, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { PieChart, LineChart, BarChart } from 'react-native-chart-kit';
import api from '../../services/api';

const { width: SW } = Dimensions.get('window');
const CHART_W = SW - 48;
const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

const chartCfg = {
  backgroundGradientFrom: '#fff',
  backgroundGradientTo: '#fff',
  color: (opacity = 1) => `rgba(15, 23, 42, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
  strokeWidth: 2,
  decimalPlaces: 0,
  propsForDots: { r: '4', strokeWidth: '2', stroke: '#10b981' },
};

export default function ChartsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any>(null);
  const [barData, setBarData] = useState<any>(null);
  const [savingsRate, setSavingsRate] = useState(0);
  const [savingsSaved, setSavingsSaved] = useState(0);

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const dateFrom = new Date();
      dateFrom.setMonth(dateFrom.getMonth() - 5);
      const strFrom = `${dateFrom.getFullYear()}-${String(dateFrom.getMonth()+1).padStart(2,'0')}-01`;

      const [catRes, evoRes, saveRes] = await Promise.all([
        api.get('/reports/by-category', { params: { type: 'despesa', date_from: strFrom } }),
        api.get('/reports/monthly-evolution', { params: { date_from: strFrom } }),
        api.get('/reports/savings-rate', { params: { date_from: strFrom } }),
      ]);

      // Pie chart data
      const rawCat = catRes.data.data || [];
      const COLORS = ['#10b981','#3b82f6','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#ec4899'];
      setCategoryData(
        rawCat.slice(0, 8).map((c: any, i: number) => ({
          name: c.name.length > 12 ? c.name.slice(0, 12) + '…' : c.name,
          population: parseFloat(c.total) || 0,
          color: c.color || COLORS[i % COLORS.length],
          legendFontColor: '#1e293b',
          legendFontSize: 11,
        }))
      );

      // Line chart
      const rawEvo = evoRes.data.data || evoRes.data;
      if (rawEvo?.length > 0) {
        const labels = rawEvo.map((m: any) => m.month || '');
        setMonthlyData({
          labels,
          datasets: [
            { data: rawEvo.map((m: any) => parseFloat(m.receita) || 0), color: (o=1) => `rgba(16,185,129,${o})`, strokeWidth: 2 },
            { data: rawEvo.map((m: any) => parseFloat(m.despesa) || 0), color: (o=1) => `rgba(239,68,68,${o})`, strokeWidth: 2 },
          ],
          legend: ['Receitas', 'Despesas'],
        });
        // Bar chart using same data
        setBarData({
          labels,
          datasets: [{ data: rawEvo.map((m: any) => parseFloat(m.despesa) || 0) }],
        });
      }

      const rate = parseFloat(saveRes.data.rate || saveRes.data.savings_rate || 0);
      const saved = parseFloat(saveRes.data.saved || 0);
      setSavingsRate(rate < 0 ? 0 : rate > 100 ? 100 : rate);
      setSavingsSaved(saved);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color="#10b981" /></View>;

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Text style={s.title}>Gráficos</Text>
        <Text style={s.sub}>Análise visual de suas finanças</Text>
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor="#10b981" colors={['#10b981']} />}
      >
        {/* Taxa de Poupança */}
        <View style={s.card}>
          <Text style={s.cardTitle}>💰 Taxa de Poupança</Text>
          <Text style={s.cardSub}>Últimos 6 meses</Text>
          <View style={s.savingsRow}>
            <View style={s.savingsRing}>
              <Text style={[s.ringPct, { color: savingsRate >= 20 ? '#10b981' : savingsRate >= 10 ? '#f59e0b' : '#ef4444' }]}>
                {savingsRate.toFixed(1)}%
              </Text>
              <Text style={s.ringSub}>poupado</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={s.barBg}>
                <View style={[s.barFill, { width: `${savingsRate}%` as any, backgroundColor: savingsRate >= 20 ? '#10b981' : savingsRate >= 10 ? '#f59e0b' : '#ef4444' }]} />
              </View>
              <Text style={s.savingsSaved}>
                Economizou R$ {savingsSaved.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </Text>
              <Text style={s.savingsTip}>
                {savingsRate >= 20 ? '🎯 Excelente! Acima de 20%' : savingsRate >= 10 ? '👍 Bom! Tente chegar a 20%' : '⚠️ Tente poupar pelo menos 10%'}
              </Text>
            </View>
          </View>
        </View>

        {/* Evolução Mensal */}
        <View style={s.card}>
          <Text style={s.cardTitle}>📈 Receitas vs Despesas</Text>
          <Text style={s.cardSub}>Evolução dos últimos 6 meses</Text>
          {monthlyData ? (
            <>
              <View style={s.legendRow}>
                <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: '#10b981' }]} /><Text style={s.legendTxt}>Receitas</Text></View>
                <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: '#ef4444' }]} /><Text style={s.legendTxt}>Despesas</Text></View>
              </View>
              <LineChart
                data={monthlyData}
                width={CHART_W}
                height={200}
                chartConfig={chartCfg}
                bezier
                style={s.chartStyle}
                withDots={true}
                withShadow={false}
              />
            </>
          ) : (
            <View style={s.emptyChart}><Ionicons name="trending-up-outline" size={36} color="#cbd5e1" /><Text style={s.emptyTxt}>Dados insuficientes</Text></View>
          )}
        </View>

        {/* Despesas por Categoria */}
        <View style={s.card}>
          <Text style={s.cardTitle}>🍰 Despesas por Categoria</Text>
          <Text style={s.cardSub}>Distribuição no período</Text>
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
            <View style={s.emptyChart}><Ionicons name="pie-chart-outline" size={36} color="#cbd5e1" /><Text style={s.emptyTxt}>Nenhuma despesa no período</Text></View>
          )}
        </View>

        {/* Despesas Mensais (Bar) */}
        {barData && (
          <View style={s.card}>
            <Text style={s.cardTitle}>📊 Despesas por Mês</Text>
            <Text style={s.cardSub}>Comparativo mensal</Text>
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

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#fff', paddingTop: 56, paddingHorizontal: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  title: { fontSize: 24, fontWeight: '800', color: '#0f172a' },
  sub: { fontSize: 14, color: '#64748b', marginTop: 2 },
  scroll: { padding: 20 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 16, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 2 },
  cardSub: { fontSize: 12, color: '#94a3b8', fontWeight: '500', marginBottom: 16 },
  chartStyle: { marginVertical: 4, borderRadius: 12, marginLeft: -16 },
  savingsRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  savingsRing: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  ringPct: { fontSize: 20, fontWeight: '900', lineHeight: 22 },
  ringSub: { fontSize: 10, color: '#94a3b8', fontWeight: '600' },
  barBg: { height: 8, backgroundColor: '#f1f5f9', borderRadius: 4, overflow: 'hidden', marginBottom: 10 },
  barFill: { height: '100%', borderRadius: 4 },
  savingsSaved: { fontSize: 13, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  savingsTip: { fontSize: 12, color: '#64748b' },
  legendRow: { flexDirection: 'row', gap: 16, marginBottom: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendTxt: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  emptyChart: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyTxt: { fontSize: 13, color: '#94a3b8', fontWeight: '500' },
});
