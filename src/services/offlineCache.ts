/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable prettier/prettier */
// src/services/offlineCache.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

const CACHE_KEYS = {
    DEUDOR: '@cached_deudor',
    COBROS: '@cached_cobros',
    LAST_UPDATE: '@cached_last_update',
};

export type CachedData = {
    deudor: any;
    cobros: any[];
    lastUpdated: string;
};

// Guardar datos en caché
export const saveToCache = async (deudor: any, cobros: any[]) => {
    const data = {
        deudor,
        cobros,
        lastUpdated: new Date().toISOString(),
    };

    try {
        await AsyncStorage.multiSet([
            [CACHE_KEYS.DEUDOR, JSON.stringify(deudor)],
            [CACHE_KEYS.COBROS, JSON.stringify(cobros)],
            [CACHE_KEYS.LAST_UPDATE, data.lastUpdated],
        ]);
    } catch (error) {
        console.error('Error guardando caché:', error);
    }
};

// Cargar datos desde caché
export const loadFromCache = async (): Promise<CachedData | null> => {
    try {
        const values = await AsyncStorage.multiGet([
            CACHE_KEYS.DEUDOR,
            CACHE_KEYS.COBROS,
            CACHE_KEYS.LAST_UPDATE,
        ]);

        const deudorStr = values[0][1];
        const cobrosStr = values[1][1];
        const lastUpdate = values[2][1];

        if (!deudorStr) return null;

        return {
            deudor: JSON.parse(deudorStr),
            cobros: cobrosStr ? JSON.parse(cobrosStr) : [],
            lastUpdated: lastUpdate || '',
        };
    } catch (error) {
        console.error('Error cargando caché:', error);
        return null;
    }
};

// Verificar conexión
export const isOnline = async (): Promise<boolean> => {
    const state = await NetInfo.fetch();
    return !!(state.isConnected && state.isInternetReachable);
};

// Verificar si está en WiFi
export const isWiFi = async (): Promise<boolean> => {
    const state = await NetInfo.fetch();
    return state.type === 'wifi';
};