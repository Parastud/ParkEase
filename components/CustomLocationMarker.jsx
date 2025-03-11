import React from 'react';
import { Marker } from 'react-native-maps';

const CustomLocationMarker = ({ location }) => {
  return (
    <Marker
      coordinate={{
        latitude: location.latitude,
        longitude: location.longitude
      }}
      pinColor="blue"
      title="Your Selected Location"
    />
  );
};

export default CustomLocationMarker; 