import { StyleSheet, Text, View } from 'react-native'
import React, { useEffect, useState } from 'react'
import { useLocalSearchParams } from 'expo-router'
import { FIXED_PARKING_SPOTS } from '../../../constants/parkingData'
const Booking = () => {
  const { id } = useLocalSearchParams();
  const [parkingSpot, setParkingSpot] = useState(null);

  useEffect(() => {
    const spot = FIXED_PARKING_SPOTS.find(spot => spot.id == id);
    setParkingSpot(spot);
  }, [id]);

  if (!parkingSpot) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading parking spot details...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{parkingSpot.title}</Text>
      <Text style={styles.details}>Location: {parkingSpot.address}</Text>
      <Text style={styles.details}>Price: ${parkingSpot.price}/hour</Text>
      <Text style={styles.details}>Available Spots: {parkingSpot.availableSpots}</Text>
    </View>
  );
}

export default Booking

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  details: {
    fontSize: 16,
    marginBottom: 10,
    color: '#666',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
})