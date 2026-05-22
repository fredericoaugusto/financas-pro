import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import api from '../services/api';

type InsightSeverity = 'good' | 'warning' | 'danger' | 'info';

interface InsightItem {
  type: InsightSeverity;
  icon: any;
  title: string;
  description?: string;
  bg: string;
  color: string;
}

const SEVERITY_STYLES: Record<InsightSeverity, { bg: string; color: string; icon: any }> = {
  good:    { bg: '#dcfce7', color: '#10b981', icon: 'checkmark-circle' },
  warning: { bg: '#fef3c7', color: '#f59e0b', icon: 'warning' },
  danger:  { bg: '#fee2e2', color: '#ef4444', icon: 'alert-circle' },
  info:    { bg: '#e0e7ff', color: '#6366f1', icon: 'information-circle' },
};

const TIPS = [
  { icon: 'bulb-outline' as const, color: '#f59e0b', bg: '#fef3c7', text: 'Registre todas as despesas, mesmo as pequenas. Elas fazem grande diferença no fim do mês.' },
  { icon: 'trending-up-outline' as const, color: '#10b981', bg: '#dcfce7', text: 'Tente poupar pelo menos 10% da sua renda mensal para criar uma reserva de emergência.' },
  { icon: 'card-outline' as const, color: '#3b82f6', bg: '#dbeafe', text: 'Pague a fatura do cartão de crédito integralmente para evitar juros altos.' },
  { icon: 'pie-chart-outline' as const, color: '#8b5cf6', bg: '#ede9fe', text: 'Use orçamentos por categoria para identificar onde você mais gasta.' },
];

function ScoreRing({ score }: { score: number }) {
  const animVal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animVal, {
      toValue: score,
      duration: 1200,
      useNativeDriver: false,
    }).start();
  }, [score]);

  let color = '#ef4444';
  let label = 'Atenção';
  if (score >= 70) { color = '#10b981'; label = 'Ótimo'; }
  else if (score >= 40) { color = '#f59e0b'; label = 'Regular'; }

  return (
    <View style={sr.wrap}>
      <View style={[sr.ring, { borderColor: '#f1f5f9' }]}>
        <View style={[sr.ringFill, { borderColor: color }]}>
          <Text style={[sr.scoreNum, { color }]}>{score}</Text>
          <Text style={sr.scoreOf}>/100</Text>
        </View>
      </View>
      <Text style={[sr.scoreLabel, { color }]}>{label}</Text>
    </View>
  );
}

const sr = StyleSheet.create({
  wrap: { alignItems: 'center' },
  ring: {
    width: 100, height: 100, borderRadius: 50,
    borderWidth: 6, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  ringFill: {
    width: 88, height: 88, borderRadius: 44,
    borderWidth: 6, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#fff',
  },
  scoreNum: { fontSize: 28, fontWeight: '900', lineHeight: 30 },
  scoreOf: { fontSize: 10, color: '#94a3b8', fontWeight: '700', lineHeight: 12 },
  scoreLabel: { fontSize: 13, fontWeight: '700', marginTop: 8 },
});

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

  const insightItems: InsightItem[] = [
    ...(insights?.anomalies || []).map((item: any) => ({
      type: 'danger' as InsightSeverity,
      title: item.title || item.message || 'Alerta de gasto',
      description: item.description,
      ...SEVERITY_STYLES.danger,
    })),
    ...(insights?.trends || []).map((item: any) => ({
      type: 'warning' as InsightSeverity,
      title: item.category || item.name || 'Tendência detectada',
      description: item.description || 'Gastos em alta nesta categoria',
      ...SEVERITY_STYLES.warning,
    })),
    ...(insights?.suggestions || []).map((item: any) => ({
      type: 'info' as InsightSeverity,
      title: item.title || item.message || 'Sugestão',
      description: item.description,
      ...SEVERITY_STYLES.info,
    })),
  ];

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

        {/* Card de saúde financeira */}
        <View style={s.healthCard}>
          <ScoreRing score={score} />
          <View style={s.healthInfo}>
            <Text style={s.healthTitle}>Saúde Financeira</Text>
            <Text style={s.healthDesc}>Baseada nos seus registros do último mês. Continue lançando para dados mais precisos.</Text>
            <View style={s.scoreBreakdown}>
              <View style={s.scorePill}>
                <View style={[s.scoreDot, { backgroundColor: '#10b981' }]} />
                <Text style={s.scorePillTxt}>70–100 Ótimo</Text>
              </View>
              <View style={s.scorePill}>
                <View style={[s.scoreDot, { backgroundColor: '#f59e0b' }]} />
                <Text style={s.scorePillTxt}>40–69 Regular</Text>
              </View>
              <View style={s.scorePill}>
                <View style={[s.scoreDot, { backgroundColor: '#ef4444' }]} />
                <Text style={s.scorePillTxt}>0–39 Atenção</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Alertas e insights */}
        {insightItems.length > 0 && (
          <View style={s.section}>
            <Text style={s.secTitle}>Alertas e Recomendações</Text>
            {insightItems.map((item, i) => (
              <View key={i} style={s.insightBox}>
                <View style={[s.insightIcon, { backgroundColor: item.bg }]}>
                  <Ionicons name={item.icon} size={20} color={item.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.insightTitle}>{item.title}</Text>
                  {item.description && <Text style={s.insightSub}>{item.description}</Text>}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Dicas financeiras */}
        <View style={s.section}>
          <Text style={s.secTitle}>Dicas Financeiras</Text>
          {TIPS.map((tip, i) => (
            <View key={i} style={s.tipBox}>
              <View style={[s.tipIcon, { backgroundColor: tip.bg }]}>
                <Ionicons name={tip.icon} size={18} color={tip.color} />
              </View>
              <Text style={s.tipTxt}>{tip.text}</Text>
            </View>
          ))}
        </View>

        {/* CTA para registrar mais */}
        {insightItems.length === 0 && (
          <View style={s.ctaCard}>
            <Ionicons name="analytics-outline" size={40} color="#10b981" />
            <Text style={s.ctaTitle}>Registre mais transações</Text>
            <Text style={s.ctaSub}>Com mais dados, geraremos insights automáticos sobre seus padrões financeiros.</Text>
            <TouchableOpacity style={s.ctaBtn} onPress={() => router.push('/new-transaction')}>
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={s.ctaBtnTxt}>Adicionar Lançamento</Text>
            </TouchableOpacity>
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
  header: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9', gap: 12,
  },
  backBtn: { width: 44, height: 44, borderRadius: 13, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  sub: { fontSize: 13, color: '#64748b', marginTop: 2 },
  scroll: { padding: 20 },
  healthCard: {
    flexDirection: 'row', alignItems: 'center', gap: 20,
    backgroundColor: '#fff', borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  healthInfo: { flex: 1 },
  healthTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 6 },
  healthDesc: { fontSize: 13, color: '#64748b', lineHeight: 18, marginBottom: 10 },
  scoreBreakdown: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  scorePill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f8fafc', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  scoreDot: { width: 6, height: 6, borderRadius: 3 },
  scorePillTxt: { fontSize: 10, fontWeight: '600', color: '#64748b' },
  section: { marginBottom: 16 },
  secTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginBottom: 12 },
  insightBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 14,
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    marginBottom: 8, borderWidth: 1, borderColor: '#f1f5f9',
  },
  insightIcon: { width: 42, height: 42, borderRadius: 13, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  insightTitle: { fontSize: 14, fontWeight: '700', color: '#1e293b', marginBottom: 2 },
  insightSub: { fontSize: 13, color: '#64748b', lineHeight: 18 },
  tipBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f8fafc',
  },
  tipIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  tipTxt: { flex: 1, fontSize: 13, color: '#475569', lineHeight: 20 },
  ctaCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 28,
    alignItems: 'center', gap: 8,
    borderWidth: 2, borderColor: '#dcfce7', borderStyle: 'dashed',
  },
  ctaTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a', textAlign: 'center' },
  ctaSub: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 20 },
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#10b981', paddingHorizontal: 24, paddingVertical: 14,
    borderRadius: 14, marginTop: 8,
  },
  ctaBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
