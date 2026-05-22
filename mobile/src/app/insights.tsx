import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import api from '../services/api';

export default function InsightsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<any>(null);

  useFocusEffect(useCallback(() => { load(); }, []));

  const load = async () => {
    try {
      const res = await api.get('/insights/summary');
      setInsights(res.data.data || res.data);
    } catch {
      // Tratar silenciosamente
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color="#10b981" /></View>;

  const score = insights?.score?.total_score || 0;
  let scoreColor = '#ef4444';
  if (score >= 70) scoreColor = '#10b981';
  else if (score >= 40) scoreColor = '#f59e0b';

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Insights</Text>
          <Text style={s.sub}>Inteligência financeira</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        
        {/* Score de Saúde */}
        <View style={s.scoreCard}>
          <View style={s.scoreCircle}>
            <Text style={[s.scoreTxt, { color: scoreColor }]}>{score}</Text>
            <Text style={s.scoreLabel}>/100</Text>
          </View>
          <View style={s.scoreInfo}>
            <Text style={s.scoreTitle}>Sua saúde financeira</Text>
            <Text style={s.scoreDesc}>Baseado no seu histórico de uso do último mês.</Text>
          </View>
        </View>

        {/* Dicas / Insights */}
        {insights?.anomalies?.length > 0 && (
          <View style={s.section}>
            <Text style={s.secTitle}>Anomalias Detectadas</Text>
            {insights.anomalies.map((item: any, i: number) => (
              <View key={i} style={s.insightBox}>
                <View style={[s.insightIcon, { backgroundColor: '#fee2e2' }]}><Ionicons name="warning" size={18} color="#ef4444" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.insightTitle}>{item.title || item.message || 'Alerta de gasto'}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {insights?.trends?.length > 0 && (
          <View style={s.section}>
            <Text style={s.secTitle}>Tendências de Gasto</Text>
            {insights.trends.map((item: any, i: number) => (
              <View key={i} style={s.insightBox}>
                <View style={[s.insightIcon, { backgroundColor: '#e0e7ff' }]}><Ionicons name="trending-up" size={18} color="#4f46e5" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.insightTitle}>{item.category || item.name}</Text>
                  <Text style={s.insightSub}>{item.description || 'Gastos subindo'}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {!insights?.anomalies?.length && !insights?.trends?.length && (
           <View style={s.emptyBox}>
              <Ionicons name="bulb-outline" size={40} color="#cbd5e1" />
              <Text style={s.emptyTxt}>Continue usando o app para gerarmos insights automáticos.</Text>
           </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', gap: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  sub: { fontSize: 13, color: '#64748b', marginTop: 2 },
  scroll: { padding: 20 },
  scoreCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 20, gap: 20 },
  scoreCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#f8fafc', borderWidth: 4, borderColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  scoreTxt: { fontSize: 28, fontWeight: '900' },
  scoreLabel: { fontSize: 10, color: '#94a3b8', fontWeight: '700', marginTop: -4 },
  scoreInfo: { flex: 1 },
  scoreTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  scoreDesc: { fontSize: 13, color: '#64748b', lineHeight: 18 },
  section: { marginBottom: 24 },
  secTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginBottom: 12 },
  insightBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#f1f5f9', gap: 16 },
  insightIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  insightTitle: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  insightSub: { fontSize: 13, color: '#64748b', marginTop: 2 },
  emptyBox: { alignItems: 'center', padding: 40, gap: 12 },
  emptyTxt: { fontSize: 14, color: '#94a3b8', textAlign: 'center', lineHeight: 20 },
});
