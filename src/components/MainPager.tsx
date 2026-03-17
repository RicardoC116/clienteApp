// Componente principal que contiene el PagerView para navegar entre InfoScreen y PaymentScreen
import React, { useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import PagerView from 'react-native-pager-view';
import InfoScreen from '../screens/InfoScreen';
import PaymentsScreen from '../screens/PaymentScreen';
import { COLORS } from '../constants/Theme';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const MainPager = () => {
  const [pageIndex, setPageIndex] = useState(0);
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <PagerView
        style={styles.pager}
        initialPage={0}
        onPageSelected={e => setPageIndex(e.nativeEvent.position)}
      >
        <View key="1">
          <InfoScreen navigation={navigation} />
        </View>
        <View key="2">
          <PaymentsScreen />
        </View>
      </PagerView>
      <View style={styles.dotsContainer}>
        <View style={[styles.dot, pageIndex === 0 ? styles.activeDot : null]} />
        <View style={[styles.dot, pageIndex === 1 ? styles.activeDot : null]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  pager: { flex: 1, width },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 10,
    marginBottom: 5,
  },

  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.secondary,
    marginHorizontal: 5,
  },
  activeDot: { backgroundColor: COLORS.primary },
});

export default MainPager;
