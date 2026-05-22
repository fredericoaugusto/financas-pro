import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput, Alert, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import api from '../services/api';
import { toast } from '../components/Toast';
import EmptyState from '../components/EmptyState';

export default function CardsScreen() {
  const router = useRouter();
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [accounts, setAccounts] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [limit, setLimit] = useState('');
  const [closingDay, setClosingDay] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [accountId, setAccountId] = useState<number | null>(null);
  const [brand, setBrand] = useState('Mastercard');
  const [cardholderName, setCardholderName] = useState('');
  const [lastFour, setLastFour] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [color, setColor] = useState('#1e293b');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const [invoiceCard, setInvoiceCard] = useState<any>(null);
  const [invoiceData, setInvoiceData] = useState<any>(null);

  useFocusEffect(useCallback(() => { fetchCards(); }, []));

  const fetchCards = async () => {
    try {
      const [cardsRes, accRes] = await Promise.all([api.get('/cards'), api.get('/accounts')]);
      setCards(cardsRes.data.data || cardsRes.data);
      setAccounts(accRes.data.data || accRes.data);
    } catch { toast({ type: 'error', title: 'Erro ao carregar cartões' }); }
    finally { setLoading(false); }
  };

  const openForm = (c?: any) => {
    setEditingId(c?.id || null);
    setName(c?.name || '');
    setLimit(c ? String(c.limit || '') : '');
    setClosingDay(c ? String(c.closing_day || '') : '');
    setDueDay(c ? String(c.due_day || '') : '');
    setAccountId(c?.account_id || null);
    setBrand(c?.brand || 'Mastercard');
    setCardholderName(c?.cardholder_name || '');
    setLastFour(c?.last_four || '');
    setExpirationDate(c?.expiration_date || '');
    setColor(c?.color || '#1e293b');
    setNotes(c?.notes || '');
    setShowForm(true);
  };

  const handleLimitChange = (text: string) => {
    const digits = text.replace(/\D/g, '');
    if (!digits) { setLimit(''); return; }
    const value = (parseInt(digits, 10) / 100).toFixed(2);
    setLimit(value.replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.'));
  };

  const saveForm = async () => {
    if (!name || !limit || !closingDay || !dueDay || !accountId) {
      toast({ type: 'warning', title: 'Preencha os campos obrigatórios' }); return;
    }
    setSaving(true);
    const payload = {
      name,
      limit: parseFloat(limit.replace(/\./g, '').replace(',', '.')) || 0,
      closing_day: parseInt(closingDay, 10),
      due_day: parseInt(dueDay, 10),
      account_id: accountId,
      brand,
      cardholder_name: cardholderName,
      last_four: lastFour,
      expiration_date: expirationDate,
      color,
      notes
    };
    try {
      if (editingId) await api.put(`/cards/${editingId}`, payload);
      else await api.post('/cards', payload);
      toast({ type: 'success', title: editingId ? 'Cartão atualizado' : 'Cartão criado' });
      setShowForm(false);
      fetchCards();
    } catch (e: any) {
      toast({ type: 'error', title: 'Erro', message: e.response?.data?.message });
    } finally { setSaving(false); }
  };

  const loadInvoice = async (card: any) => {
    setInvoiceCard(card);
    setInvoiceData(null);
    try {
      const res = await api.get(`/cards/${card.id}/invoice`);
      setInvoiceData(res.data);
    } catch { toast({ type: 'error', title: 'Erro ao carregar fatura' }); setInvoiceCard(null); }
  };

  const payInvoice = async () => {
    Alert.alert('Pagar Fatura', `Deseja pagar a fatura atual de R$ ${invoiceData?.total?.toFixed(2)}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Pagar', onPress: async () => {
        try {
          await api.post(`/cards/${invoiceCard.id}/pay`);
          toast({ type: 'success', title: 'Fatura paga com sucesso!' });
          setInvoiceCard(null);
          fetchCards();
        } catch { toast({ type: 'error', title: 'Erro ao pagar' }); }
      }}
    ]);
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color="#10b981" /></View>;

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}><Ionicons name="arrow-back" size={22} color="#0f172a" /></TouchableOpacity>
        <View style={{ flex: 1 }}><Text style={s.title}>Cartões</Text><Text style={s.sub}>Gerencie seus cartões de crédito</Text></View>
        <TouchableOpacity style={s.addBtn} onPress={() => openForm()}><Ionicons name="add" size={20} color="#fff" /></TouchableOpacity>
      </View>

      {showForm && (
        <ScrollView style={s.formCard} contentContainerStyle={{ gap: 12, paddingBottom: 20 }}>
          <Text style={s.formTitle}>{editingId ? 'Editar Cartão' : 'Novo Cartão'}</Text>
          <TextInput style={s.input} placeholder="Nome do cartão *" value={name} onChangeText={setName} />
          
          <Text style={s.fieldLabel}>Conta Vinculada *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
            {accounts.map(acc => (
              <TouchableOpacity key={acc.id} style={[s.pill, accountId === acc.id && s.pillActive]} onPress={() => setAccountId(acc.id)}>
                <Text style={[s.pillTxt, accountId === acc.id && s.pillTxtActive]}>{acc.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={s.fieldLabel}>Bandeira</Text>
              <TextInput style={s.input} placeholder="Visa, Mastercard" value={brand} onChangeText={setBrand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.fieldLabel}>4 Dígitos</Text>
              <TextInput style={s.input} placeholder="1234" value={lastFour} onChangeText={setLastFour} keyboardType="numeric" maxLength={4} />
            </View>
          </View>

          <TextInput style={s.input} placeholder="Nome do Titular" value={cardholderName} onChangeText={setCardholderName} autoCapitalize="characters" />
          
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={s.fieldLabel}>Validade MM/AA</Text>
              <TextInput style={s.input} placeholder="MM/AA" value={expirationDate} onChangeText={setExpirationDate} maxLength={5} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.fieldLabel}>Limite Total R$ *</Text>
              <TextInput style={s.input} placeholder="0,00" value={limit} onChangeText={handleLimitChange} keyboardType="numeric" />
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={s.fieldLabel}>Dia Fechamento *</Text>
              <TextInput style={s.input} placeholder="Ex: 25" value={closingDay} onChangeText={setClosingDay} keyboardType="numeric" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.fieldLabel}>Dia Vencimento *</Text>
              <TextInput style={s.input} placeholder="Ex: 5" value={dueDay} onChangeText={setDueDay} keyboardType="numeric" />
            </View>
          </View>

          <View style={s.colorWrap}>
            <View style={[s.colorDot, { backgroundColor: color }]} />
            <TextInput style={s.colorInput} placeholder="Cor #Hex" value={color} onChangeText={setColor} />
          </View>

          <TextInput style={[s.input, { height: 60, textAlignVertical: 'top', paddingTop: 12 }]} placeholder="Observações" value={notes} onChangeText={setNotes} multiline />

          <View style={s.formActions}>
            <TouchableOpacity style={s.cancelBtn} onPress={() => setShowForm(false)}><Text style={s.cancelTxt}>Cancelar</Text></TouchableOpacity>
            <TouchableOpacity style={s.saveBtn} onPress={saveForm}><Text style={s.saveTxt}>{saving ? 'Salvar...' : 'Salvar'}</Text></TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {!showForm && (
        <FlatList
        data={cards}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={s.list}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} activeOpacity={0.8} onPress={() => loadInvoice(item)}>
            <View style={s.cardHeader}>
              <View style={s.cardIcon}><Ionicons name="card" size={24} color="#10b981" /></View>
              <View style={{ flex: 1 }}>
                <Text style={s.cardName}>{item.name}</Text>
                <Text style={s.cardLimit}>Limite: R$ {parseFloat(item.limit || 0).toFixed(2)}</Text>
              </View>
              <TouchableOpacity onPress={() => openForm(item)} style={{ padding: 4 }}><Ionicons name="create-outline" size={20} color="#64748b" /></TouchableOpacity>
            </View>
            <View style={s.cardFooter}>
              <Text style={s.cardDates}>Fecha dia {item.closing_day} • Vence dia {item.due_day}</Text>
              <View style={s.invoiceBtn}><Text style={s.invoiceBtnTxt}>Ver Fatura</Text><Ionicons name="chevron-forward" size={14} color="#10b981" /></View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<EmptyState icon="card-outline" title="Nenhum cartão" subtitle="Adicione um cartão de crédito para gerenciar faturas." actionLabel="Adicionar Cartão" onAction={() => openForm()} />}
      />
      )}

      {/* Modal de Fatura */}
      <Modal visible={!!invoiceCard} animationType="slide" presentationStyle="pageSheet">
        <View style={s.modalRoot}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Fatura: {invoiceCard?.name}</Text>
            <TouchableOpacity onPress={() => setInvoiceCard(null)} style={s.backBtn}><Ionicons name="close" size={22} color="#0f172a" /></TouchableOpacity>
          </View>
          {!invoiceData ? <View style={s.center}><ActivityIndicator size="large" color="#10b981" /></View> : (
            <ScrollView contentContainerStyle={{ padding: 20 }}>
              <View style={s.invSummary}>
                <Text style={s.invTotalLabel}>Total da Fatura Atual</Text>
                <Text style={s.invTotalVal}>R$ {parseFloat(invoiceData.total || 0).toFixed(2).replace('.', ',')}</Text>
                <TouchableOpacity style={s.payBtn} onPress={payInvoice}>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#fff" /><Text style={s.payBtnTxt}>Pagar Fatura</Text>
                </TouchableOpacity>
              </View>
              <Text style={s.invListTitle}>Lançamentos da Fatura</Text>
              {invoiceData.transactions?.length === 0 ? <Text style={s.emptyTxt}>Fatura vazia.</Text> : invoiceData.transactions?.map((tx: any) => (
                <View key={tx.id} style={s.invTx}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.invTxDesc}>{tx.description}</Text>
                    <Text style={s.invTxDate}>{new Date(tx.date).toLocaleDateString('pt-BR')}</Text>
                  </View>
                  <Text style={s.invTxVal}>R$ {parseFloat(tx.value).toFixed(2)}</Text>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </Modal>
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
  formTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#64748b', marginLeft: 4, marginBottom: -6, zIndex: 1 },
  input: { borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12, backgroundColor: '#f8fafc', paddingHorizontal: 16, height: 48, fontSize: 15, color: '#0f172a' },
  pill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: '#f1f5f9', marginRight: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  pillActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  pillTxt: { fontSize: 13, fontWeight: '600', color: '#64748b' }, pillTxtActive: { color: '#fff' },
  colorWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12, backgroundColor: '#f8fafc', paddingHorizontal: 16, height: 48 },
  colorDot: { width: 20, height: 20, borderRadius: 4, marginRight: 12 },
  colorInput: { flex: 1, fontSize: 15, color: '#0f172a' },
  formActions: { flexDirection: 'row', gap: 12, marginTop: 12 },
  cancelBtn: { flex: 1, height: 44, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center' }, cancelTxt: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  saveBtn: { flex: 1, height: 44, borderRadius: 12, backgroundColor: '#10b981', justifyContent: 'center', alignItems: 'center' }, saveTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },
  list: { padding: 20, paddingBottom: 100 },
  card: { backgroundColor: '#1e293b', borderRadius: 20, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 },
  cardIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: 'rgba(16, 185, 129, 0.15)', justifyContent: 'center', alignItems: 'center' },
  cardName: { fontSize: 18, fontWeight: '700', color: '#fff' }, cardLimit: { fontSize: 13, color: '#94a3b8', marginTop: 2 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 16 },
  cardDates: { fontSize: 12, color: '#94a3b8' },
  invoiceBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16, 185, 129, 0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, gap: 4 },
  invoiceBtnTxt: { fontSize: 12, fontWeight: '700', color: '#10b981' },
  modalRoot: { flex: 1, backgroundColor: '#f9fafb' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', padding: 20, paddingTop: 40, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  invSummary: { backgroundColor: '#fff', borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: '#f1f5f9' },
  invTotalLabel: { fontSize: 14, color: '#64748b' }, invTotalVal: { fontSize: 32, fontWeight: '800', color: '#ef4444', marginVertical: 8 },
  payBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#10b981', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, gap: 8, marginTop: 8 }, payBtnTxt: { color: '#fff', fontWeight: '700' },
  invListTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12, color: '#0f172a' },
  invTx: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#f1f5f9' },
  invTxDesc: { fontSize: 14, fontWeight: '600' }, invTxDate: { fontSize: 12, color: '#94a3b8', marginTop: 2 }, invTxVal: { fontSize: 15, fontWeight: '700' },
  emptyTxt: { textAlign: 'center', color: '#94a3b8', padding: 20 }
});
