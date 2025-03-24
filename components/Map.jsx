import React, { forwardRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import MapView, { Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import ParkingSpotMarker from './ParkingSpotMarker';
import CustomLocationMarker from './CustomLocationMarker';

const Map = forwardRef(({
  location,
  isCustomLocation,
  searchRadius,
  parkingSpots,
  onMapPress,
  onMapLongPress,
  onParkingSelected,
  selectedParking,
  onRefreshLocation
}, ref) => {
  // Make sure parkingSpots is an array
  const spots = Array.isArray(parkingSpots) ? parkingSpots : [];
  
  // Make sure we have a valid location
  if (!location || typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
    return (
      <View style={[styles.map, styles.errorContainer]}>
        <Text style={styles.errorText}>Invalid location data</Text>
      </View>
    );
  }

  // Filter out spots with invalid coordinates
  const validSpots = spots.filter(spot => {
    const isValid = spot && 
      typeof spot.latitude === 'number' && 
      typeof spot.longitude === 'number' &&
      !isNaN(spot.latitude) && 
      !isNaN(spot.longitude);
    
    return isValid;
  });

  return (
    <View style={styles.container}>
      <MapView
        ref={ref}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        region={location}
        showsUserLocation={!isCustomLocation}
        showsMyLocationButton={false} // We'll use our custom button instead
        initialRegion={location}
        onPress={onMapPress}
        onLongPress={onMapLongPress}
      >
        {isCustomLocation && (
          <CustomLocationMarker location={location} />
        )}
        
        <Circle
          center={location}
          radius={searchRadius * 1000}
          fillColor="rgba(0, 122, 255, 0.1)"
          strokeColor="rgba(0, 122, 255, 0.3)"
          strokeWidth={1}
        />
        
        {validSpots.length > 0 ? (
          validSpots.map((parking) => (
            <ParkingSpotMarker
              key={parking.id || `parking-${Math.random()}`}
              parking={parking}
              onPress={() => onParkingSelected(parking)}
              isSelected={selectedParking && selectedParking.id === parking.id}
            />
          ))
        ) : (
          <Circle
            center={location}
            radius={100}
            fillColor="rgba(255, 0, 0, 0.1)"
            strokeColor="rgba(255, 0, 0, 0.5)"
            strokeWidth={2}
          />
        )}
      </MapView>
      
      {/* Custom location button */}
      <TouchableOpacity 
        style={styles.myLocationButton}
        onPress={onRefreshLocation}
      >
        <Ionicons name="locate" size={24} color="#007AFF" />
      </TouchableOpacity>
      
      {validSpots.length > 0 && (
        <View style={styles.spotCountContainer}>
          <Text style={styles.spotCountText}>
            {validSpots.length} parking spot{validSpots.length !== 1 ? 's' : ''} found
          </Text>
        </View>
      )}
    </View>
  );
});

Map.displayName = 'Map';

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  myLocationButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: 'white',
    borderRadius: 30,
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  spotCountContainer: {
    position: 'absolute',
    top: 100,
    alignSelf: 'center',
    backgroundColor: 'white',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  spotCountText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
    padding: 20,
  }
});

export default Map; 