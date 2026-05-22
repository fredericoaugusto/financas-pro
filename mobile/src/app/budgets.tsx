import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import api from '../services/api';
import { toast } from '../components/Toast';
import EmptyState from '../components/EmptyState';

export default function BudgetsScreen() {
  const router = useRouter();
  const [budgets, setBudgets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [budgetType, setBudgetType] = useState<'geral'|'categoria'>('categoria');
  const [name, setName] = useState('');
  const [period, setPeriod] = useState<'monthly'|'annual'>('monthly');
  
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);

  useFocusEffect(useCallback(() => { load(); }, []));

  const handleAmountChange = (text: string) => {
    const digits = text.replace(/\D/g, '');
    if (!digits) { setAmount(''); return; }
    const value = (parseInt(digits, 10) / 100).toFixed(2);
    setAmount(value.replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.'));
  };

  const load = async () => {
    try {
      const [budRes, catRes] = await Promise.all([
        api.get('/budgets/summary'),
        api.get('/categories')
      ]);
      setBudgets(budRes.data.data || budRes.data);
      setCategories(catRes.data.data || catRes.data);
    } catch { toast({ type: 'error', title: 'Erro' }); }
    finally { setLoading(false); }
  };

  const saveForm = async () => {
    if (!amount || (budgetType === 'categoria' && !categoryId)) {
      return toast({ type: 'warning', title: 'Preencha os campos obrigatórios' });
    }
    setSaving(true);
    try {
      const payload: any = {
        amount: parseFloat(amount.replace(/\./g, '').replace(',', '.')) || 0,
        period: budgetType === 'geral' ? period : 'monthly',
      };
      
      if (budgetType === 'categoria') {
        payload.category_id = categoryId;
      } else {
        payload.name = name || 'Orçamento Geral';
      }

      await api.post('/budgets', payload);
      toast({ type: 'success', title: 'Orçamento salvo!' });
      setShowForm(false);
      load();
    } catch { toast({ type: 'error', title: 'Erro ao salvar' }); }
    finally { setSaving(false); }
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color="#10b981" /></View>;

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}><Ionicons name="arrow-back" size={22} color="#0f172a" /></TouchableOpacity>
        <View style={{ flex: 1 }}><Text style={s.title}>Orçamentos</Text><Text style={s.sub}>Controle seus limites</Text></View>
        <TouchableOpacity style={s.addBtn} onPress={() => setShowForm(!showForm)}><Ionicons name={showForm ? "close" : "add"} size={20} color="#fff" /></TouchableOpacity>
      </View>

      {showForm && (
        <View style={s.formCard}>
          <Text style={s.formTitle}>Novo Orçamento</Text>
          
          <View style={s.typeRow}>
            <TouchableOpacity style={[s.typeBtn, budgetType === 'categoria' && s.typeBtnA]} onPress={() => setBudgetType('categoria')}>
              <Text style={[s.typeTxt, budgetType === 'categoria' && s.typeTxtA]}>Por Categoria</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.typeBtn, budgetType === 'geral' && s.typeBtnA]} onPress={() => setBudgetType('geral')}>
              <Text style={[s.typeTxt, budgetType === 'geral' && s.typeTxtA]}>Geral</Text>
            </TouchableOpacity>
          </View>

          {budgetType === 'categoria' ? (
            <View style={s.catList}>
              <Text style={s.label}>Selecione a Categoria *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {categories.map(c => (
                  <TouchableOpacity key={c.id} onPress={() => setCategoryId(c.id)} style={[s.pill, categoryId === c.id && s.pillActive]}>
                    <Text style={[s.pillTxt, categoryId === c.id && { color: '#fff' }]}>{c.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              <TextInput style={s.input} placeholder="Nome (opcional)" value={name} onChangeText={setName} />
              
              <Text style={s.label}>Periodicidade *</Text>
              <View style={s.typeRow}>
                <TouchableOpacity style={[s.typeBtn, period === 'monthly' && s.typeBtnA]} onPress={() => setPeriod('monthly')}>
                  <Text style={[s.typeTxt, period === 'monthly' && s.typeTxtA]}>Mensal</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.typeBtn, period === 'annual' && s.typeBtnA]} onPress={() => setPeriod('annual')}>
                  <Text style={[s.typeTxt, period === 'annual' && s.typeTxtA]}>Anual</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={s.moneyWrap}>
            <Text style={s.moneyPrefix}>R$</Text>
            <TextInput style={s.moneyInput} placeholder="0,00" value={amount} onChangeText={handleAmountChange} keyboardType="numeric" />
          </View>
          
          <View style={s.formActions}>
            <TouchableOpacity style={s.cancelBtn} onPress={() => setShowForm(false)}><Text style={s.cancelTxt}>Cancelar</Text></TouchableOpacity>
            <TouchableOpacity style={s.saveBtn} onPress={saveForm}><Text style={s.saveTxt}>{saving ? 'Salvando...' : 'Criar'}</Text></TouchableOpacity>
          </View>
        </View>
      )}

      <FlatList
        data={budgets}
        keyExtractor={item => item.id?.toString()}
        contentContainerStyle={s.list}
        renderItem={({ item }) => {
          const used = parseFloat(item.spent || 0);
          const limit = parseFloat(item.amount || 0);
          const pct = limit > 0 ? (used / limit) * 100 : 0;
          const isWarning = pct >= 80;
          const barColor = isWarning ? '#ef4444' : '#10b981';

          return (
            <View style={s.card}>
              <View style={s.cardHdr}>
                <Text style={s.catName}>{item.category?.name || 'Geral'}</Text>
                <Text style={s.pctTxt}>{pct.toFixed(0)}%</Text>
              </View>
              <View style={s.barBg}>
                <View style={[s.barFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: barColor }]} />
              </View>
              <View style={s.cardFtr}>
                <Text style={s.usedTxt}>Usado: R$ {used.toFixed(2)}</Text>
                <Text style={s.limitTxt}>Limite: R$ {limit.toFixed(2)}</Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={<EmptyState icon="pie-chart-outline" title="Nenhum orçamento" subtitle="Defina limites de gastos por categoria." actionLabel="Criar Orçamento" onAction={() => setShowForm(true)} />}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' }, center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', gap: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '800', color: '#0f172a' }, sub: { fontSize: 13, color: '#64748b', marginTop: 2 },
  addBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#10b981', justifyContent: 'center', alignItems: 'center' },
  formCard: { backgroundColor: '#fff', margin: 20, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#f1f5f9', maxHeight: '80%' },
  formTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 8 },
  label: { fontSize: 13, fontWeight: '600', color: '#64748b', marginLeft: 4, marginBottom: -6, zIndex: 1, marginTop: 4 },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  typeBtn: { flex: 1, height: 44, borderRadius: 12, borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  typeBtnA: { borderColor: '#10b981', backgroundColor: '#f0fdf4' },
  typeTxt: { fontSize: 13, fontWeight: '600', color: '#64748b' }, typeTxtA: { color: '#10b981' },
  catList: { marginBottom: 4 }, pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: '#f1f5f9', marginRight: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  pillActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' }, pillTxt: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  input: { borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12, backgroundColor: '#f8fafc', paddingHorizontal: 16, height: 48, fontSize: 15, color: '#0f172a' },
  moneyWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12, backgroundColor: '#f8fafc', paddingHorizontal: 16, height: 48, marginTop: 8 },
  moneyPrefix: { fontSize: 15, color: '#64748b', marginRight: 8, fontWeight: '600' },
  moneyInput: { flex: 1, fontSize: 15, color: '#0f172a' },
  formActions: { flexDirection: 'row', gap: 12, marginTop: 12 },
  cancelBtn: { flex: 1, height: 48, borderRadius: 12, borderWidth: 1.5, borderColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center' }, cancelTxt: { fontSize: 15, fontWeight: '600', color: '#64748b' },
  saveBtn: { flex: 1, height: 48, borderRadius: 12, backgroundColor: '#10b981', justifyContent: 'center', alignItems: 'center' }, saveTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
  list: { padding: 20, paddingBottom: 100 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 8, elevation: 1 },
  cardHdr: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  catName: { fontSize: 16, fontWeight: '700', color: '#0f172a' }, pctTxt: { fontSize: 14, fontWeight: '800', color: '#64748b' },
  barBg: { height: 8, backgroundColor: '#f1f5f9', borderRadius: 4, overflow: 'hidden', marginBottom: 12 }, barFill: { height: '100%', borderRadius: 4 },
  cardFtr: { flexDirection: 'row', justifyContent: 'space-between' }, usedTxt: { fontSize: 13, color: '#64748b', fontWeight: '500' }, limitTxt: { fontSize: 13, color: '#0f172a', fontWeight: '700' }
});
