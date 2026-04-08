// src/components/MainPager.tsx
import React, { useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import PagerView from 'react-native-pager-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import InfoScreen from '../screens/InfoScreen';
import PaymentsScreen from '../screens/PaymentScreen';
import { COLORS } from '../constants/Theme';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const MainPager = () => {
  const [pageIndex, setPageIndex] = useState(0);
  const navigation = useNavigation();
  const insets = useSafeAreaInsets(); // ← Obtenemos los insets del sistema

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <PagerView
        style={styles.pager}
        initialPage={0}
        onPageSelected={e => setPageIndex(e.nativeEvent.position)}
      >
        <View key="1" style={styles.page}>
          <InfoScreen navigation={navigation} />
        </View>
        <View key="2" style={styles.page}>
          <PaymentsScreen />
        </View>
      </PagerView>

      {/* Indicadores de página (dots) */}
      <View
        style={[
          styles.dotsContainer,
          { paddingBottom: insets.bottom > 0 ? 8 : 10 },
        ]}
      >
        <View style={[styles.dot, pageIndex === 0 ? styles.activeDot : null]} />
        <View style={[styles.dot, pageIndex === 1 ? styles.activeDot : null]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  pager: {
    flex: 1,
    width,
  },
  page: {
    flex: 1,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
    // marginTop: -20,
    // paddingTop: 1,
    backgroundColor: '#F8FAFC', // mismo color de fondo para que se vea limpio
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.secondary,
    marginHorizontal: 5,
  },
  activeDot: {
    backgroundColor: COLORS.primary,
    width: 10,
    height: 10,
  },
});

export default MainPager;
