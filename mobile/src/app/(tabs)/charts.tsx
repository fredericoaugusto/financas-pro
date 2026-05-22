import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { PieChart, LineChart, ProgressChart } from 'react-native-chart-kit';
import api from '../../services/api';

const screenWidth = Dimensions.get('window').width - 40; // padding 20 on each side

export default function ChartsScreen() {
  const [loading, setLoading] = useState(true);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any>(null);
  const [savingsRate, setSavingsRate] = useState<number>(0);

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const loadData = async () => {
    try {
      // Pega data para os últimos 6 meses
      const dateFrom = new Date();
      dateFrom.setMonth(dateFrom.getMonth() - 5);
      const strDateFrom = `${dateFrom.getFullYear()}-${String(dateFrom.getMonth()+1).padStart(2,'0')}-01`;

      const [catRes, evoRes, saveRes] = await Promise.all([
        api.get('/reports/by-category', { params: { type: 'despesa', date_from: strDateFrom } }),
        api.get('/reports/monthly-evolution', { params: { date_from: strDateFrom } }),
        api.get('/reports/savings-rate', { params: { date_from: strDateFrom } })
      ]);

      // Formata pie chart
      const rawCat = catRes.data.data || [];
      const formattedCat = rawCat.map((c: any) => ({
        name: c.name,
        population: parseFloat(c.total),
        color: c.color || '#94a3b8',
        legendFontColor: '#1e293b',
        legendFontSize: 12
      }));
      setCategoryData(formattedCat);

      // Formata line chart
      const rawEvo = evoRes.data.data || evoRes.data;
      if (rawEvo && rawEvo.length > 0) {
        setMonthlyData({
          labels: rawEvo.map((m: any) => m.month),
          datasets: [
            { data: rawEvo.map((m: any) => parseFloat(m.despesa) || 0), color: (o=1) => `rgba(239, 68, 68, ${o})`, strokeWidth: 2 }, // Vermelho
            { data: rawEvo.map((m: any) => parseFloat(m.receita) || 0), color: (o=1) => `rgba(16, 185, 129, ${o})`, strokeWidth: 2 }  // Verde
          ],
          legend: ['Despesas', 'Receitas']
        });
      }

      setSavingsRate(parseFloat(saveRes.data.rate || saveRes.data.savings_rate || 0) / 100);

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color="#10b981" /></View>;

  const chartConfig = {
    backgroundGradientFrom: '#fff',
    backgroundGradientTo: '#fff',
    color: (opacity = 1) => `rgba(15, 23, 42, ${opacity})`,
    strokeWidth: 2,
    useShadowColorFromDataset: false,
    decimalPlaces: 0,
  };

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Text style={s.title}>Gráficos</Text>
        <Text style={s.sub}>Análise visual de suas finanças</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        
        {/* Taxa de Poupança */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Taxa de Poupança (Últimos 6 meses)</Text>
          <View style={s.progressRow}>
            <ProgressChart
              data={{ labels: ["Poupança"], data: [savingsRate > 1 ? 1 : (savingsRate < 0 ? 0 : savingsRate)] }}
              width={140} height={140} strokeWidth={16} radius={48}
              chartConfig={{...chartConfig, color: (o=1)=>`rgba(16, 185, 129, ${o})`}}
              hideLegend={true}
            />
            <View style={s.progressInfo}>
              <Text style={s.progressVal}>{(savingsRate * 100).toFixed(1)}%</Text>
              <Text style={s.progressDesc}>da sua renda foi poupada neste período.</Text>
            </View>
          </View>
        </View>

        {/* Evolução Mensal */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Evolução (Receitas vs Despesas)</Text>
          {monthlyData ? (
            <LineChart
              data={monthlyData}
              width={screenWidth - 8}
              height={220}
              chartConfig={chartConfig}
              bezier
              style={{ marginVertical: 8, borderRadius: 16, marginLeft: -16 }}
            />
          ) : <Text style={s.emptyTxt}>Dados insuficientes.</Text>}
        </View>

        {/* Despesas por Categoria */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Despesas por Categoria</Text>
          {categoryData.length > 0 ? (
            <PieChart
              data={categoryData}
              width={screenWidth}
              height={200}
              chartConfig={chartConfig}
              accessor={"population"}
              backgroundColor={"transparent"}
              paddingLeft={"0"}
              absolute
            />
          ) : <Text style={s.emptyTxt}>Nenhuma despesa no período.</Text>}
        </View>

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
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 16, overflow: 'hidden' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 16 },
  emptyTxt: { fontSize: 14, color: '#94a3b8', textAlign: 'center', marginVertical: 20 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  progressInfo: { flex: 1 },
  progressVal: { fontSize: 28, fontWeight: '800', color: '#10b981' },
  progressDesc: { fontSize: 13, color: '#64748b', marginTop: 4, lineHeight: 18 },
});
