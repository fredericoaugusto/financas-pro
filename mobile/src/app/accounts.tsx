import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, TextInput, Alert, ScrollView, Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import api from '../services/api';
import { toast } from '../components/Toast';
import EmptyState from '../components/EmptyState';

const ACCOUNT_TYPES = [
  { value: 'corrente', label: 'Conta Corrente', icon: 'business-outline' },
  { value: 'poupanca', label: 'Conta Poupança', icon: 'leaf-outline' },
  { value: 'carteira_digital', label: 'Dinheiro / Carteira', icon: 'wallet-outline' },
];

const COLORS = [
  '#22c55e', '#16a34a', '#15803d',
  '#3b82f6', '#2563eb', '#1d4ed8',
  '#8b5cf6', '#7c3aed', '#6d28d9',
  '#f97316', '#ea580c', '#c2410c',
  '#ef4444', '#dc2626', '#b91c1c',
  '#64748b', '#475569', '#334155',
];

const BANKS = [
  'Nubank', 'Itaú', 'Bradesco', 'Santander',
  'Banco do Brasil', 'Caixa Econômica', 'Inter',
  'C6 Bank', 'PicPay', 'Mercado Pago', 'Original', 'Next', 'Neon',
];

// Card de conta memoizado
const AccountCard = React.memo(({ item, onEdit, onDelete }: any) => {
  const balance = parseFloat(item.balance || item.initial_balance || 0);
  const isPositive = balance >= 0;
  const typeInfo = ACCOUNT_TYPES.find(t => t.value === item.type) || ACCOUNT_TYPES[0];

  return (
    <View style={[a.row, { borderLeftColor: item.color || '#10b981', borderLeftWidth: 4 }]}>
      <View style={[a.rowIcon, { backgroundColor: (item.color || '#10b981') + '22' }]}>
        <Ionicons name={typeInfo.icon as any} size={20} color={item.color || '#10b981'} />
      </View>
      <View style={a.rowInfo}>
        <Text style={a.rowName}>{item.name}</Text>
        {item.bank ? <Text style={a.rowBank}>{item.bank}</Text> : null}
        <Text style={[a.rowBal, { color: isPositive ? '#10b981' : '#ef4444' }]}>
          {isPositive ? '' : '-'}R$ {Math.abs(balance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </Text>
      </View>
      <View style={a.rowActions}>
        <TouchableOpacity onPress={() => onEdit(item)} style={a.rowAction} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="create-outline" size={18} color="#64748b" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onDelete(item.id)} style={a.rowAction} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="trash-outline" size={18} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </View>
  );
});

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
      // Formata saldo atual para edição
      const bal = parseFloat(account.balance || account.initial_balance || 0);
      setBalance(bal.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
      setBank(account.bank || '');
      setColor(account.color || '#22c55e');
      setNotes(account.notes || '');
      setExcludeFromTotals(account.exclude_from_totals === true);
    } else {
      setEditingId(null);
      setName('');
      setType('corrente');
      setBalance('');
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
    if (!digits) { setBalance(''); return; }
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
        exclude_from_totals: excludeFromTotals,
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
    Alert.alert('Excluir conta', 'Tem certeza? As transações vinculadas ficarão sem conta.', [
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
        },
      },
    ]);
  };

  // Totais
  const totalSaldo = accounts.reduce((sum, a) => sum + parseFloat(a.balance || 0), 0);

  const renderItem = useCallback(({ item }: any) => (
    <AccountCard item={item} onEdit={openForm} onDelete={handleDelete} />
  ), []);

  const keyExtractor = useCallback((item: any) => item.id.toString(), []);

  if (loading) return <View style={a.center}><ActivityIndicator size="large" color="#10b981" /></View>;

  return (
    <View style={a.root}>
      {/* Header */}
      <View style={a.header}>
        <TouchableOpacity onPress={() => router.back()} style={a.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={a.title}>Contas</Text>
          <Text style={a.sub}>Gerencie suas contas bancárias</Text>
        </View>
        <TouchableOpacity style={a.addBtn} onPress={() => openForm()}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Saldo total */}
      {accounts.length > 0 && (
        <View style={a.totalCard}>
          <Text style={a.totalLabel}>Saldo Total</Text>
          <Text style={[a.totalVal, { color: totalSaldo >= 0 ? '#10b981' : '#ef4444' }]}>
            {totalSaldo >= 0 ? '' : '-'}R$ {Math.abs(totalSaldo).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </Text>
          <Text style={a.totalSub}>{accounts.length} conta{accounts.length !== 1 ? 's' : ''}</Text>
        </View>
      )}

      {/* Formulário */}
      {showForm && (
        <ScrollView style={a.formCard} contentContainerStyle={{ gap: 12, paddingBottom: 20 }} keyboardShouldPersistTaps="handled">
          <View style={a.formHeader}>
            <Text style={a.formTitle}>{editingId ? 'Editar Conta' : 'Nova Conta'}</Text>
            <TouchableOpacity onPress={() => setShowForm(false)} style={a.closeForm}>
              <Ionicons name="close" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <Text style={a.label}>Nome da conta *</Text>
          <TextInput
            style={a.input}
            placeholder="Ex: Nubank, Itaú, Carteira..."
            placeholderTextColor="#cbd5e1"
            value={name}
            onChangeText={setName}
          />

          <Text style={a.label}>Tipo de conta *</Text>
          <View style={a.typeRow}>
            {ACCOUNT_TYPES.map(t => (
              <TouchableOpacity
                key={t.value}
                style={[a.typeBtn, type === t.value && a.typeBtnActive]}
                onPress={() => setType(t.value)}
              >
                <Ionicons name={t.icon as any} size={16} color={type === t.value ? '#15803d' : '#64748b'} />
                <Text style={[a.typeTxt, type === t.value && a.typeTxtActive]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {!editingId && (
            <>
              <Text style={a.label}>Saldo inicial</Text>
              <View style={a.moneyInputWrap}>
                <Text style={a.moneyPrefix}>R$</Text>
                <TextInput
                  style={a.moneyInput}
                  placeholder="0,00"
                  placeholderTextColor="#cbd5e1"
                  value={balance}
                  onChangeText={handleBalanceChange}
                  keyboardType="numeric"
                />
              </View>
            </>
          )}

          <Text style={a.label}>Banco / Instituição</Text>
          <TextInput
            style={a.input}
            placeholder="Ex: Nubank, Itaú, Bradesco..."
            placeholderTextColor="#cbd5e1"
            value={bank}
            onChangeText={setBank}
            onFocus={() => setShowBankList(true)}
            onBlur={() => setTimeout(() => setShowBankList(false), 200)}
          />
          {showBankList && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={a.bankList} keyboardShouldPersistTaps="handled">
              {BANKS.map(b => (
                <TouchableOpacity key={b} style={a.bankPill} onPress={() => { setBank(b); setShowBankList(false); }}>
                  <Text style={a.bankPillTxt}>{b}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <Text style={a.label}>Cor de identificação</Text>
          <View style={a.colorPalette}>
            {COLORS.map(c => (
              <TouchableOpacity
                key={c}
                style={[a.colorCircle, { backgroundColor: c }, color === c && a.colorActive]}
                onPress={() => setColor(c)}
              />
            ))}
          </View>

          <Text style={a.label}>Observações</Text>
          <TextInput
            style={[a.input, { height: 80, textAlignVertical: 'top', paddingTop: 12 }]}
            placeholder="Notas adicionais..."
            placeholderTextColor="#cbd5e1"
            value={notes}
            onChangeText={setNotes}
            multiline
          />

          <TouchableOpacity style={a.checkRow} onPress={() => setExcludeFromTotals(!excludeFromTotals)} activeOpacity={0.7}>
            <View style={[a.checkbox, excludeFromTotals && a.checkboxActive]}>
              {excludeFromTotals && <Ionicons name="checkmark" size={14} color="#fff" />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={a.checkTxt}>Excluir esta conta dos cálculos</Text>
              <Text style={a.checkSub}>Saldo não será considerado em totais, gráficos e relatórios.</Text>
            </View>
          </TouchableOpacity>

          <View style={a.formActions}>
            <TouchableOpacity style={a.cancelBtn} onPress={() => setShowForm(false)}>
              <Text style={a.cancelTxt}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[a.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={a.saveTxt}>Salvar</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {!showForm && (
        <FlatList
          data={accounts}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={a.list}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          ListEmptyComponent={
            <EmptyState
              icon="wallet-outline"
              title="Nenhuma conta cadastrada"
              subtitle="Adicione sua primeira conta bancária para começar."
              actionLabel="Adicionar Conta"
              onAction={() => openForm()}
            />
          }
        />
      )}
    </View>
  );
}

const a = StyleSheet.create({
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
  addBtn: { width: 44, height: 44, borderRadius: 13, backgroundColor: '#10b981', justifyContent: 'center', alignItems: 'center' },
  totalCard: {
    backgroundColor: '#10b981', marginHorizontal: 20, marginTop: 16, marginBottom: 4,
    borderRadius: 20, padding: 20,
  },
  totalLabel: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },
  totalVal: { fontSize: 28, fontWeight: '900', color: '#fff', marginTop: 4 },
  totalSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  formCard: {
    backgroundColor: '#fff', margin: 20, borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: '#f1f5f9', maxHeight: '80%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 16, elevation: 4,
  },
  formHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  formTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  closeForm: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center' },
  label: { fontSize: 13, fontWeight: '600', color: '#64748b', marginLeft: 4, marginBottom: -4, marginTop: 4 },
  input: {
    borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12,
    backgroundColor: '#f8fafc', paddingHorizontal: 16, height: 50,
    fontSize: 15, color: '#0f172a',
  },
  moneyInputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12,
    backgroundColor: '#f8fafc', paddingHorizontal: 16, height: 50,
  },
  moneyPrefix: { fontSize: 16, color: '#64748b', marginRight: 8, fontWeight: '700' },
  moneyInput: { flex: 1, fontSize: 18, color: '#0f172a', fontWeight: '700' },
  typeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  typeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: '#f8fafc',
  },
  typeBtnActive: { backgroundColor: '#dcfce7', borderColor: '#22c55e' },
  typeTxt: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  typeTxtActive: { color: '#15803d' },
  bankList: { marginTop: -4, marginBottom: 8 },
  bankPill: {
    backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 16, marginRight: 8, borderWidth: 1, borderColor: '#e2e8f0',
  },
  bankPillTxt: { fontSize: 12, color: '#475569', fontWeight: '600' },
  colorPalette: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4, padding: 4 },
  colorCircle: { width: 32, height: 32, borderRadius: 16 },
  colorActive: { borderWidth: 3, borderColor: '#0f172a', transform: [{ scale: 1.1 }] },
  checkRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    marginTop: 8, backgroundColor: '#f8fafc', padding: 14,
    borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0',
  },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: '#cbd5e1', justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  checkboxActive: { backgroundColor: '#ef4444', borderColor: '#ef4444' },
  checkTxt: { fontSize: 14, fontWeight: '600', color: '#334155' },
  checkSub: { fontSize: 12, color: '#94a3b8', marginTop: 4, lineHeight: 18 },
  formActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn: { flex: 1, height: 48, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center' },
  cancelTxt: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  saveBtn: { flex: 1, height: 48, borderRadius: 12, backgroundColor: '#10b981', justifyContent: 'center', alignItems: 'center' },
  saveTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },
  list: { padding: 20, paddingBottom: 100 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    marginBottom: 10, borderWidth: 1, borderColor: '#f1f5f9',
    gap: 12, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  rowIcon: { width: 44, height: 44, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  rowBank: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  rowBal: { fontSize: 14, fontWeight: '700', marginTop: 4 },
  rowActions: { flexDirection: 'row', gap: 4 },
  rowAction: { padding: 8 },
});
