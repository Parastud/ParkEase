import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const ParkingDetails = ({ parking, onBook, onNavigate }) => {
  if (!parking) return null;

  return (
    <View style={styles.parkingDetailContainer}>
      <View style={styles.parkingDetail}>
        <Text style={styles.parkingTitle}>{parking.title}</Text>
        <Text style={styles.parkingDescription}>{parking.description}</Text>
        <Text style={styles.parkingPrice}>Price: {parking.price}</Text>
        <Text style={styles.parkingSpots}>Available spots: {parking.spots}</Text>
        <Text style={styles.parkingDistance}>{parking.distance.toFixed(2)} km away</Text>
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.button, styles.bookButton]}
            onPress={onBook}
          >
            <Text style={styles.buttonText}>Book Now</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.button, styles.navigateButton]}
            onPress={onNavigate}
          >
            <Text style={styles.buttonText}>Navigate</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  parkingDetailContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    padding: 10,
  },
  parkingDetail: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  parkingTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  parkingDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  parkingPrice: {
    fontSize: 18,
    color: '#007AFF',
    marginBottom: 10,
  },
  parkingSpots: {
    fontSize: 16,
    color: '#28a745',
    marginBottom: 10,
  },
  parkingDistance: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 15,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  bookButton: {
    backgroundColor: '#007AFF',
  },
  navigateButton: {
    backgroundColor: '#28a745',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default ParkingDetails; 