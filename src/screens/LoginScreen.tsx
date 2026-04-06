/* eslint-disable @typescript-eslint/no-explicit-any */
// src/screens/LoginScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../constants/Theme';
import api from '../services/api';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { registerForPushNotificationsAsync } from '../services/notifications';

// Función para normalizar texto: quita acentos, pasa a minúsculas y limpia espacios
const normalizeString = (str: string): string => {
  return str
    .normalize('NFD') // Descompone caracteres con acentos
    .replace(/[\u0300-\u036f]/g, '') // Elimina los diacríticos (acentos)
    .toLowerCase() // Todo minúsculas
    .trim() // Quita espacios al inicio/final
    .replace(/\s+/g, ' '); // Reduce múltiples espacios a uno solo
};

const LoginScreen = ({ navigation }: { navigation: any }) => {
  const [contractNumber, setContractNumber] = useState('');
  const [nombre, setNombre] = useState('');
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalText, setModalText] = useState('');

  // Estados para mostrar modal solo la primera vez
  const [hasShownNombreHelp, setHasShownNombreHelp] = useState(false);
  const [hasShownContratoHelp, setHasShownContratoHelp] = useState(false);

  const showHelpModal = (text: string, type: 'nombre' | 'contrato') => {
    if (
      (type === 'nombre' && !hasShownNombreHelp) ||
      (type === 'contrato' && !hasShownContratoHelp)
    ) {
      setModalText(text);
      setModalVisible(true);

      if (type === 'nombre') setHasShownNombreHelp(true);
      if (type === 'contrato') setHasShownContratoHelp(true);
    }
  };

  const handleLogin = async () => {
    const trimmedContract = contractNumber.trim();
    const trimmedNombre = nombre.trim();

    if (!trimmedContract || !trimmedNombre) {
      Alert.alert(
        'Campos requeridos',
        'Por favor ingresa tu nombre y número de contrato',
      );
      return;
    }

    setLoading(true);
    try {
      const response = await api.get('/deudores');
      const deudores: any[] = response.data;
      // console.log('Deudores obtenidos:', deudores);

      // Normalizamos tanto el input del usuario como el nombre del backend
      const normalizedInputNombre = normalizeString(trimmedNombre);

      const deudorEncontrado = deudores.find(
        (d: any) =>
          d.contract_number === trimmedContract && // Contrato exacto
          normalizeString(d.name) === normalizedInputNombre, // Nombre normalizado
      );

      if (!deudorEncontrado) {
        Alert.alert(
          'No encontrado',
          'Nombre o número de contrato incorrecto. Intenta de nuevo.',
        );
        return;
      }

      await AsyncStorage.setItem('debtorId', deudorEncontrado.id.toString());
      await AsyncStorage.setItem(
        'contractNumber',
        deudorEncontrado.contract_number,
      );
      await registerForPushNotificationsAsync();

      navigation.replace('Main');
    } catch (error: any) {
      console.error('Error en login:', error);
      Alert.alert(
        'Error',
        error.response?.data?.error ||
          'No se pudo conectar. Revisa tu internet.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.iconContainer}>
          <Ionicons
            name="shield-checkmark"
            size={100}
            // color="#3B82F6" // Virsac
            color="#10B981" // Chilac
          />
        </View>

        <Text style={styles.title}>Bienvenido</Text>
        <Text style={styles.subtitle}>
          Ingresa tus datos para ver tu información
        </Text>

        <View style={styles.inputWrapper}>
          <Ionicons
            name="person-outline"
            size={24}
            color="#10B981"
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="Nombre completo"
            value={nombre}
            onChangeText={setNombre}
            autoCapitalize="words"
            onFocus={() =>
              showHelpModal(
                'Escribe tu nombre exactamente como aparece en tu contrato',
                'nombre',
              )
            }
          />
        </View>

        <View style={styles.inputWrapper}>
          <Ionicons
            name="document-text-outline"
            size={24}
            color="#10B981"
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="Número de contrato"
            value={contractNumber}
            onChangeText={setContractNumber}
            keyboardType="numeric"
            autoCapitalize="none"
            onFocus={() =>
              showHelpModal(
                'Ingresa el número de contrato que te asignaron',
                'contrato',
              )
            }
          />
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="large" color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Iniciar Sesión</Text>
          )}
        </TouchableOpacity>
      </KeyboardAvoidingView>

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Ionicons name="close-circle" size={32} color="#EF4444" />
            </TouchableOpacity>

            <Ionicons
              name="information-circle"
              size={60}
              color="#10B981"
              style={{ marginBottom: 16 }}
            />
            <Text style={styles.modalTitle}>Ayuda rápida</Text>
            <Text style={styles.modalText}>{modalText}</Text>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// Los estilos permanecen iguales a los que ya tenías
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  keyboardView: { flex: 1, justifyContent: 'center', paddingHorizontal: 30 },
  iconContainer: { alignItems: 'center', marginBottom: 30 },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#10B981',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 40,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 20,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, height: 56, fontSize: 16, color: '#1E2937' },
  button: {
    backgroundColor: '#10B981',
    borderRadius: 16,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '700' },

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

export default LoginScreen;
