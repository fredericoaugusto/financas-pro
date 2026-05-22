// Tela placeholder para o FAB central — nunca é renderizada diretamente
import { Redirect } from 'expo-router';
export default function AddScreen() {
  return <Redirect href="/new-transaction" />;
}
