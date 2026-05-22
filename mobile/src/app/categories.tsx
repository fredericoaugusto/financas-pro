import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import api from '../services/api';
import { toast } from '../components/Toast';
import EmptyState from '../components/EmptyState';

export default function CategoriesScreen() {
  const router = useRouter();
  const [cats, setCats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number|null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<'despesa'|'receita'>('despesa');
  const [color, setColor] = useState('#10b981');
  const [saving, setSaving] = useState(false);

  const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#64748b'];

  useFocusEffect(useCallback(() => { load(); }, []));

  const load = async () => {
    try { const r = await api.get('/categories'); setCats(r.data.data||r.data); }
    catch {} finally { setLoading(false); }
  };

  const open = (c?:any) => { 
    setEditId(c?.id||null); 
    setName(c?.name||''); 
    setType(c?.type||'despesa');
    setColor(c?.color||COLORS[6]);
    setShowForm(true); 
  };

  const save = async () => {
    if (!name.trim()) { toast({type:'warning',title:'Informe o nome'}); return; }
    setSaving(true);
    try {
      const payload = { name: name.trim(), type, color };
      if (editId) await api.put(`/categories/${editId}`, payload);
      else await api.post('/categories', payload);
      toast({type:'success',title:editId?'Atualizada!':'Criada!'});
      setShowForm(false); load();
    } catch(e:any) { toast({type:'error',title:'Erro',message:e.response?.data?.message}); }
    finally { setSaving(false); }
  };

  const del = async (id: number, catName: string) => {
    Alert.alert('Excluir Categoria', `Deseja excluir "${catName}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/categories/${id}`);
            toast({ type: 'success', title: 'Categoria excluída!' });
            load();
          } catch (e: any) { toast({ type: 'error', title: 'Erro', message: e.response?.data?.message }); }
        }
      }
    ]);
  };

  if (loading) return <View style={s.c}><ActivityIndicator size="large" color="#10b981"/></View>;

  return (
    <View style={s.root}>
      <View style={s.hdr}>
        <TouchableOpacity onPress={()=>router.back()} style={s.back}><Ionicons name="arrow-back" size={22} color="#0f172a"/></TouchableOpacity>
        <View style={{flex:1}}><Text style={s.t}>Categorias</Text><Text style={s.st}>Organize seus lançamentos</Text></View>
        <TouchableOpacity style={s.add} onPress={()=>open()}><Ionicons name="add" size={20} color="#fff"/></TouchableOpacity>
      </View>
      {showForm&&(
        <View style={s.form}>
          <Text style={s.ft}>{editId?'Editar':'Nova Categoria'}</Text>
          <TextInput style={s.inp} placeholder="Nome da categoria" placeholderTextColor="#cbd5e1" value={name} onChangeText={setName}/>
          
          <Text style={s.label}>Tipo *</Text>
          <View style={s.typeRow}>
            <TouchableOpacity style={[s.typeBtn, type==='despesa'&&s.typeBtnD]} onPress={()=>setType('despesa')}>
              <Text style={[s.typeTxt, type==='despesa'&&s.typeTxtD]}>Despesa</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.typeBtn, type==='receita'&&s.typeBtnR]} onPress={()=>setType('receita')}>
              <Text style={[s.typeTxt, type==='receita'&&s.typeTxtR]}>Receita</Text>
            </TouchableOpacity>
          </View>

          <Text style={s.label}>Cor</Text>
          <View style={s.colorPalette}>
            {COLORS.map(c => (
              <TouchableOpacity key={c} style={[s.colorCircle, { backgroundColor: c }, color === c && s.colorActive]} onPress={() => setColor(c)} />
            ))}
          </View>

          <View style={s.fa}>
            <TouchableOpacity style={s.cb} onPress={()=>setShowForm(false)}><Text style={s.ct}>Cancelar</Text></TouchableOpacity>
            <TouchableOpacity style={[s.sb,saving&&{opacity:.6}]} onPress={save} disabled={saving}>
              {saving?<ActivityIndicator color="#fff" size="small"/>:<Text style={s.svt}>Salvar</Text>}
            </TouchableOpacity>
          </View>
        </View>
      )}
      <FlatList data={cats} keyExtractor={i=>i.id.toString()} contentContainerStyle={s.list}
        renderItem={({item})=>(
          <View style={s.row}>
            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 }} onPress={()=>open(item)} activeOpacity={.7}>
              <View style={[s.dot,{backgroundColor:item.color||'#10b981'}]}/>
              <Text style={s.rn}>{item.name}</Text>
              <View style={[s.typePill, { backgroundColor: item.type === 'despesa' ? '#fee2e2' : '#dcfce7' }]}>
                <Text style={[s.typePillTxt, { color: item.type === 'despesa' ? '#ef4444' : '#10b981' }]}>{item.type === 'despesa' ? 'Despesa' : 'Receita'}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={()=>del(item.id, item.name)} style={s.delBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="trash-outline" size={16} color="#ef4444"/>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={<EmptyState icon="pricetag-outline" title="Nenhuma categoria" subtitle="Crie categorias para organizar." actionLabel="Adicionar" onAction={()=>open()}/>}
      />
    </View>
  );
}

const s=StyleSheet.create({
  root:{flex:1,backgroundColor:'#f9fafb'},c:{flex:1,justifyContent:'center',alignItems:'center'},
  hdr:{flexDirection:'row',alignItems:'center',backgroundColor:'#fff',paddingTop:56,paddingHorizontal:20,paddingBottom:16,borderBottomWidth:1,borderBottomColor:'#f1f5f9',gap:12},
  back:{width:40,height:40,borderRadius:12,backgroundColor:'#f8fafc',justifyContent:'center',alignItems:'center'},
  t:{fontSize:20,fontWeight:'800',color:'#0f172a'},st:{fontSize:13,color:'#64748b',marginTop:2},
  add:{width:40,height:40,borderRadius:12,backgroundColor:'#10b981',justifyContent:'center',alignItems:'center'},
  form:{backgroundColor:'#fff',margin:20,borderRadius:16,padding:20,borderWidth:1,borderColor:'#f1f5f9',gap:12},
  ft:{fontSize:16,fontWeight:'700',color:'#0f172a',marginBottom:4},
  label: { fontSize: 12, fontWeight: '600', color: '#64748b', marginLeft: 4, marginBottom: -6, zIndex: 1 },
  inp:{borderWidth:1.5,borderColor:'#e2e8f0',borderRadius:12,backgroundColor:'#f8fafc',paddingHorizontal:16,height:48,fontSize:15,color:'#0f172a'},
  typeRow: { flexDirection: 'row', gap: 12 },
  typeBtn: { flex: 1, height: 44, borderRadius: 12, borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center' },
  typeBtnD: { borderColor: '#ef4444', backgroundColor: '#fee2e2' }, typeTxtD: { color: '#ef4444' },
  typeBtnR: { borderColor: '#10b981', backgroundColor: '#dcfce7' }, typeTxtR: { color: '#10b981' },
  typeTxt: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  colorPalette: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6 },
  colorCircle: { width: 32, height: 32, borderRadius: 16 },
  colorActive: { borderWidth: 3, borderColor: '#0f172a' },
  fa:{flexDirection:'row',gap:12,marginTop:12},
  cb:{flex:1,height:44,borderRadius:12,borderWidth:1,borderColor:'#e2e8f0',justifyContent:'center',alignItems:'center'},
  ct:{fontSize:14,fontWeight:'600',color:'#64748b'},
  sb:{flex:1,height:44,borderRadius:12,backgroundColor:'#10b981',justifyContent:'center',alignItems:'center'},
  svt:{fontSize:14,fontWeight:'700',color:'#fff'},
  list:{padding:20,paddingBottom:100},
  row:{flexDirection:'row',alignItems:'center',backgroundColor:'#fff',borderRadius:14,padding:14,marginBottom:8,borderWidth:1,borderColor:'#f1f5f9',gap:12},
  dot:{width:12,height:12,borderRadius:6,flexShrink:0},
  rn:{flex:1,fontSize:15,fontWeight:'600',color:'#1e293b'},
  typePill:{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  typePillTxt:{ fontSize: 10, fontWeight: '700' },
  delBtn:{ width: 32, height: 32, borderRadius: 9, backgroundColor: '#fee2e2', justifyContent: 'center', alignItems: 'center' },
});
