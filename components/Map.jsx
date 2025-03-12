import React, { forwardRef } from 'react';
import { StyleSheet } from 'react-native';
import MapView, { Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import ParkingSpotMarker from './ParkingSpotMarker';
import CustomLocationMarker from './CustomLocationMarker';

const Map = forwardRef(({
  location,
  isCustomLocation,
  searchRadius,
  filteredParkingSpots,
  onLocationChange,
  onPress,
  onParkingSelect,
  onLongPress
}, ref) => {
  return (
    <MapView
      ref={ref}
      provider={PROVIDER_GOOGLE}
      style={styles.map}
      region={location}
      showsUserLocation={!isCustomLocation}
      showsMyLocationButton={true}
      initialRegion={location}
      onLongPress={onLongPress}
      onPress={onPress}
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
      
      {filteredParkingSpots.map((parking) => (
        <ParkingSpotMarker
          key={parking.id}
          parking={parking}
          onPress={() => onParkingSelect(parking)}
        />
      ))}
    </MapView>
  );
});

const styles = StyleSheet.create({
  map: {
    flex: 1,
    height: '80%',
  },
});

export default Map; 