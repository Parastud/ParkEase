import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Marker, Callout } from 'react-native-maps';

const ParkingSpotMarker = ({ parking, onPress, isSelected = false }) => {

  if (!parking) {
    return null;
  }
  

  const latitude = typeof parking.latitude === 'string' ? parseFloat(parking.latitude) : parking.latitude;
  const longitude = typeof parking.longitude === 'string' ? parseFloat(parking.longitude) : parking.longitude;
  
  if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
    return null;
  }
  

  let availableSpotsText = 'Unknown';
  if (typeof parking.availableSpots === 'number') {
    availableSpotsText = parking.availableSpots.toString();
  } else if (typeof parking.spots === 'number') {
    availableSpotsText = parking.spots.toString();
  }
  

  let priceDisplay = typeof parking.price === 'number' ? `₹ ${parking.price}/hour` : parking.price;
  if (!priceDisplay) {
    priceDisplay = 'Price not available';
  }
  
  return (
    <Marker
      coordinate={{
        latitude,
        longitude
      }}
      onPress={onPress}
      pinColor={isSelected ? "blue" : "red"}
    >
      <Callout>
        <View style={styles.calloutContainer}>
          <Text style={styles.calloutTitle}>{parking.title || 'Parking Spot'}</Text>
          <Text style={styles.calloutDescription}>{parking.description || 'No description available'}</Text>
          <Text style={styles.calloutPrice}>Price: {priceDisplay}</Text>
          <Text style={styles.calloutSpots}>Available spots: {availableSpotsText}</Text>
          {parking.distance && (
            <Text style={styles.calloutDistance}>{parking.distance.toFixed(2)} km away</Text>
          )}
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
