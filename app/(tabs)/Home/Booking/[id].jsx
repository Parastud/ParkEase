import { StyleSheet, Text, View,Modal,Button } from 'react-native'
import React, { useEffect, useState,useContext } from 'react'
import { Link, useLocalSearchParams } from 'expo-router'
import { FIXED_PARKING_SPOTS } from '../../../../constants/parkingData'
import { GlobalState } from '../../../../constants/usecontext'
import { Redirect } from 'expo-router'
import Ionicons from '@expo/vector-icons/Ionicons';

const Booking = () => {
  const { id } = useLocalSearchParams();
  const [parkingSpot, setParkingSpot] = useState(null);
  const {modalVisible, setModalVisible} = useContext(GlobalState)
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
    <View>

      {!modalVisible? <Redirect href="/Home"/>:""}
            <Modal
              animationType="slide"
              transparent={true}
              visible={modalVisible}
              onRequestClose={() => setModalVisible(false)} // Required for Android
            >
    <View style={styles.container}>
    <Ionicons name="arrow-back-circle" size={50} color={"gray"} onPress={()=>{setModalVisible(false)}}/>
      <Text style={styles.title}>{parkingSpot.title}</Text>
      <Text style={styles.details}>Location: {parkingSpot.description}</Text>
      <Text style={styles.details}>Price: {parkingSpot.price}</Text>
      <Text style={styles.details}>Available Spots: {parkingSpot.spots}</Text>
      <Link href="../" asChild>
      </Link>
    </View>
    </Modal>
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