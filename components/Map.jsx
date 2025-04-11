import React, { forwardRef, useEffect, useRef, useCallback, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions, Platform, ActivityIndicator } from 'react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE, Callout } from 'react-native-maps';

const { height } = Dimensions.get('window');

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
  const markerRefs = useRef({});
  const [zoomLevel, setZoomLevel] = useState(15);

  useEffect(() => {
    if (selectedParking && selectedParking.id && markerRefs.current[selectedParking.id]) {
      setTimeout(() => {
        markerRefs.current[selectedParking.id]?.showCallout();
      }, 300);
    }
  }, [selectedParking]);

  const handleRegionChange = (region) => {
    const zoom = Math.round(Math.log2(360 / region.latitudeDelta));
    setZoomLevel(zoom);
  };

  if (!location) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }
  const validSpots = Array.isArray(parkingSpots) ? parkingSpots.filter(spot =>
    spot && spot.latitude && spot.longitude &&
    !isNaN(spot.latitude) && !isNaN(spot.longitude)
  ) : [];

  const getMarkerSize = () => {
    if (zoomLevel < 12) return 20;
    if (zoomLevel < 14) return 24;
    return 30;
  };

  const markerSize = getMarkerSize();
  const iconSize = markerSize * 0.55;

  return (
    <View style={styles.container}>
      <MapView
        ref={ref}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: searchRadius * 0.1,
          longitudeDelta: searchRadius * 0.1,
        }}
        onPress={onMapPress}
        onLongPress={onMapLongPress}
        showsUserLocation={!isCustomLocation}
        onRegionChangeComplete={handleRegionChange}
      >

        <Circle
          center={{
            latitude: location.latitude,
            longitude: location.longitude,
          }}
          radius={searchRadius * 1000}
          strokeWidth={2}
          strokeColor="rgba(0, 122, 255, 0.5)"
          fillColor="rgba(0, 122, 255, 0.15)"
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
            icon={require('../assets/car.png')}
          />
        ))}
      </MapView>

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
    bottom: height * 0.18,
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
  parkingMarker: {
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
  availabilityDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CD964',
    borderWidth: 1,
    borderColor: '#fff',
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