import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ActivityIndicator, Text, Linking, Platform } from 'react-native';
import * as Location from 'expo-location';
import Map from '../components/Map';
import SearchBar from '../components/SearchBar';
import ParkingDetails from '../components/ParkingDetails';
import { FIXED_PARKING_SPOTS } from '../constants/parkingData';
import "../global.css";

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const d = R * c;
  return d;
}

function deg2rad(deg) {
  return deg * (Math.PI/180);
}

export default function App() {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedParking, setSelectedParking] = useState(null);
  const [parkingSpots, setParkingSpots] = useState([]);
  const [searchRadius, setSearchRadius] = useState(1);
  const [isCustomLocation, setIsCustomLocation] = useState(false);

  const updateParkingSpots = (newLocation) => {
    const spotsWithDistances = FIXED_PARKING_SPOTS.map(spot => ({
      ...spot,
      distance: getDistance(
        newLocation.latitude,
        newLocation.longitude,
        spot.latitude,
        spot.longitude
      )
    }));
    setParkingSpots(spotsWithDistances);
  };

  const openMapsNavigation = (parking) => {
    const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
    const latLng = `${parking.latitude},${parking.longitude}`;
    const label = parking.title;
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`
    });

    Linking.openURL(url).catch((err) => {
      console.error('Error opening navigation:', err);
      alert('Could not open navigation. Please make sure you have a maps app installed.');
    });
  };

  const handleLocationChange = (newLocation) => {
    setLocation(newLocation);
    setIsCustomLocation(true);
    updateParkingSpots(newLocation);
  };

  const handleResetLocation = async () => {
    setIsLoading(true);
    try {
      const { coords } = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced
      });
      const newLocation = {
        latitude: coords.latitude,
        longitude: coords.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      };
      setLocation(newLocation);
      updateParkingSpots(newLocation);
      setIsCustomLocation(false);
    } catch (error) {
      console.error('Error resetting location:', error);
      alert('Could not get current location');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorMsg('Permission to access location was denied');
          return;
        }

        let currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced
        });

        const newLocation = {
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        };

        setLocation(newLocation);
        updateParkingSpots(newLocation);
      } catch (error) {
        console.error('Error:', error);
        setErrorMsg('Error getting location: ' + error.message);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const filteredParkingSpots = parkingSpots.filter(spot => {
    const isWithinRadius = spot.distance <= searchRadius;
    const matchesSearch = searchQuery.length === 0 || 
      spot.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      spot.description.toLowerCase().includes(searchQuery.toLowerCase());
    return isWithinRadius && matchesSearch;
  });

  if (errorMsg) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{errorMsg}</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Finding nearby parking spots...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SearchBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchRadius={searchRadius}
        onRadiusChange={setSearchRadius}
        isCustomLocation={isCustomLocation}
        onResetLocation={handleResetLocation}
      />

      <Map
        location={location}
        isCustomLocation={isCustomLocation}
        searchRadius={searchRadius}
        filteredParkingSpots={filteredParkingSpots}
        onLocationChange={handleLocationChange}
        onParkingSelect={setSelectedParking}
      />

      <ParkingDetails
        parking={selectedParking}
        onBook={() => alert(`Booking parking at ${selectedParking?.title}`)}
        onNavigate={() => openMapsNavigation(selectedParking)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
    padding: 20,
  },
});