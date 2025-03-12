import React, { useEffect, useState, useRef, useCallback, useMemo,useContext } from 'react';
import { StyleSheet, View, ActivityIndicator, Text, Linking, Platform, TextInput, TouchableOpacity, FlatList, Pressable } from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import Map from '../../../components/Map';
import ParkingDetails from '../../../components/ParkingDetails';
import { FIXED_PARKING_SPOTS } from '../../../constants/parkingData';
import "../../../global.css";
import { GlobalState } from '../../../constants/usecontext';
import { router } from 'expo-router';
// Memoize distance calculation function
const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return d;
}


function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

export default function Home() {
  const {modalVisible, setModalVisible} = useContext(GlobalState)
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedParking, setSelectedParking] = useState(null);
  const [parkingSpots, setParkingSpots] = useState([]);
  const [searchRadius, setSearchRadius] = useState(5);
  const [isCustomLocation, setIsCustomLocation] = useState(false);
  const [locationName, setLocationName] = useState('Your Location');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const mapRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const [isResettingLocation, setIsResettingLocation] = useState(false);

  // Memoize updateParkingSpots to prevent unnecessary recalculations
  const updateParkingSpots = useCallback((newLocation) => {
    if (!newLocation) return;
    
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
  }, []);

  const handlebooking = () => {
        setModalVisible(true)
        router.push(`/(tabs)/Home/Booking/${selectedParking.id}`);
        
  }

  // Debounce search to prevent too many API calls
  const searchLocations = useCallback(async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Set a new timeout
    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await Location.geocodeAsync(query);
        if (results.length > 0) {
          // Process only the first 3 results for faster loading
          const locations = await Promise.all(
            results.slice(0, 3).map(async (result) => {
              const address = await Location.reverseGeocodeAsync({
                latitude: result.latitude,
                longitude: result.longitude,
              });
              const formattedAddress = address[0] ? 
                [
                  address[0].name,
                  address[0].street,
                  address[0].city,
                  address[0].region
                ].filter(Boolean).join(', ') : 'Unknown location';
              return {
                ...result,
                address: formattedAddress,
              };
            })
          );
          setSearchResults(locations);
        } else {
          setSearchResults([]);
        }
      } catch (error) {
        console.error('Error searching locations:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 500); // 500ms debounce
  }, []);

  const handleLocationSelect = useCallback(async (selectedLocation) => {
    const newLocation = {
      latitude: selectedLocation.latitude,
      longitude: selectedLocation.longitude,
      latitudeDelta: 0.0922,
      longitudeDelta: 0.0421,
    };

    setLocation(newLocation);
    setLocationName(selectedLocation.address);
    setIsCustomLocation(true);
    updateParkingSpots(newLocation);
    setSelectedParking(null);
    setSearchResults([]);
  }, [updateParkingSpots]);

  const openMapsNavigation = useCallback((parking) => {
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
  }, []);

  const handleResetLocation = useCallback(async () => {
    // Provide immediate feedback
    setIsResettingLocation(true);
    
    // First reset to a default state immediately for better UX
    if (location) {
      // Use current location but mark as "Your Location" immediately
      setLocationName('Your Location');
      setIsCustomLocation(false);
      
      // If we have parking spots already, filter them based on current location
      if (parkingSpots.length > 0) {
        const currentFiltered = parkingSpots.filter(spot => 
          spot.distance <= searchRadius
        );
        // Update UI with current filtered spots
        setSelectedParking(null);
        setSearchResults([]);
      }
    }
    
    try {
      // Get actual current location in background
      const { coords } = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Low // Use low accuracy for faster results
      });
      
      const newLocation = {
        latitude: coords.latitude,
        longitude: coords.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      };
      
      // Update with actual current location
      setLocation(newLocation);
      updateParkingSpots(newLocation);
    } catch (error) {
      console.error('Error resetting location:', error);
      setErrorMsg('Could not get current location');
    } finally {
      setIsResettingLocation(false);
    }
  }, [location, parkingSpots, searchRadius, updateParkingSpots]);

const handleMapPress = ()=> {
    setSelectedParking(null);
  }

  const handleMapLongPress = useCallback(async (event) => {
    const { coordinate } = event.nativeEvent;
    
    const newLocation = {
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
      latitudeDelta: 0.0922,
      longitudeDelta: 0.0421,
    };

    // Update location immediately for better responsiveness
    setLocation(newLocation);
    setIsCustomLocation(true);
    updateParkingSpots(newLocation);
    setSelectedParking(null);
    
    // Then fetch address in background
    try {
      const address = await Location.reverseGeocodeAsync({
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
      });
      
      const formattedAddress = address[0] ? 
        [
          address[0].name,
          address[0].street,
          address[0].city,
          address[0].region
        ].filter(Boolean).join(', ') : 'Selected Location';
      
      setLocationName(formattedAddress);
    } catch (error) {
      console.error('Error getting address:', error);
      setLocationName('Selected Location');
    }
  }, [updateParkingSpots]);

  // Initial location setup
  useEffect(() => {
    let isMounted = true;
    
    const getInitialLocation = async () => {
      try {
        // Request permissions first
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (isMounted) {
            setErrorMsg('Permission to access location was denied');
            setIsLoading(false);
          }
          return;
        }

        // Get last known location first for immediate display
        let lastKnownLocation = await Location.getLastKnownPositionAsync();
        
        if (lastKnownLocation && isMounted) {
          const quickLocation = {
            latitude: lastKnownLocation.coords.latitude,
            longitude: lastKnownLocation.coords.longitude,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          };
          setLocation(quickLocation);
          updateParkingSpots(quickLocation);
          setIsLoading(false);
        }
        
        // Then get current location for accuracy
        let currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced
        });

        if (isMounted) {
          const newLocation = {
            latitude: currentLocation.coords.latitude,
            longitude: currentLocation.coords.longitude,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          };

          setLocation(newLocation);
          setLocationName('Your Location');
          updateParkingSpots(newLocation);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error:', error);
        if (isMounted) {
          setErrorMsg('Error getting location: ' + error.message);
          setIsLoading(false);
        }
      }
    };

    getInitialLocation();
    
    return () => {
      isMounted = false;
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [updateParkingSpots]);

  // Map animation effect
  useEffect(() => {
    if (mapRef.current && location) {
      mapRef.current.animateToRegion({
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      }, 1000);
    }
  }, [location]);

  // Memoize filtered parking spots to prevent recalculation on every render
  const filteredParkingSpots = useMemo(() => 
    parkingSpots.filter(spot => spot.distance <= searchRadius),
    [parkingSpots, searchRadius]
  );

  // Loading state with minimal UI
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
      <View style={styles.searchContainer}>
        <View style={styles.topBar}>
          <Pressable 
            style={styles.locationButton}
            onPress={() => {
              setShowSearch(true);
              setSearchQuery('');
              setSearchResults([]);
            }}
            android_ripple={{ color: 'rgba(0, 122, 255, 0.1)' }}
          >
            <Ionicons 
              name={isCustomLocation ? "location-outline" : "location"} 
              size={24} 
              color="#007AFF" 
            />
            <Text style={styles.locationText} numberOfLines={1}>
              {locationName}
            </Text>
          </Pressable>
          
          <View style={styles.topBarButtons}>
            {isCustomLocation && (
              <TouchableOpacity
                style={styles.iconButton}
                onPress={handleResetLocation}
                disabled={isResettingLocation}
              >
                {isResettingLocation ? (
                  <ActivityIndicator size="small" color="#007AFF" />
                ) : (
                  <Ionicons name="home" size={22} color="#007AFF" />
                )}
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => {
                setShowSearch(true);
                setSearchQuery('');
                setSearchResults([]);
              }}
            >
              <Ionicons name="search" size={22} color="#007AFF" />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => setShowFilter(!showFilter)}
            >
              <Ionicons name="options" size={22} color="#007AFF" />
            </TouchableOpacity>
          </View>
        </View>

        {showSearch && (
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for a location..."
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                searchLocations(text);
              }}
              autoFocus
            />
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                setShowSearch(false);
                setSearchQuery('');
                setSearchResults([]);
              }}
            >
              <Ionicons name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          </View>
        )}

        {searchResults.length > 0 && (
          <FlatList
            style={styles.searchResults}
            data={searchResults}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.searchResultItem}
                onPress={() => {
                  handleLocationSelect(item);
                  setShowSearch(false);
                  setSearchQuery('');
                }}
              >
                <Ionicons name="location-outline" size={20} color="#666" style={styles.resultIcon} />
                <Text style={styles.searchResultText}>{item.address}</Text>
              </TouchableOpacity>
            )}
          />
        )}
      </View>

      {showFilter && (
        <View style={styles.radiusContainer}>
          <View style={styles.radiusHeader}>
            <Text style={styles.radiusText}>Search Radius: {searchRadius} km</Text>
            <TouchableOpacity
              style={styles.closeFilterButton}
              onPress={() => setShowFilter(false)}
            >
              <Ionicons name="close" size={20} color="#666" />
            </TouchableOpacity>
          </View>
          <View style={styles.sliderContainer}>
            <Text style={styles.sliderLabel}>1</Text>
            <Slider
              style={styles.slider}
              minimumValue={1}
              maximumValue={10}
              step={1}
              value={searchRadius}
              onValueChange={setSearchRadius}
              minimumTrackTintColor="#007AFF"
              maximumTrackTintColor="#D3D3D3"
              thumbTintColor="#007AFF"
            />
            <Text style={styles.sliderLabel}>10</Text>
          </View>
        </View>
      )}

      <Map
        ref={mapRef}
        location={location}
        isCustomLocation={isCustomLocation}
        searchRadius={searchRadius}
        filteredParkingSpots={filteredParkingSpots}
        onLocationChange={handleLocationSelect}
        onParkingSelect={setSelectedParking}
        onPress={handleMapPress}
        onLongPress={handleMapLongPress}
      />

      <ParkingDetails
        parking={selectedParking}
        onBook={() => handlebooking(selectedParking)}
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
  searchContainer: {
    position: 'absolute',
    top: 50,
    left: 10,
    right: 10,
    zIndex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  topBarButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 4,
  },
  iconButton: {
    padding: 8,
    borderRadius: 8,
  },
  locationText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginHorizontal: 10,
    fontWeight: '500',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 0,
  },
  closeButton: {
    padding: 4,
  },
  searchResults: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 5,
    maxHeight: 200,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  resultIcon: {
    marginRight: 10,
  },
  searchResultText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  radiusContainer: {
    position: 'absolute',
    top: 120,
    left: 10,
    right: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1,
  },
  radiusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  radiusText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  closeFilterButton: {
    padding: 4,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sliderLabel: {
    fontSize: 14,
    color: '#666',
    width: 20,
    textAlign: 'center',
    fontWeight: '500',
  },
  slider: {
    flex: 1,
    height: 40,
    marginHorizontal: 10,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
    padding: 20,
  },
});