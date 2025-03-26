import React, { forwardRef, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions, Platform } from 'react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE, Callout } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const Map = forwardRef(({
  location,
  parkingSpots,
  searchRadius,
  onParkingSelected,
  selectedParking,
  onMapPress,
  onMapLongPress,
  isCustomLocation,
  onRefreshLocation
}, ref) => {
  // Refs for marker components
  const markerRefs = useRef({});
  
  // Effect to show callout for selected parking
  useEffect(() => {
    if (selectedParking && selectedParking.id && markerRefs.current[selectedParking.id]) {
      // Short delay to ensure marker is ready
      setTimeout(() => {
        markerRefs.current[selectedParking.id]?.showCallout();
      }, 300);
    }
  }, [selectedParking]);
  
  // Loading state
  if (!location) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  // Basic validation for parking spots
  const validSpots = Array.isArray(parkingSpots) ? parkingSpots.filter(spot => 
    spot && spot.latitude && spot.longitude && 
    !isNaN(spot.latitude) && !isNaN(spot.longitude)
  ) : [];

  return (
    <View style={styles.container}>
      <MapView
        ref={ref}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        onPress={onMapPress}
        onLongPress={onMapLongPress}
        showsUserLocation={!isCustomLocation}
      >
        {/* User custom location marker */}
        {isCustomLocation && (
          <Marker
            coordinate={{
              latitude: location.latitude,
              longitude: location.longitude,
            }}
            title="Selected Location"
          >
            <View style={styles.locationMarker} />
          </Marker>
        )}

        {/* Search radius circle */}
        <Circle
          center={{
            latitude: location.latitude,
            longitude: location.longitude,
          }}
          radius={searchRadius * 1000} // Convert km to meters
          strokeWidth={1}
          strokeColor="rgba(0, 122, 255, 0.3)"
          fillColor="rgba(0, 122, 255, 0.1)"
        />
        {validSpots.map((spot, index) => (
          <Marker
            ref={ref => { markerRefs.current[spot.id || `parking-${index}`] = ref }}
            key={spot.id || `parking-${index}`}
            coordinate={{
              latitude: spot.latitude,
              longitude: spot.longitude,
            }}
            title={spot.title || "Parking Spot"}
            description={`${spot.availableSpots || 0} of ${spot.totalSpots || 0} spots available${spot.distance ? ` • ${spot.distance.toFixed(1)} km away` : ''}`}
            onPress={() => onParkingSelected(spot)}
          >
            <View style={[
              styles.parkingMarker,
              selectedParking?.id === spot.id && styles.selectedParkingMarker
            ]}>
              <Ionicons 
                name="car" 
                size={16} 
                color={selectedParking?.id === spot.id ? '#ffffff' : '#007AFF'} 
              />
            </View>
          </Marker>
        ))}
      </MapView>
      <TouchableOpacity 
        style={styles.myLocationButton}
        onPress={onRefreshLocation}
      >
        <Ionicons name="locate" size={24} color="#007AFF" />
      </TouchableOpacity>

      {/* Display parking count */}
      {validSpots.length > 0 && (
        <View style={styles.spotCountContainer}>
          <Text style={styles.spotCountText}>
            {validSpots.length} Parking Spot{validSpots.length !== 1 ? 's' : ''} Found
          </Text>
        </View>
      )}
    </View>
  );
});

Map.displayName = 'Map';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
  },
  myLocationButton: {
    position: 'absolute',
    bottom: height * 0.18, // Positioned above the bottom sheet handle
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
  locationMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 122, 255, 0.3)',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  parkingMarker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#007AFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  selectedParkingMarker: {
    backgroundColor: '#007AFF',
    borderColor: '#ffffff',
  },
  spotCountContainer: {
    position: 'absolute',
    top: 20,
    alignSelf: 'center',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 8,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  spotCountText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
});

export default Map; 