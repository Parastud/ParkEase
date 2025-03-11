import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Marker, Callout } from 'react-native-maps';

const ParkingSpotMarker = ({ parking, onPress }) => {
  return (
    <Marker
      coordinate={{
        latitude: parking.latitude,
        longitude: parking.longitude
      }}
      onPress={onPress}
      pinColor="red"
    >
      <Callout>
        <View style={styles.calloutContainer}>
          <Text style={styles.calloutTitle}>{parking.title}</Text>
          <Text style={styles.calloutDescription}>{parking.description}</Text>
          <Text style={styles.calloutPrice}>Price: {parking.price}</Text>
          <Text style={styles.calloutSpots}>Available spots: {parking.spots}</Text>
          <Text style={styles.calloutDistance}>{parking.distance.toFixed(2)} km away</Text>
        </View>
      </Callout>
    </Marker>
  );
};

const styles = StyleSheet.create({
  calloutContainer: {
    width: 200,
    padding: 10,
  },
  calloutTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  calloutDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  calloutPrice: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 5,
  },
  calloutSpots: {
    fontSize: 14,
    color: '#28a745',
    marginBottom: 5,
  },
  calloutDistance: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
});

export default ParkingSpotMarker; 