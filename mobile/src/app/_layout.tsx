import { Stack } from 'expo-router';
import React from 'react';
import { AuthProvider } from '../contexts/AuthContext';
import { ToastProvider } from '../components/Toast';

export default function RootLayout() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="login" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="new-transaction"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="accounts"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="categories"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="transaction-detail"
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="insights"
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="notifications"
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen name="cards" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="budgets" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="goals" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="recurring" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="settings" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="calendar" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="register" options={{ animation: 'slide_from_right' }} />
        </Stack>
      </ToastProvider>
    </AuthProvider>
  );
}
