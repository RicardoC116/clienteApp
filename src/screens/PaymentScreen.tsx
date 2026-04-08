/* eslint-disable @typescript-eslint/no-explicit-any */
// src/screens/PaymentsScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  RefreshControl,
  Modal,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import { Deudor, Cobro } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as OfflineCache from '../services/offlineCache';

type CobroConDatos = (
  | Cobro
  | {
      id: string;
      amount: string;
      payment_date: string;
      isFirstPayment: boolean;
    }
) & {
  numeroPago: number;
  balanceDespues: string;
};

const PaymentsScreen = ({ navigation }: { navigation: any }) => {
  const [deudor, setDeudor] = useState<Deudor | null>(null);
  const [cobros, setCobros] = useState<CobroConDatos[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showRefreshModal, setShowRefreshModal] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const formatCurrency = (value: string | number): string => {
    const num = parseFloat(String(value || 0));
    return num.toLocaleString('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
    });
  };

  const loadData = async (forceRefresh = false) => {
    setLoading(true);
    const online = await OfflineCache.isOnline();

    try {
      if (online && (forceRefresh || (await OfflineCache.isWiFi()))) {
        // Actualizar solo en WiFi o cuando se fuerza refresh
        const debtorId = await AsyncStorage.getItem('debtorId');
        if (!debtorId) throw new Error('No debtorId');

        // Cargar deudor
        const deudorRes = await api.get(`/deudores/${debtorId}`);
        const deudorData: Deudor = deudorRes.data;

        // Cargar cobros
        const cobrosRes = await api.get(`/cobros/deudor/${debtorId}`);
        const cobrosData: Cobro[] = cobrosRes.data || [];

        // Procesar pagos (primer pago + cobros)
        const firstPaymentEntry = {
          id: 'first-payment-ficticio',
          amount: deudorData.first_payment || '0',
          payment_date: deudorData.createdAt,
          isFirstPayment: true,
        };

        const allPagos = [firstPaymentEntry, ...cobrosData];
        allPagos.sort(
          (a, b) =>
            new Date(a.payment_date).getTime() -
            new Date(b.payment_date).getTime(),
        );

        let balanceInicial =
          parseFloat(deudorData.total_to_pay || '0') -
          parseFloat(deudorData.first_payment || '0');

        const pagosConDatos = allPagos.map((pago, index) => {
          if (index === 0 && pago.isFirstPayment) {
            return {
              ...pago,
              numeroPago: 1,
              balanceDespues: balanceInicial.toFixed(2),
            };
          }
          balanceInicial -= parseFloat(pago.amount || '0');
          return {
            ...pago,
            numeroPago: index + 1,
            balanceDespues: balanceInicial.toFixed(2),
          };
        });

        const processedCobros = [...pagosConDatos].reverse();

        setDeudor(deudorData);
        setCobros(processedCobros);
        setLastUpdated(new Date().toISOString());
        setIsOffline(false);

        // Guardar en caché
        await OfflineCache.saveToCache(deudorData, processedCobros);
      } else {
        // Modo offline o datos móviles → usar caché
        const cached = await OfflineCache.loadFromCache();
        if (cached?.deudor) {
          setDeudor(cached.deudor);
          setCobros(cached.cobros || []);
          setLastUpdated(cached.lastUpdated);
        }
        setIsOffline(!online);
      }
    } catch (error: any) {
      console.error('Error cargando pagos:', error);
      const cached = await OfflineCache.loadFromCache();
      if (cached?.deudor) {
        setDeudor(cached.deudor);
        setCobros(cached.cobros || []);
        setLastUpdated(cached.lastUpdated);
        setIsOffline(true);
      } else {
        Alert.alert('Sin conexión', 'No hay datos guardados disponibles.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      await loadData();
      const hasSeen = await AsyncStorage.getItem('hasSeenPaymentsRefreshModal');
      if (!hasSeen) {
        setShowRefreshModal(true);
        await AsyncStorage.setItem('hasSeenPaymentsRefreshModal', 'true');
      }
    };
    init();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData(true); // forceRefresh = true
    setRefreshing(false);
  }, []);

  const renderItem = ({ item }: { item: CobroConDatos }) => (
    <View style={styles.paymentRow}>
      <View style={styles.dateColumn}>
        <Ionicons name="calendar-outline" size={20} color="#10B981" />
        <Text style={styles.dateText}>
          {new Date(item.payment_date).toLocaleDateString('es-MX', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
          {item.isFirstPayment && ' (Primer Pago)'}
        </Text>
      </View>
      <Text style={styles.cell}>#{item.numeroPago}</Text>
      <Text style={[styles.cell, { fontWeight: '600', color: '#10B981' }]}>
        {formatCurrency(item.amount)}
      </Text>
      <Text style={styles.cell}>{formatCurrency(item.balanceDespues)}</Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Cargando historial...</Text>
      </SafeAreaView>
    );
  }

  const totalPagado = cobros.reduce(
    (sum, pago) => sum + parseFloat(pago.amount || '0'),
    0,
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Banner Offline */}
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={20} color="#fff" />
          <Text style={styles.offlineText}>
            Sin conexión • Datos del{' '}
            {new Date(lastUpdated).toLocaleDateString('es-MX')}
          </Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#10B981']}
            tintColor="#10B981"
            title="Actualizando..."
            titleColor="#10B981"
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="wallet-outline" size={28} color="#fff" />
          </View>
          <Text style={styles.headerTitle}>Historial de Pagos</Text>
          <View style={{ width: 32 }} />
        </View>

        <View style={styles.content}>
          {/* Resumen */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Pagado</Text>
            <Text style={styles.summaryAmount}>
              {formatCurrency(totalPagado)}
            </Text>
          </View>

          {/* Tabla de Pagos */}
          <View style={styles.tableHeader}>
            <Text style={styles.headerCell}>Fecha</Text>
            <Text style={styles.headerCell}>#Pago</Text>
            <Text style={styles.headerCell}>Monto</Text>
            <Text style={styles.headerCell}>Saldo Restante</Text>
          </View>

          {cobros.length === 0 ? (
            <Text style={styles.emptyText}>Aún no hay pagos registrados.</Text>
          ) : (
            <FlatList
              data={cobros}
              renderItem={renderItem}
              keyExtractor={item => item.id.toString()}
              scrollEnabled={false}
              contentContainerStyle={{ paddingBottom: 20 }}
            />
          )}
        </View>
      </ScrollView>

      {/* Modal informativo - solo primera vez */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showRefreshModal}
        onRequestClose={() => setShowRefreshModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowRefreshModal(false)}
            >
              <Ionicons name="close-circle" size={32} color="#EF4444" />
            </TouchableOpacity>
            <Ionicons
              name="refresh-circle"
              size={60}
              color="#10B981"
              style={{ marginBottom: 16 }}
            />
            <Text style={styles.modalTitle}>Mantén tu historial al día</Text>
            <Text style={styles.modalText}>
              Desliza hacia abajo para actualizar los pagos. Útil si un pago
              reciente no aparece aún.
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowRefreshModal(false)}
            >
              <Text style={styles.modalButtonText}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16, color: '#64748B' },

  offlineBanner: {
    backgroundColor: '#F59E0B',
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  offlineText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },

  header: {
    backgroundColor: '#10B981',
    paddingVertical: 7,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconContainer: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },

  content: { padding: 16 },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 5,
  },
  summaryLabel: { fontSize: 15, color: '#64748B', marginBottom: 6 },
  summaryAmount: { fontSize: 28, fontWeight: '700', color: '#10B981' },

  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#E0F2FE',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  headerCell: {
    flex: 1,
    fontWeight: '700',
    fontSize: 14,
    textAlign: 'center',
    color: '#1E40AF',
  },

  paymentRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
  },
  dateColumn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: { fontSize: 14, color: '#1E2937' },
  cell: {
    flex: 1,
    fontSize: 15,
    textAlign: 'center',
    color: '#1E2937',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#64748B',
    marginTop: 40,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  closeButton: { position: 'absolute', top: 12, right: 12 },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#10B981',
    marginBottom: 12,
  },
  modalText: {
    fontSize: 16,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  modalButton: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 40,
  },
  modalButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

export default PaymentsScreen;
