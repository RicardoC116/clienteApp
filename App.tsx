/* eslint-disable @typescript-eslint/no-explicit-any */
// App.tsx
import React, { useEffect, useRef, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  registerForPushNotificationsAsync,
  setupNotificationListener,
} from './src/services/notifications';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigationRef = useRef<any>(null);

  // Verificar login
  useEffect(() => {
    const checkLogin = async () => {
      const debtorId = await AsyncStorage.getItem('debtorId');
      setIsLoggedIn(!!debtorId);
      setLoading(false);
    };
    checkLogin();
  }, []);

  // Configurar notificaciones push
  useEffect(() => {
    const initPush = async () => {
      const debtorId = await AsyncStorage.getItem('debtorId');
      if (debtorId) {
        await registerForPushNotificationsAsync();
      }
    };

    initPush();

    const subscription = setupNotificationListener(navigationRef);

    return () => subscription.remove();
  }, []);

  if (loading) {
    return null;
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <AppNavigator initialRouteName={isLoggedIn ? 'Main' : 'Login'} />
    </NavigationContainer>
  );
}
