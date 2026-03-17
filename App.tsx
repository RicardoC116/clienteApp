// App.tsx
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkLogin = async () => {
      const debtorId = await AsyncStorage.getItem('debtorId');
      setIsLoggedIn(!!debtorId);
      setLoading(false);
    };
    checkLogin();
  }, []);

  if (loading) {
    return null;
  }

  return (
    <NavigationContainer>
      <AppNavigator initialRouteName={isLoggedIn ? 'Main' : 'Login'} />
    </NavigationContainer>
  );
}
