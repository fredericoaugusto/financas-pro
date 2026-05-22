import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, TextInput, Alert, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import api from '../services/api';
import { toast } from '../components/Toast';
import EmptyState from '../components/EmptyState';

export default function AccountsScreen() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState('corrente'); 
  const [balance, setBalance] = useState('');
  const [bank, setBank] = useState('');
  const [color, setColor] = useState('#22c55e');
  const [notes, setNotes] = useState('');
  const [excludeFromTotals, setExcludeFromTotals] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showBankList, setShowBankList] = useState(false);

  const COLORS = ['#22c55e', '#16a34a', '#15803d', '#3b82f6', '#2563eb', '#1d4ed8', '#8b5cf6', '#7c3aed', '#6d28d9', '#f97316', '#ea580c', '#c2410c', '#ef4444', '#dc2626', '#b91c1c', '#64748b', '#475569', '#334155'];
  const BANKS = ['Nubank', 'Itaú', 'Bradesco', 'Santander', 'Banco do Brasil', 'Caixa Econômica', 'Inter', 'C6 Bank', 'PicPay', 'Mercado Pago', 'Original', 'Next', 'Neon'];

  useFocusEffect(useCallback(() => { fetchAccounts(); }, []));

  const fetchAccounts = async () => {
    try {
      const res = await api.get('/accounts');
      setAccounts(res.data.data || res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const openForm = (account?: any) => {
    if (account) {
      setEditingId(account.id);
      setName(account.name || '');
      setType(account.type || 'corrente');
      setBalance(String(account.balance || account.initial_balance || 0));
      setBank(account.bank || '');
      setColor(account.color || '#22c55e');
      setNotes(account.notes || '');
      setExcludeFromTotals(account.exclude_from_totals === true);
    } else {
      setEditingId(null);
      setName('');
      setType('corrente');
      setBalance('0');
      setBank('');
      setColor('#22c55e');
      setNotes('');
      setExcludeFromTotals(false);
    }
    setShowBankList(false);
    setShowForm(true);
  };

  const handleBalanceChange = (text: string) => {
    const digits = text.replace(/\D/g, '');
    if (!digits) {
      setBalance('');
      return;
    }
    const value = (parseInt(digits, 10) / 100).toFixed(2);
    const formatted = value.replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    setBalance(formatted);
  };

  const handleSave = async () => {
    if (!name.trim()) { toast({ type: 'warning', title: 'Informe o nome da conta' }); return; }
    setSaving(true);
    try {
      const parsedBalance = parseFloat(balance.replace(/\./g, '').replace(',', '.')) || 0;
      const payload = { 
        name: name.trim(), 
        type,
        initial_balance: parsedBalance,
        bank,
        color,
        notes,
        exclude_from_totals: excludeFromTotals
      };
      if (editingId) {
        await api.put(`/accounts/${editingId}`, payload);
        toast({ type: 'success', title: 'Conta atualizada!' });
      } else {
        await api.post('/accounts', payload);
        toast({ type: 'success', title: 'Conta criada!' });
      }
      setShowForm(false);
      fetchAccounts();
    } catch (e: any) {
      toast({ type: 'error', title: 'Erro', message: e.response?.data?.message || 'Tente novamente.' });
    } finally { setSaving(false); }
  };

  const handleDelete = (id: number) => {
    Alert.alert('Excluir conta', 'Tem certeza? Transações vinculadas ficarão sem conta.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/accounts/${id}`);
            toast({ type: 'success', title: 'Conta excluída!' });
            fetchAccounts();
          } catch (e: any) {
            toast({ type: 'error', title: 'Erro', message: e.response?.data?.message || 'Não foi possível excluir.' });
          }
        }
      }
    ]);
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color="#10b981" /></View>;

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Contas</Text>
          <Text style={s.sub}>Gerencie suas contas bancárias</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={() => openForm()}>
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {showForm && (
        <ScrollView style={s.formCard} contentContainerStyle={{ gap: 12, paddingBottom: 20 }}>
          <Text style={s.formTitle}>{editingId ? 'Editar Conta' : 'Nova Conta'}</Text>
          
          <Text style={s.label}>Nome da conta *</Text>
          <TextInput style={s.input} placeholder="Ex: Nubank, Itaú, Carteira..." placeholderTextColor="#cbd5e1" value={name} onChangeText={setName} />
          
          <Text style={s.label}>Tipo de conta *</Text>
          <View style={s.typeRow}>
            {['corrente', 'poupanca', 'carteira_digital'].map(t => (
              <TouchableOpacity key={t} style={[s.typeBtn, type === t && s.typeBtnActive]} onPress={() => setType(t)}>
                <Text style={[s.typeTxt, type === t && s.typeTxtActive]}>{t === 'corrente' ? 'Conta Corrente' : t === 'poupanca' ? 'Conta Poupança' : 'Dinheiro / Carteira'}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {!editingId && (
            <>
              <Text style={s.label}>Saldo inicial</Text>
              <View style={s.moneyInputWrap}>
                <Text style={s.moneyPrefix}>R$</Text>
                <TextInput style={s.moneyInput} placeholder="0,00" placeholderTextColor="#cbd5e1" value={balance} onChangeText={handleBalanceChange} keyboardType="numeric" />
              </View>
            </>
          )}
          
          <Text style={s.label}>Banco/Instituição</Text>
          <TextInput 
            style={s.input} 
            placeholder="Ex: Nubank, Itaú, Bradesco..." 
            placeholderTextColor="#cbd5e1" 
            value={bank} 
            onChangeText={setBank}
            onFocus={() => setShowBankList(true)}
            onBlur={() => setTimeout(() => setShowBankList(false), 200)}
          />
          {showBankList && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.bankList} keyboardShouldPersistTaps="handled">
              {BANKS.map(b => (
                <TouchableOpacity key={b} style={s.bankPill} onPress={() => { setBank(b); setShowBankList(false); }}>
                  <Text style={s.bankPillTxt}>{b}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
          
          <Text style={s.label}>Cor</Text>
          <View style={s.colorPalette}>
            {COLORS.map(c => (
              <TouchableOpacity key={c} style={[s.colorCircle, { backgroundColor: c }, color === c && s.colorActive]} onPress={() => setColor(c)} />
            ))}
          </View>

          <Text style={s.label}>Observações</Text>
          <TextInput style={[s.input, { height: 80, textAlignVertical: 'top', paddingTop: 12 }]} placeholder="Notas adicionais..." placeholderTextColor="#cbd5e1" value={notes} onChangeText={setNotes} multiline />

          <TouchableOpacity style={s.checkRow} onPress={() => setExcludeFromTotals(!excludeFromTotals)} activeOpacity={0.7}>
            <View style={[s.checkbox, excludeFromTotals && s.checkboxActive]}>
              {excludeFromTotals && <Ionicons name="checkmark" size={14} color="#fff" />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.checkTxt}>Excluir esta conta dos cálculos</Text>
              <Text style={s.checkSub}>Esta conta continuará aceitando lançamentos, mas seu saldo não será considerado em totais, gráficos, relatórios e orçamentos.</Text>
            </View>
          </TouchableOpacity>

          <View style={s.formActions}>
            <TouchableOpacity style={s.cancelBtn} onPress={() => setShowForm(false)}>
              <Text style={s.cancelTxt}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.saveTxt}>Salvar</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      <FlatList
        data={accounts}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={s.list}
        renderItem={({ item }) => (
          <View style={s.row}>
            <View style={s.rowIcon}>
              <Ionicons name="wallet-outline" size={20} color="#10b981" />
            </View>
            <View style={s.rowInfo}>
              <Text style={s.rowName}>{item.name}</Text>
              <Text style={s.rowBal}>R$ {parseFloat(item.balance || 0).toFixed(2).replace('.', ',')}</Text>
            </View>
            <TouchableOpacity onPress={() => openForm(item)} style={s.rowAction}>
              <Ionicons name="create-outline" size={18} color="#64748b" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(item.id)} style={s.rowAction}>
              <Ionicons name="trash-outline" size={18} color="#ef4444" />
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <EmptyState icon="wallet-outline" title="Nenhuma conta cadastrada" subtitle="Adicione sua primeira conta bancária." actionLabel="Adicionar Conta" onAction={() => openForm()} />
        }
      />
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
  addBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#10b981', justifyContent: 'center', alignItems: 'center' },
  formCard: { backgroundColor: '#fff', margin: 20, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#f1f5f9', maxHeight: '80%' },
  formTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 8 },
  label: { fontSize: 13, fontWeight: '600', color: '#64748b', marginLeft: 4, marginBottom: -6, zIndex: 1, marginTop: 4 },
  input: { borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12, backgroundColor: '#f8fafc', paddingHorizontal: 16, height: 48, fontSize: 15, color: '#0f172a' },
  moneyInputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12, backgroundColor: '#f8fafc', paddingHorizontal: 16, height: 48 },
  moneyPrefix: { fontSize: 15, color: '#64748b', marginRight: 8, fontWeight: '600' },
  moneyInput: { flex: 1, fontSize: 15, color: '#0f172a' },
  typeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  typeBtn: { paddingHorizontal: 16, height: 44, borderRadius: 12, borderWidth: 1.5, borderColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  typeBtnActive: { backgroundColor: '#dcfce7', borderColor: '#22c55e' },
  typeTxt: { fontSize: 14, fontWeight: '600', color: '#64748b' }, typeTxtActive: { color: '#15803d' },
  bankList: { marginTop: -4, marginBottom: 8, paddingBottom: 4 },
  bankPill: { backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, marginRight: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  bankPillTxt: { fontSize: 12, color: '#475569', fontWeight: '600' },
  colorPalette: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4, padding: 4 },
  colorCircle: { width: 32, height: 32, borderRadius: 16 },
  colorActive: { borderWidth: 3, borderColor: '#0f172a' },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 8, backgroundColor: '#f8fafc', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: '#cbd5e1', justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  checkboxActive: { backgroundColor: '#ef4444', borderColor: '#ef4444' },
  checkTxt: { fontSize: 14, fontWeight: '600', color: '#334155' },
  checkSub: { fontSize: 12, color: '#94a3b8', marginTop: 4, lineHeight: 18 },
  formActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn: { flex: 1, height: 44, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center' },
  cancelTxt: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  saveBtn: { flex: 1, height: 44, borderRadius: 12, backgroundColor: '#10b981', justifyContent: 'center', alignItems: 'center' },
  saveTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },
  list: { padding: 20, paddingBottom: 100 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#f1f5f9', gap: 12 },
  rowIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#d1fae5', justifyContent: 'center', alignItems: 'center' },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  rowBal: { fontSize: 13, color: '#64748b', marginTop: 2 },
  rowAction: { padding: 8 },
});
