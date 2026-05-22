import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Modal, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../services/api';
import { toast } from '../components/Toast';

const TIPOS = [
  { label: 'Receita', value: 'receita', color: '#10b981', bg: '#dcfce7', icon: 'arrow-up' },
  { label: 'Despesa', value: 'despesa', color: '#ef4444', bg: '#fee2e2', icon: 'arrow-down' },
  { label: 'Transferência', value: 'transferencia', color: '#3b82f6', bg: '#dbeafe', icon: 'swap-horizontal' },
];
const PAYMENTS = ['Dinheiro/PIX', 'Débito', 'Crédito'];

export default function NewTransactionScreen() {
  const router = useRouter();
  const [type, setType] = useState<'despesa'|'receita'|'transferencia'>('despesa');
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(new Date().toISOString().split('T')[1].substring(0,5));
  const [payment, setPayment] = useState('Dinheiro/PIX');
  const [status, setStatus] = useState<'pago'|'pendente'>('pago');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // Contas, cartões e categorias
  const [accounts, setAccounts] = useState<any[]>([]);
  const [cards, setCards] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [accountId, setAccountId] = useState<number|null>(null);
  const [destAccountId, setDestAccountId] = useState<number|null>(null);
  const [cardId, setCardId] = useState<number|null>(null);
  const [categoryId, setCategoryId] = useState<number|null>(null);
  const [pickerType, setPickerType] = useState<'account'|'destAccount'|'card'|'category'|null>(null);

  useEffect(() => {
    api.get('/accounts').then(r => setAccounts(r.data.data||r.data)).catch(()=>{});
    api.get('/cards').then(r => setCards(r.data.data||r.data)).catch(()=>{});
    api.get('/categories').then(r => setCategories(r.data.data||r.data)).catch(()=>{});
  }, []);

  const selectedAccount = accounts.find(a => a.id === accountId);
  const selectedDestAccount = accounts.find(a => a.id === destAccountId);
  const selectedCard = cards.find(c => c.id === cardId);
  const selectedCategory = categories.find(c => c.id === categoryId);

  const handleAmountChange = (text: string) => {
    const digits = text.replace(/\D/g, '');
    if (!digits) {
      setAmount('');
      return;
    }
    const value = (parseInt(digits, 10) / 100).toFixed(2);
    const formatted = value.replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    setAmount(formatted);
  };

  const handleSave = async () => {
    if (!amount||!desc) { toast({type:'warning',title:'Preencha valor e descrição'}); return; }
    const num = parseFloat(amount.replace(/\./g, '').replace(',', '.'));
    if (isNaN(num)||num<=0) { toast({type:'warning',title:'Valor inválido'}); return; }
    setLoading(true);
    try {
      await api.post('/transactions', {
        type, value: num, description: desc, date: `${date} ${time}`,
        payment_method: type === 'transferencia' ? null : (payment === 'Dinheiro/PIX' ? 'pix' : payment.toLowerCase()),
        status: status === 'pago' ? 'confirmada' : 'pendente',
        account_id: accountId,
        destination_account_id: type === 'transferencia' ? destAccountId : null,
        card_id: (payment === 'Crédito' && type !== 'transferencia') ? cardId : null,
        category_id: type === 'transferencia' ? null : categoryId,
        notes
      });
      toast({type:'success',title:'Lançamento criado!'});
      router.back();
    } catch (e:any) {
      toast({type:'error',title:'Erro',message:e.response?.data?.message||'Tente novamente.'});
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS==='ios'?'padding':undefined}>
      <View style={s.handle}/>
      <View style={s.mh}>
        <Text style={s.mt}>Novo Lançamento</Text>
        <TouchableOpacity onPress={()=>router.back()} style={s.closeBtn}>
          <Ionicons name="close" size={22} color="#64748b"/>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        {/* Tipo */}
        <View style={s.typeRow}>
          {TIPOS.map(t=>(
            <TouchableOpacity key={t.value} style={[s.typeBtn, type === t.value && { borderColor: t.color, backgroundColor: '#fff' }]} onPress={()=>setType(t.value as any)} activeOpacity={0.7}>
              <Text style={[s.typeTxt, type === t.value && { color: t.color, fontWeight: '600' }]}>
                {t.value === 'receita' ? '↑ Receita' : t.value === 'despesa' ? '↓ Despesa' : '⇄ Transferência'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Valor */}
        <View style={s.group}>
          <Text style={s.label}>Valor *</Text>
          <View style={s.inputRow}>
            <Text style={s.prefix}>R$</Text>
            <TextInput style={s.amtInput} placeholder="0,00" placeholderTextColor="#cbd5e1" value={amount} onChangeText={handleAmountChange} keyboardType="numeric"/>
          </View>
        </View>

        <View style={s.group}>
          <Text style={s.label}>Descrição *</Text>
          <TextInput style={s.input} placeholder="Ex: Salário, Supermercado..." placeholderTextColor="#cbd5e1" value={desc} onChangeText={setDesc}/>
        </View>

        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>Data *</Text>
            <View style={s.inputIconWrap}>
              <Ionicons name="calendar-outline" size={18} color="#94a3b8" />
              <TextInput style={s.inputClean} placeholder="DD/MM/AAAA" value={date} onChangeText={setDate}/>
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>Hora</Text>
            <View style={s.inputIconWrap}>
              <Ionicons name="time-outline" size={18} color="#94a3b8" />
              <TextInput style={s.inputClean} placeholder="00:00" value={time} onChangeText={setTime}/>
            </View>
          </View>
        </View>

        {/* Status */}
        <View style={s.group}>
          <Text style={s.label}>Status</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity style={[s.statusBtn, status==='pago' && { borderColor: '#10b981', backgroundColor: '#dcfce7' }]} onPress={() => setStatus('pago')}>
              <Text style={[s.statusTxt, status==='pago' && { color: '#10b981' }]}>👍 {type === 'receita' ? 'Recebido' : 'Pago'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.statusBtn, status==='pendente' && { borderColor: '#f59e0b', backgroundColor: '#fef3c7' }]} onPress={() => setStatus('pendente')}>
              <Text style={[s.statusTxt, status==='pendente' && { color: '#f59e0b' }]}>👎 Pendente</Text>
            </TouchableOpacity>
          </View>
        </View>

        {type === 'transferencia' ? (
          <View style={s.sectionBox}>
            <Text style={s.sectionTitle}>Contas</Text>
            
            <View style={{ marginBottom: 16 }}>
              <Text style={s.label}>Conta de origem</Text>
              <TouchableOpacity style={s.picker} onPress={()=>setPickerType('account')}>
                <Text style={s.pickerTxt}>{selectedAccount?.name||'Selecione...'}</Text>
                <Ionicons name="chevron-down" size={16} color="#94a3b8"/>
              </TouchableOpacity>
            </View>

            <View>
              <Text style={s.label}>Conta de destino</Text>
              <TouchableOpacity style={s.picker} onPress={()=>setPickerType('destAccount')}>
                <Text style={s.pickerTxt}>{selectedDestAccount?.name||'Selecione...'}</Text>
                <Ionicons name="chevron-down" size={16} color="#94a3b8"/>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            {/* Forma Pagamento e Conta/Cartão */}
            <View style={s.sectionBox}>
              <Text style={s.sectionTitle}>Conta / Cartão</Text>
              <Text style={s.label}>Forma de pagamento</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.payRow}>
                {PAYMENTS.map(p=>(
                  <TouchableOpacity key={p} style={[s.pill,payment===p&&s.pillA]} onPress={()=>setPayment(p)}>
                    <Text style={[s.pillTxt,payment===p&&s.pillTxtA]}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {payment !== 'Crédito' ? (
                <View style={{ marginTop: 16 }}>
                  <Text style={s.label}>Conta</Text>
                  <TouchableOpacity style={s.picker} onPress={()=>setPickerType('account')}>
                    <Text style={s.pickerTxt}>{selectedAccount?.name||'Selecione...'}</Text>
                    <Ionicons name="chevron-down" size={16} color="#94a3b8"/>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ marginTop: 16 }}>
                  <Text style={s.label}>Cartão de Crédito</Text>
                  <TouchableOpacity style={s.picker} onPress={()=>setPickerType('card')}>
                    <Text style={s.pickerTxt}>{selectedCard?.name||'Selecione...'}</Text>
                    <Ionicons name="chevron-down" size={16} color="#94a3b8"/>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Categoria */}
            <View style={s.group}>
              <Text style={s.label}>Categoria</Text>
              <TouchableOpacity style={s.picker} onPress={()=>setPickerType('category')}>
                <Text style={s.pickerTxt}>{selectedCategory?.name||'Selecione...'}</Text>
                <Ionicons name="chevron-down" size={16} color="#94a3b8"/>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Observacoes */}
        <View style={s.group}>
          <Text style={s.label}>Observações</Text>
          <TextInput style={[s.input, { height: 80, textAlignVertical: 'top', paddingTop: 12 }]} placeholder="Notas adicionais (opcional)..." value={notes} onChangeText={setNotes} multiline />
        </View>

        {/* Anexos UI Placeholder */}
        <View style={s.group}>
          <Text style={s.label}>Anexos</Text>
          <TouchableOpacity style={s.uploadBox}>
            <Ionicons name="cloud-upload-outline" size={28} color="#10b981" />
            <Text style={s.uploadTxt}>Clique para enviar ou arraste e solte</Text>
            <Text style={s.uploadSub}>PNG, JPG, PDF até 10MB</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={[s.saveBtn,type==='despesa'?s.saveBtnR:s.saveBtnG,loading&&{opacity:.7}]} onPress={handleSave} disabled={loading}>
          {loading?<ActivityIndicator color="#fff"/>:<><Ionicons name="checkmark-circle-outline" size={20} color="#fff"/><Text style={s.saveTxt}>Salvar Lançamento</Text></>}
        </TouchableOpacity>
        <View style={{height:40}}/>
      </ScrollView>

      {/* Modal Picker */}
      <Modal visible={!!pickerType} transparent animationType="slide" onRequestClose={()=>setPickerType(null)}>
        <View style={s.overlay}>
          <View style={s.modal}>
            <View style={s.modalH}>
              <Text style={s.modalT}>{pickerType==='account'?'Selecionar Conta':pickerType==='card'?'Selecionar Cartão':'Selecionar Categoria'}</Text>
              <TouchableOpacity onPress={()=>setPickerType(null)}><Ionicons name="close" size={22} color="#64748b"/></TouchableOpacity>
            </View>
            <FlatList
              data={pickerType==='account' || pickerType==='destAccount' ? accounts : pickerType==='card' ? cards : categories}
              keyExtractor={i=>i.id.toString()}
              renderItem={({item})=>(
                <TouchableOpacity style={s.modalRow} onPress={()=>{
                  if (pickerType==='account') setAccountId(item.id);
                  else if (pickerType==='destAccount') setDestAccountId(item.id);
                  else if (pickerType==='card') setCardId(item.id);
                  else setCategoryId(item.id);
                  setPickerType(null);
                }}>
                  <Text style={s.modalRowTxt}>{item.name}</Text>
                  {((pickerType==='account'&&accountId===item.id)||
                    (pickerType==='destAccount'&&destAccountId===item.id)||
                    (pickerType==='card'&&cardId===item.id)||
                    (pickerType==='category'&&categoryId===item.id))&&
                    <Ionicons name="checkmark" size={18} color="#10b981"/>}
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={s.emptyM}>Nenhum item. Crie primeiro no Menu.</Text>}
            />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const s=StyleSheet.create({
  root:{flex:1,backgroundColor:'#fff',borderTopLeftRadius:24,borderTopRightRadius:24},
  handle:{width:40,height:4,borderRadius:2,backgroundColor:'#e2e8f0',alignSelf:'center',marginTop:12},
  mh:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:24,paddingTop:16,paddingBottom:20,borderBottomWidth:1,borderBottomColor:'#f1f5f9'},
  mt:{fontSize:20,fontWeight:'800',color:'#0f172a'},
  closeBtn:{width:36,height:36,borderRadius:18,backgroundColor:'#f8fafc',justifyContent:'center',alignItems:'center'},
  scroll:{padding:24},
  typeRow:{flexDirection:'row',gap:12,marginBottom:24},
  typeBtn:{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,paddingVertical:12,borderRadius:8,borderWidth:1,borderColor:'#e2e8f0',backgroundColor:'#fff'},
  typeTxt:{fontSize:14,fontWeight:'500',color:'#94a3b8'},
  group:{marginBottom:20},
  label:{fontSize:13,fontWeight:'500',color:'#475569',marginBottom:8},
  inputRow:{flexDirection:'row',alignItems:'center',borderWidth:1,borderColor:'#e2e8f0',borderRadius:8,backgroundColor:'#fff',paddingHorizontal:14,height:48},
  prefix:{fontSize:18,fontWeight:'600',color:'#94a3b8',marginRight:8},
  amtInput:{flex:1,fontSize:20,fontWeight:'700',color:'#0f172a'},
  input:{borderWidth:1,borderColor:'#e2e8f0',borderRadius:8,backgroundColor:'#fff',paddingHorizontal:14,height:48,fontSize:14,color:'#0f172a'},
  inputIconWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, backgroundColor: '#fff', paddingHorizontal: 12, height: 48, gap: 8 },
  inputClean: { flex: 1, fontSize: 14, color: '#0f172a', paddingVertical: 0 },
  statusBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, height: 44, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff' },
  statusTxt: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  sectionBox: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: '#e2e8f0' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginBottom: 16 },
  picker:{flexDirection:'row',alignItems:'center',borderWidth:1,borderColor:'#e2e8f0',borderRadius:8,backgroundColor:'#fff',paddingHorizontal:14,height:48,gap:10},
  pickerTxt:{flex:1,fontSize:14,color:'#0f172a'},
  payRow:{gap:8},
  pill:{paddingHorizontal:20,paddingVertical:10,borderRadius:8,backgroundColor:'#fff',borderWidth:1,borderColor:'#e2e8f0'},
  pillA:{backgroundColor:'#0f172a',borderColor:'#0f172a'},
  pillTxt:{fontSize:13,fontWeight:'500',color:'#64748b'},
  pillTxtA:{color:'#fff'},
  uploadBox: { borderWidth: 2, borderColor: '#e2e8f0', borderStyle: 'dashed', borderRadius: 16, padding: 24, alignItems: 'center', backgroundColor: '#f8fafc' },
  uploadTxt: { fontSize: 14, fontWeight: '600', color: '#10b981', marginTop: 12 },
  uploadSub: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
  saveBtn:{flexDirection:'row',justifyContent:'center',alignItems:'center',gap:10,borderRadius:16,height:56,marginTop:8},
  saveBtnG:{backgroundColor:'#10b981'},
  saveBtnR:{backgroundColor:'#ef4444'},
  saveTxt:{color:'#fff',fontSize:16,fontWeight:'700'},
  overlay:{flex:1,backgroundColor:'rgba(0,0,0,0.4)',justifyContent:'flex-end'},
  modal:{backgroundColor:'#fff',borderTopLeftRadius:24,borderTopRightRadius:24,maxHeight:'60%',paddingBottom:40},
  modalH:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',padding:20,borderBottomWidth:1,borderBottomColor:'#f1f5f9'},
  modalT:{fontSize:18,fontWeight:'700',color:'#0f172a'},
  modalRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',padding:20,borderBottomWidth:1,borderBottomColor:'#f8fafc'},
  modalRowTxt:{fontSize:15,fontWeight:'600',color:'#1e293b'},
  emptyM:{padding:40,textAlign:'center',color:'#94a3b8',fontSize:14},
});
