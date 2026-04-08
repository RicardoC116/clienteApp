/* eslint-disable @typescript-eslint/no-explicit-any */
// src/screens/InfoScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Modal,
  Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import { Deudor } from '../types';
import Card from '../components/Card';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as OfflineCache from '../services/offlineCache';

const InfoScreen = ({ navigation }: { navigation: any }) => {
  const [deudor, setDeudor] = useState<Deudor | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showRefreshModal, setShowRefreshModal] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [showWhatsAppHelpModal, setShowWhatsAppHelpModal] = useState(false);
  // Formato de dinero
  const formatCurrency = (value: string | number): string => {
    const num = parseFloat(String(value || 0));
    return num.toLocaleString('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
    });
  };

  // Función para cargar datos (con opción de forzar refresh)

  const loadData = async (forceRefresh = false) => {
    setLoading(true);
    const online = await OfflineCache.isOnline();

    try {
      if (online && (forceRefresh || (await OfflineCache.isWiFi()))) {
        // Actualizar solo en WiFi o cuando se fuerza refresh
        const debtorId = await AsyncStorage.getItem('debtorId');
        if (!debtorId) throw new Error('No se encontró ID del deudor');

        const response = await api.get(`/deudores/${debtorId}`);
        const data: Deudor = response.data;

        setDeudor(data);
        setLastUpdated(new Date().toISOString());
        setIsOffline(false);

        // Guardar en caché (solo deudor)
        await OfflineCache.saveToCache(data, []);
      } else {
        // Modo offline o datos móviles → usar caché
        const cached = await OfflineCache.loadFromCache();
        if (cached?.deudor) {
          setDeudor(cached.deudor);
          setLastUpdated(cached.lastUpdated);
        }
        setIsOffline(!online);
      }
    } catch (error: any) {
      console.error('Error al cargar datos del cliente:', error);
      const cached = await OfflineCache.loadFromCache();
      if (cached?.deudor) {
        setDeudor(cached.deudor);
        setLastUpdated(cached.lastUpdated);
        setIsOffline(true);
      } else {
        Alert.alert('Sin conexión', 'No hay datos guardados disponibles.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Función para abrir WhatsApp - Versión más simple y estable
  const openWhatsApp = async () => {
    const phone = '5212381765393'; // ← Cambia solo este número por el real

    // Opción 1: Abrir chat directamente (la más estable)
    const url = `https://wa.me/${phone}`;

    console.log('Intentando abrir WhatsApp:', url);

    try {
      const supported = await Linking.canOpenURL(url);
      console.log('¿URL soportada?', supported);

      if (supported) {
        await Linking.openURL(url);
      } else {
        // Opción 2: Fallback abriendo en navegador
        Alert.alert(
          'WhatsApp',
          'Se abrirá WhatsApp en tu navegador. ¿Deseas continuar?',
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Abrir',
              onPress: () => Linking.openURL(url),
            },
          ],
        );
      }
    } catch (error) {
      console.error('Error al abrir WhatsApp:', error);
      Alert.alert('Error', 'No se pudo abrir WhatsApp.');
    }
  };

  // Mostrar modal de ayuda la primera vez
  const handleWhatsAppPress = async () => {
    // Verificamos si ya vio la ayuda
    const hasSeenWhatsAppHelp = await AsyncStorage.getItem(
      'hasSeenWhatsAppHelp',
    );

    if (!hasSeenWhatsAppHelp) {
      setShowWhatsAppHelpModal(true);
      await AsyncStorage.setItem('hasSeenWhatsAppHelp', 'true');
    } else {
      // Si ya lo vio, abre WhatsApp directamente
      openWhatsApp();
    }
  };

  useEffect(() => {
    const init = async () => {
      await loadData();
      // Modal informativo solo la primera vez
      const hasSeen = await AsyncStorage.getItem('hasSeenInfoRefreshModal');
      if (!hasSeen) {
        setShowRefreshModal(true);
        await AsyncStorage.setItem('hasSeenInfoRefreshModal', 'true');
      }
    };
    init();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData(true); // forceRefresh = true
    setRefreshing(false);
  }, []);

  const handleLogout = async () => {
    await AsyncStorage.multiRemove([
      'debtorId',
      'contractNumber',
      'hasSeenInfoRefreshModal',
    ]);
    navigation.navigate('Login');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Cargando información...</Text>
      </SafeAreaView>
    );
  }

  if (!deudor) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.emptyText}>No hay datos disponibles.</Text>
      </SafeAreaView>
    );
  }

  const cargo =
    parseFloat(deudor.total_to_pay || '0') - parseFloat(deudor.amount || '0');
  const saldoPendiente = parseFloat(deudor.balance || '0');

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
        contentContainerStyle={{
          flexGrow: 1,
        }}
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
        {/* Header con nombre del cliente */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={32} color="#fff" />
          </TouchableOpacity>
          <Text
            style={styles.headerTitle}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {deudor.name || 'Información'}
          </Text>

          {/* Botón para abrir WhatsApp */}
          <TouchableOpacity
            style={styles.whatsappButton}
            onPress={handleWhatsAppPress}
          >
            <Ionicons name="logo-whatsapp" size={24} color="#fff" />
          </TouchableOpacity>
          {/* <View style={{ width: 32 }} /> */}
        </View>

        <View style={styles.content}>
          {/* Saldo Pendiente destacado */}
          <View style={styles.saldoCard}>
            <Text style={styles.saldoLabel}>Saldo Pendiente</Text>
            <Text
              style={[
                styles.saldoAmount,
                { color: saldoPendiente > 0 ? '#EF4444' : '#10B981' },
              ]}
            >
              {formatCurrency(saldoPendiente)}
            </Text>
            {saldoPendiente <= 0 && (
              <Text style={styles.liquidadoText}>¡Préstamo Liquidado! 🎉</Text>
            )}
          </View>

          {/* Datos del Cliente */}
          <Card title="Datos del Cliente">
            <View style={styles.row}>
              <Ionicons name="location-outline" size={22} color="#10B981" />
              <Text style={styles.label}>
                <Text style={styles.labelBold}>Dirección: </Text>
                {deudor.direccion || 'N/A'}
              </Text>
            </View>
            <View style={styles.row}>
              <Ionicons name="call-outline" size={22} color="#10B981" />
              <Text style={styles.label}>
                <Text style={styles.labelBold}>Teléfono: </Text>
                {deudor.numero_telefono || 'N/A'}
              </Text>
            </View>
            <View style={styles.row}>
              <Ionicons
                name="document-text-outline"
                size={22}
                color="#10B981"
              />
              <Text style={styles.label}>
                <Text style={styles.labelBold}>No. de Contrato: </Text>
                {deudor.contract_number || 'N/A'}
              </Text>
            </View>
          </Card>

          {/* Datos del Aval */}
          <Card title="Datos del Aval">
            <View style={styles.row}>
              <Ionicons name="shield-outline" size={22} color="#3B82F6" />
              <Text style={styles.label}>
                <Text style={styles.labelBold}>Nombre: </Text>
                {deudor.aval || 'N/A'}
              </Text>
            </View>
            <View style={styles.row}>
              <Ionicons name="location-outline" size={22} color="#3B82F6" />
              <Text style={styles.label}>
                <Text style={styles.labelBold}>Dirección: </Text>
                {deudor.aval_direccion || 'N/A'}
              </Text>
            </View>
            <View style={styles.row}>
              <Ionicons name="call-outline" size={22} color="#3B82F6" />
              <Text style={styles.label}>
                <Text style={styles.labelBold}>Teléfono: </Text>
                {deudor.aval_phone || 'N/A'}
              </Text>
            </View>
          </Card>

          {/* Datos del Préstamo */}
          <Card title="Datos del Préstamo">
            <View style={styles.loanContainer}>
              <View style={styles.column}>
                <View style={styles.row}>
                  <Ionicons name="calendar-outline" size={22} color="#10B981" />
                  <Text style={styles.label}>
                    <Text style={styles.labelBold}>Fecha: </Text>
                    {'\n'}
                    {deudor.createdAt
                      ? new Date(deudor.createdAt).toLocaleDateString('es-MX', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })
                      : 'N/A'}
                  </Text>
                </View>
                <View style={styles.row}>
                  <Ionicons name="repeat-outline" size={22} color="#10B981" />
                  <Text style={styles.label}>
                    <Text style={styles.labelBold}>Tipo: </Text>
                    {'\n'}
                    <Text style={{ textTransform: 'capitalize' }}>
                      {deudor.payment_type || 'N/A'}
                    </Text>
                  </Text>
                </View>
                <View style={styles.row}>
                  <Ionicons name="cash-outline" size={22} color="#10B981" />
                  <Text style={styles.label}>
                    <Text style={styles.labelBold}>Primer Pago: </Text>
                    {'\n'}
                    {formatCurrency(deudor.first_payment)}
                  </Text>
                </View>
                <View style={styles.row}>
                  <Ionicons
                    name="trending-up-outline"
                    size={22}
                    color="#10B981"
                  />
                  <Text style={styles.label}>
                    <Text style={styles.labelBold}>Pago Sugerido: </Text>
                    {'\n'}
                    {formatCurrency(deudor.suggested_payment)}
                  </Text>
                </View>
              </View>

              <View style={styles.column}>
                <View style={styles.row}>
                  <Text style={styles.label}>
                    <Text style={styles.labelBold}>Monto Otorgado: </Text>
                    {'\n'}
                    {formatCurrency(deudor.amount)}
                  </Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>
                    <Text style={styles.labelBold}>Cargo: </Text>
                    {'\n'}
                    {formatCurrency(cargo)}
                  </Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>
                    <Text style={styles.labelBold}>Total a Pagar: </Text>
                    {'\n'}
                    {formatCurrency(deudor.total_to_pay)}
                  </Text>
                </View>
              </View>
            </View>
          </Card>
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
            <Text style={styles.modalTitle}>Mantén tus datos al día</Text>
            <Text style={styles.modalText}>
              Desliza hacia abajo en cualquier momento para actualizar la
              información. Útil si ves que algo no se refleja correctamente.
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

      {/* Modal de ayuda de WhatsApp - solo primera vez */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showWhatsAppHelpModal}
        onRequestClose={() => setShowWhatsAppHelpModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowWhatsAppHelpModal(false)}
            >
              <Ionicons name="close-circle" size={32} color="#EF4444" />
            </TouchableOpacity>

            <Ionicons
              name="logo-whatsapp"
              size={60}
              color="#25D366"
              style={{ marginBottom: 16 }}
            />

            <Text style={styles.modalTitle}>Contacto por WhatsApp</Text>
            <Text style={styles.modalText}>
              Presionando este botón podrás hablar directamente con la agencia
              para cualquier duda sobre tu préstamo.
            </Text>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setShowWhatsAppHelpModal(false);
                openWhatsApp(); // Abre WhatsApp después de cerrar el modal
              }}
            >
              <Text style={styles.modalButtonText}>Abrir WhatsApp</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16, color: '#64748B' },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#64748B',
    marginTop: 40,
  },

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
    paddingVertical: 5,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  logoutButton: { padding: 4 },
  whatsappButton: { padding: 4 },

  content: { padding: 16 },

  saldoCard: {
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
  saldoLabel: { fontSize: 15, color: '#64748B', marginBottom: 4 },
  saldoAmount: { fontSize: 32, fontWeight: '700', marginBottom: 6 },
  liquidadoText: { color: '#10B981', fontWeight: '600', marginTop: 4 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
    marginHorizontal: 10,
  },
  label: { fontSize: 16, color: '#1E2937', flex: 1 },
  labelBold: { fontWeight: '700' },

  loanContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  column: { flex: 1, gap: 8 },

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

export default InfoScreen;
