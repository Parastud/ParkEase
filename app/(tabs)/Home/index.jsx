import React, { useEffect, useState, useRef, useCallback, useMemo,useContext } from 'react';
import { StyleSheet, View, ActivityIndicator, Text, Linking, Platform, TextInput, TouchableOpacity, FlatList, Pressable } from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import Map from '../../../components/Map';
import ParkingDetails from '../../../components/ParkingDetails';
import { FIXED_PARKING_SPOTS, fetchParkingSpots, getParkingSpotById, checkExpiredBookings } from '../../../constants/parkingData';
import "../../../global.css";
import { GlobalState } from '../../../constants/usecontext';
import { router } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import Animated  from 'react-native-reanimated';
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
  const {setModalVisible} = useContext(GlobalState)
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
  const [isFetchingParkingData, setIsFetchingParkingData] = useState(true);
  const [apiError, setApiError] = useState(null);
  const parkingSpotsRef = useRef([]);
  
  // Update ref whenever parkingSpots changes
  useEffect(() => {
    parkingSpotsRef.current = parkingSpots;
  }, [parkingSpots]);

  useEffect(() => {

    async function changeScreenOrientation() {
  await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.ALL);
}
changeScreenOrientation();
  }, []);

  // Fetch parking spots from Firebase
  useEffect(() => {
    const loadParkingSpots = async () => {
      setIsFetchingParkingData(true);
      try {
        // Check for expired bookings first
        await checkExpiredBookings();
        
        // Then get the latest data
        const spotsFromFirebase = await fetchParkingSpots();
        
        // If no spots were loaded, show error
        if (!spotsFromFirebase || spotsFromFirebase.length === 0) {
          setApiError('No parking spots found in the database');
          setParkingSpots([]);
          setIsFetchingParkingData(false);
          return;
        }
        
        // Process spots to ensure they have the right format
        const processedSpots = spotsFromFirebase.map(spot => {
          // Extract coordinates from Firebase's location format if needed
          let latitude = spot.latitude;
          let longitude = spot.longitude;
          
          // Check if coordinates are in Firebase's location.coordinates format
          if ((!latitude || !longitude) && spot.location?.coordinates) {
            // Firebase stores as [longitude, latitude]
            longitude = spot.location.coordinates[0];
            latitude = spot.location.coordinates[1];
          }
          
          // Ensure coordinates are valid numbers
          latitude = typeof latitude === 'string' ? parseFloat(latitude) : latitude;
          longitude = typeof longitude === 'string' ? parseFloat(longitude) : longitude;
          
          // Format price for display
          let price = spot.price;
          if (typeof price === 'number') {
            price = `₹ ${price}/hour`;
          }
          
          return {
            ...spot,
            latitude,
            longitude,
            price,
            // Ensure these are properly formatted for display
            totalSpots: spot.totalSpots || 0,
            availableSpots: spot.availableSpots || 0,
            // Make sure we have a title
            title: spot.title || 'Parking Spot'
          };
        }).filter(spot => {
          // Filter out spots with invalid coordinates
          const isValid = spot.latitude && spot.longitude && 
            !isNaN(spot.latitude) && !isNaN(spot.longitude);
          return isValid;
        });
        
        // If we have a location, calculate distances
        if (location) {
          const spotsWithDistances = processedSpots.map(spot => ({
            ...spot,
            distance: getDistance(
              location.latitude,
              location.longitude,
              spot.latitude,
              spot.longitude
            )
          }));
          setParkingSpots(spotsWithDistances);
        } else {
          setParkingSpots(processedSpots);
        }
      } catch (error) {
        setApiError('Failed to load parking spots from Firebase');
        // Set empty array instead of using static data
        setParkingSpots([]);
      } finally {
        setIsFetchingParkingData(false);
      }
    };

    loadParkingSpots();
  }, [location]); // Reload when location changes

  const updateParkingSpots = useCallback((newLocation) => {
    if (!newLocation) return;
    
    // Update distances for existing parking spots using the ref instead of state
    const spotsWithDistances = parkingSpotsRef.current.map(spot => ({
      ...spot,
      distance: getDistance(
        newLocation.latitude,
        newLocation.longitude,
        spot.latitude,
        spot.longitude
      )
    }));
    setParkingSpots(spotsWithDistances);
  }, []); // Empty dependency array to avoid recreation

  const handlebooking = () => {
        setModalVisible(true)
        router.push(`/(tabs)/Home/Booking/${selectedParking.id}`);
        
  }
  const searchLocations = useCallback(async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
  
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await Location.geocodeAsync(query);
        if (results.length > 0) {
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
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 500); // 500ms debounce
  }, []); // Empty dependency array as it doesn't depend on component state

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
      alert('Could not open navigation. Please make sure you have a maps app installed.');
    });
  }, []);

  const handleResetLocation = useCallback(async () => {
    setIsResettingLocation(true);
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
      setErrorMsg('Could not get current location');
    } finally {
      setIsResettingLocation(false);
    }
  }, [location, parkingSpots, searchRadius, updateParkingSpots]);

const handleMapPress = useCallback(() => {
    setSelectedParking(null);
  }, []);

  const handleMapLongPress = useCallback(async (event) => {
    const { coordinate } = event.nativeEvent;
    
    const newLocation = {
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
      latitudeDelta: 0.0922,
      longitudeDelta: 0.0421,
    };
    setLocation(newLocation);
    setIsCustomLocation(true);
    updateParkingSpots(newLocation);
    setSelectedParking(null);
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
      setLocationName('Selected Location');
    }
  }, [updateParkingSpots]);
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
  }, [location]); // Keep only location as dependency

  // Memoize filtered parking spots to prevent recalculation on every render
  const filteredParkingSpots = useMemo(() => {
    const filtered = parkingSpots.filter(spot => spot.distance <= searchRadius);
    return filtered.map(spot => ({
      ...spot,
      // Ensure coordinates are proper numbers
      latitude: typeof spot.latitude === 'string' ? parseFloat(spot.latitude) : spot.latitude,
      longitude: typeof spot.longitude === 'string' ? parseFloat(spot.longitude) : spot.longitude
    }));
  }, [parkingSpots, searchRadius]);

  // Add a manual refresh function
  const refreshParkingSpots = useCallback(async () => {
    setIsFetchingParkingData(true);
    try {
      const spotsFromFirebase = await fetchParkingSpots();
      
      // Process spots to ensure they have the right format
      const processedSpots = spotsFromFirebase.map(spot => {
        // Extract coordinates from Firebase's location format if needed
        let latitude = spot.latitude;
        let longitude = spot.longitude;
        
        // Check if coordinates are in Firebase's location.coordinates format
        if ((!latitude || !longitude) && spot.location?.coordinates) {
          // Firebase stores as [longitude, latitude]
          longitude = spot.location.coordinates[0];
          latitude = spot.location.coordinates[1];
        }
        
        // Ensure coordinates are valid numbers
        latitude = typeof latitude === 'string' ? parseFloat(latitude) : latitude;
        longitude = typeof longitude === 'string' ? parseFloat(longitude) : longitude;
        
        // Format price for display
        let price = spot.price;
        if (typeof price === 'number') {
          price = `₹ ${price}/hour`;
        }
        
        return {
          ...spot,
          latitude,
          longitude,
          price,
          totalSpots: spot.totalSpots || 0,
          availableSpots: spot.availableSpots || 0,
          title: spot.title || 'Parking Spot'
        };
      }).filter(spot => {
        // Filter out spots with invalid coordinates
        const isValid = spot.latitude && spot.longitude && 
          !isNaN(spot.latitude) && !isNaN(spot.longitude);
        return isValid;
      });
      
      // If we have a location, calculate distances
      if (location) {
        const spotsWithDistances = processedSpots.map(spot => ({
          ...spot,
          distance: getDistance(
            location.latitude,
            location.longitude,
            spot.latitude,
            spot.longitude
          )
        }));
        setParkingSpots(spotsWithDistances);
      } else {
        setParkingSpots(processedSpots);
      }
      
      setApiError(null);
    } catch (error) {
      setApiError('Failed to refresh parking spots from Firebase');
    } finally {
      setIsFetchingParkingData(false);
    }
  }, [location]); // Only depend on location

  // Loading state with minimal UI
  if (errorMsg) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{errorMsg}</Text>
      </View>
    );
  }

  if (isLoading || isFetchingParkingData) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Finding nearby parking spots...</Text>
      </View>
    );
  }

  return (
    <Animated.View style={styles.container}>
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
              onPress={refreshParkingSpots}
            >
              <Ionicons name="refresh" size={22} color="#007AFF" />
            </TouchableOpacity>
            
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
        parkingSpots={filteredParkingSpots}
        searchRadius={searchRadius}
        onParkingSelected={setSelectedParking}
        selectedParking={selectedParking}
        onMapPress={handleMapPress}
        onMapLongPress={handleMapLongPress}
        isCustomLocation={isCustomLocation}
        onRefreshLocation={handleResetLocation}
      />

      {apiError && (
        <View style={styles.errorOverlay}>
          <Text style={styles.errorOverlayText}>{apiError}</Text>
          <TouchableOpacity 
            style={styles.errorButton}
            onPress={refreshParkingSpots}
          >
            <Text style={styles.errorButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {filteredParkingSpots.length === 0 && !apiError && !isFetchingParkingData && (
        <View style={styles.errorOverlay}>
          <Text style={styles.errorOverlayText}>No parking spots found in this area.</Text>
          <View style={styles.errorButtonsRow}>
            <TouchableOpacity 
              style={styles.errorButton}
              onPress={refreshParkingSpots}
            >
              <Text style={styles.errorButtonText}>Refresh Data</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.errorButton}
              onPress={handleResetLocation}
            >
              <Text style={styles.errorButtonText}>Reset Location</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ParkingDetails
        parking={selectedParking}
        onBook={() => handlebooking(selectedParking)}
        onNavigate={() => openMapsNavigation(selectedParking)}
      />
    </Animated.View>
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
  errorOverlay: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  errorOverlayText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 15,
  },
  errorButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  errorButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  errorButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
});