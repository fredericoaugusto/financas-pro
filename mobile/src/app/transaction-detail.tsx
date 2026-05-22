import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import api from '../services/api';
import { toast } from '../components/Toast';

export default function TransactionDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [tx, setTx] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (id) load(); }, [id]);

  const load = async () => {
    try { const r = await api.get(`/transactions/${id}`); setTx(r.data.data||r.data); }
    catch { toast({type:'error',title:'Erro ao carregar'}); }
    finally { setLoading(false); }
  };

  const handleDelete = () => {
    Alert.alert('Excluir lançamento','Tem certeza?',[
      {text:'Cancelar',style:'cancel'},
      {text:'Excluir',style:'destructive',onPress:async()=>{
        try { await api.delete(`/transactions/${id}`); toast({type:'success',title:'Excluído!'}); router.back(); }
        catch(e:any) { toast({type:'error',title:'Erro',message:e.response?.data?.message}); }
      }}
    ]);
  };

  const handleToggle = async () => {
    try {
      await api.patch(`/transactions/${id}/toggle-status`);
      toast({type:'success',title:'Status alterado!'});
      load();
    } catch(e:any) { toast({type:'error',title:'Erro',message:e.response?.data?.message}); }
  };

  if (loading) return <View style={s.c}><ActivityIndicator size="large" color="#10b981"/></View>;
  if (!tx) return <View style={s.c}><Text>Não encontrado</Text></View>;

  const exp = tx.type==='despesa';
  const val = parseFloat(tx.value||0);
  const dt = new Date(tx.date).toLocaleDateString('pt-BR');
  const pay: Record<string,string> = {pix:'PIX',debito:'Débito',credito:'Crédito',dinheiro:'Dinheiro',boleto:'Boleto',transferencia:'Transferência'};

  return (
    <View style={s.root}>
      <View style={s.hdr}>
        <TouchableOpacity onPress={()=>router.back()} style={s.back}><Ionicons name="arrow-back" size={22} color="#0f172a"/></TouchableOpacity>
        <Text style={s.ht}>Detalhes</Text>
        <View style={{width:40}}/>
      </View>
      <ScrollView contentContainerStyle={s.scroll}>
        {/* Valor em destaque */}
        <View style={s.valBox}>
          <View style={[s.typeBadge,{backgroundColor:exp?'#fee2e2':'#dcfce7'}]}>
            <Ionicons name={exp?'arrow-down':'arrow-up'} size={20} color={exp?'#ef4444':'#10b981'}/>
            <Text style={[s.typeLabel,{color:exp?'#ef4444':'#10b981'}]}>{exp?'Despesa':'Receita'}</Text>
          </View>
          <Text style={[s.valTxt,{color:exp?'#ef4444':'#10b981'}]}>
            {exp?'-':'+'} R$ {val.toFixed(2).replace('.',',')}
          </Text>
        </View>

        {/* Campos */}
        <View style={s.card}>
          <Row label="Descrição" value={tx.description}/>
          <Row label="Data" value={dt}/>
          <Row label="Status" value={tx.status==='confirmada'?'✅ Confirmada':'⏳ Pendente'}/>
          {tx.payment_method && <Row label="Pagamento" value={pay[tx.payment_method]||tx.payment_method}/>}
          {tx.category?.name && <Row label="Categoria" value={tx.category.name}/>}
          {tx.account?.name && <Row label="Conta" value={tx.account.name}/>}
          {tx.notes && <Row label="Notas" value={tx.notes}/>}
        </View>

        {/* Ações */}
        <View style={s.actions}>
          <TouchableOpacity style={s.actionBtn} onPress={handleToggle}>
            <Ionicons name="swap-horizontal-outline" size={18} color="#3b82f6"/>
            <Text style={[s.actionTxt,{color:'#3b82f6'}]}>Alternar Status</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.actionBtn,s.deleteBtn]} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={18} color="#ef4444"/>
            <Text style={[s.actionTxt,{color:'#ef4444'}]}>Excluir</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

function Row({label,value}:{label:string,value:string}) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>{value}</Text>
    </View>
  );
}

const s=StyleSheet.create({
  root:{flex:1,backgroundColor:'#f9fafb'},
  c:{flex:1,justifyContent:'center',alignItems:'center'},
  hdr:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',backgroundColor:'#fff',paddingTop:56,paddingHorizontal:20,paddingBottom:16,borderBottomWidth:1,borderBottomColor:'#f1f5f9'},
  back:{width:40,height:40,borderRadius:12,backgroundColor:'#f8fafc',justifyContent:'center',alignItems:'center'},
  ht:{fontSize:18,fontWeight:'700',color:'#0f172a'},
  scroll:{padding:20},
  valBox:{alignItems:'center',marginBottom:24,gap:12},
  typeBadge:{flexDirection:'row',alignItems:'center',gap:6,paddingHorizontal:16,paddingVertical:8,borderRadius:20},
  typeLabel:{fontSize:14,fontWeight:'700'},
  valTxt:{fontSize:36,fontWeight:'800'},
  card:{backgroundColor:'#fff',borderRadius:20,padding:20,borderWidth:1,borderColor:'#f1f5f9',marginBottom:20},
  row:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingVertical:14,borderBottomWidth:1,borderBottomColor:'#f8fafc'},
  rowLabel:{fontSize:13,fontWeight:'600',color:'#94a3b8'},
  rowValue:{fontSize:14,fontWeight:'600',color:'#1e293b',maxWidth:'60%',textAlign:'right'},
  actions:{gap:10},
  actionBtn:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,backgroundColor:'#fff',borderRadius:14,padding:16,borderWidth:1,borderColor:'#e2e8f0'},
  deleteBtn:{borderColor:'#fee2e2'},
  actionTxt:{fontSize:15,fontWeight:'700'},
});
