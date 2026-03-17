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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../constants/Theme';
import api from '../services/api';
import { Deudor } from '../types';
import Card from '../components/Card';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const InfoScreen = ({ navigation }: { navigation: any }) => {
  const [deudor, setDeudor] = useState<Deudor | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showRefreshModal, setShowRefreshModal] = useState(false);

  // Formato de dinero: $1,234.56
  const formatCurrency = (value: string | number): string => {
    const num = parseFloat(String(value || 0));
    return num.toLocaleString('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
    });
  };

  // Función para cargar/actualizar datos
  const fetchDeudor = async () => {
    try {
      const debtorId = await AsyncStorage.getItem('debtorId');
      if (!debtorId) throw new Error('No se encontró ID del deudor');

      const response = await api.get(`/deudores/${debtorId}`);
      setDeudor(response.data);
    } catch (error: any) {
      console.error('Error al cargar datos del cliente:', error);
      Alert.alert(
        'Error',
        'No se pudieron cargar los datos. Verifica tu conexión o número de contrato.',
      );
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchDeudor();
      setLoading(false);

      // Chequeo del modal SOLO después de cargar datos
      const hasSeen = await AsyncStorage.getItem('hasSeenInfoRefreshModal');
      console.log('¿Ha visto el modal de refresh?', hasSeen);
      if (!hasSeen) {
        setShowRefreshModal(true);
        await AsyncStorage.setItem('hasSeenInfoRefreshModal', 'true');
      }
    };

    loadData();
  }, []);

  // Pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDeudor();
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
        <Text>No se encontraron datos del cliente.</Text>
      </SafeAreaView>
    );
  }

  const cargo =
    parseFloat(deudor.total_to_pay || '0') - parseFloat(deudor.amount || '0');
  const saldoPendiente = parseFloat(deudor.balance || '0');

  return (
    <SafeAreaView style={styles.container}>
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
        {/* Header con NOMBRE DEL CLIENTE */}
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
          <View style={{ width: 32 }} />
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16, color: '#64748B' },

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

  // Modal de refresh
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
