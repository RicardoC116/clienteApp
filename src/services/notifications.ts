/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable prettier/prettier */
// src/services/notifications.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

export async function registerForPushNotificationsAsync() {
    if (!Device.isDevice) {
        console.warn('Notificaciones push solo funcionan en dispositivos físicos');
        return null;
    }

    try {
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#10B981',
            });
        }

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            Alert.alert('Permiso denegado', 'No podrás recibir notificaciones de nuevos pagos.');
            return null;
        }

        const projectId = Constants.expoConfig?.extra?.eas?.projectId;
        if (!projectId) {
            throw new Error('No se encontró projectId. Revisa app.json');
        }

        const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
        const token = tokenData.data;

        console.log('✅ Push Token obtenido:', token);

        await AsyncStorage.setItem('expoPushToken', token);

        const debtorId = await AsyncStorage.getItem('debtorId');
        if (debtorId) {
            await api.post('/deudores/update-push-token', {
                debtorId,
                pushToken: token,
            });
            console.log('✅ Token enviado al backend correctamente');
        }

        return token;
    } catch (error: any) {
        console.error('❌ Error al registrar notificaciones push:', error.message);
        Alert.alert('Error', 'No se pudo registrar las notificaciones.');
        return null;
    }
}

export function setupNotificationListener(navigationRef: React.RefObject<any>) {
    return Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        console.log('📬 Notificación tocada con data:', data);

        if (data?.screen === 'Pagos') {
            navigationRef.current?.navigate('Main', { screen: 'Pagos' });
        }
    });
}