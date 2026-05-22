import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import api from '../services/api';
import { toast } from '../components/Toast';

export default function ChartsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [period, setPeriod] = useState('Este Mês');
  const [tab, setTab] = useState('Visão Geral');
  const PERIODS = ['Este Mês', 'Últimos 30 dias', 'Este Ano'];
  const TABS = ['Visão Geral', 'Despesas', 'Receitas', 'Crédito', 'Planejamento'];

  // Dados mockados ou da API
  const [savingsRate, setSavingsRate] = useState({ rate: 0, saved: 0, revenues: 0, expenses: 0 });

  useFocusEffect(useCallback(() => { loadData(); }, [period]));

  const loadData = async () => {
    setLoading(true);
    try {
      // Exemplo: Buscar taxa de poupança real
      const res = await api.get('/reports/savings-rate');
      if (res.data) setSavingsRate(res.data);
    } catch {
      // Ignora erro se rota não existir no momento
    } finally {
      setLoading(false);
    }
  };

  const EmptyChart = ({ title, icon }: { title: string, icon: any }) => (
    <View style={s.chartBox}>
      <Text style={s.chartTitle}>{title}</Text>
      <View style={s.emptyContent}>
        <Ionicons name={icon} size={32} color="#cbd5e1" />
        <Text style={s.emptyTxt}>Nenhum lançamento no período selecionado</Text>
        <Text style={s.emptySub}>Registre transações para visualizar.</Text>
      </View>
    </View>
  );

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}><Ionicons name="arrow-back" size={22} color="#0f172a" /></TouchableOpacity>
        <View style={{ flex: 1 }}><Text style={s.title}>Gráficos</Text><Text style={s.sub}>Análise financeira avançada</Text></View>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        
        {/* Período Pills */}
        <View style={s.periodRow}>
          {PERIODS.map(p => (
            <TouchableOpacity key={p} style={[s.periodBtn, period === p && s.periodBtnA]} onPress={() => setPeriod(p)}>
              <Text style={[s.periodTxt, period === p && s.periodTxtA]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Dropdowns (Visuais simulados) */}
        <TouchableOpacity style={s.selectBox}>
          <Text style={s.selectTxt}>Todas as contas</Text>
          <Ionicons name="chevron-down" size={16} color="#94a3b8" />
        </TouchableOpacity>
        <TouchableOpacity style={s.selectBox}>
          <Text style={s.selectTxt}>Todas as categorias</Text>
          <Ionicons name="chevron-down" size={16} color="#94a3b8" />
        </TouchableOpacity>
        <TouchableOpacity style={s.selectBox}>
          <Ionicons name="calendar-outline" size={16} color="#94a3b8" style={{marginRight: 8}} />
          <Text style={s.selectTxt}>01/05/2026 - 31/05/2026</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.advFilters}>
          <Text style={s.advFiltersTxt}>Filtros avançados</Text>
          <Ionicons name="chevron-down" size={14} color="#10b981" />
        </TouchableOpacity>

        {/* Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabsWrap} contentContainerStyle={s.tabsContent}>
          {TABS.map(t => (
            <TouchableOpacity key={t} style={[s.tabBtn, tab === t && s.tabBtnA]} onPress={() => setTab(t)}>
              <Text style={[s.tabTxt, tab === t && s.tabTxtA]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading ? <View style={{padding: 40, alignItems: 'center'}}><ActivityIndicator size="large" color="#10b981"/></View> : (
          <View style={s.dashboard}>
            
            {/* Taxa de Poupança (Visão Geral) */}
            {tab === 'Visão Geral' && (
              <View style={s.savingsCard}>
                <Text style={s.savingsTitle}>Taxa de Poupança</Text>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginVertical: 8 }}>
                  <Text style={s.savingsRate}>{savingsRate.rate.toFixed(1)}%</Text>
                  <Text style={s.savingsSaved}>Economizou R$ {savingsRate.saved.toFixed(2)}</Text>
                </View>
                
                <View style={s.barBg}>
                  <View style={[s.barFill, { width: `${Math.min(savingsRate.rate, 100)}%` }]} />
                </View>
                
                <View style={s.savingsFtr}>
                  <View>
                    <Text style={s.savingsFtrLbl}>Receitas</Text>
                    <Text style={[s.savingsFtrVal, { color: '#10b981' }]}>R$ {savingsRate.revenues.toFixed(2)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={s.savingsFtrLbl}>Despesas</Text>
                    <Text style={[s.savingsFtrVal, { color: '#ef4444' }]}>R$ {savingsRate.expenses.toFixed(2)}</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Empty Charts */}
            <EmptyChart title="Evolução do Saldo (Acumulado)" icon="trending-up" />
            <EmptyChart title="Receitas vs Despesas" icon="bar-chart-outline" />
            
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}><EmptyChart title="Despesas por Categoria" icon="pie-chart-outline" /></View>
              <View style={{ flex: 1 }}><EmptyChart title="Fixas vs Variáveis" icon="pie-chart-outline" /></View>
            </View>

          </View>
        )}

      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', gap: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '800', color: '#0f172a' }, sub: { fontSize: 13, color: '#64748b', marginTop: 2 },
  scroll: { padding: 20, paddingBottom: 100 },
  
  periodRow: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 12, padding: 4, marginBottom: 16 },
  periodBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  periodBtnA: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  periodTxt: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  periodTxtA: { color: '#10b981' },

  selectBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 16, height: 48, marginBottom: 12 },
  selectTxt: { flex: 1, fontSize: 14, color: '#334155' },

  advFilters: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginBottom: 20 },
  advFiltersTxt: { fontSize: 14, fontWeight: '600', color: '#10b981' },

  tabsWrap: { marginBottom: 20, maxHeight: 40 },
  tabsContent: { gap: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingBottom: 8 },
  tabBtn: { paddingBottom: 8, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabBtnA: { borderBottomColor: '#10b981' },
  tabTxt: { fontSize: 15, fontWeight: '600', color: '#64748b' },
  tabTxtA: { color: '#10b981' },

  dashboard: { gap: 16 },

  savingsCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#f1f5f9' },
  savingsTitle: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  savingsRate: { fontSize: 32, fontWeight: '800', color: '#0f172a' },
  savingsSaved: { fontSize: 13, color: '#94a3b8', fontWeight: '500' },
  barBg: { height: 8, backgroundColor: '#f1f5f9', borderRadius: 4, marginVertical: 12, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: '#10b981', borderRadius: 4 },
  savingsFtr: { flexDirection: 'row', justifyContent: 'space-between' },
  savingsFtrLbl: { fontSize: 12, color: '#94a3b8', fontWeight: '600', marginBottom: 4 },
  savingsFtrVal: { fontSize: 15, fontWeight: '700' },

  chartBox: { backgroundColor: '#fff', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#f1f5f9', minHeight: 200 },
  chartTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 16 },
  emptyContent: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  emptyTxt: { fontSize: 13, color: '#64748b', fontWeight: '600', textAlign: 'center' },
  emptySub: { fontSize: 12, color: '#94a3b8', textAlign: 'center' },
});
