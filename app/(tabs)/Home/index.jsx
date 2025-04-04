import React, { useEffect, useState, useRef, useCallback, useMemo, useContext } from 'react';
import { 
  StyleSheet, 
  View, 
  ActivityIndicator, 
  Text, 
  Linking, 
  Platform, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  Pressable, 
  Dimensions,
  StatusBar,
  Image,
  Alert
} from 'react-native';
import * as Location from 'expo-location';
import { MaterialIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import Map from '../../../components/Map';
import ParkingDetails from '../../../components/ParkingDetails';
import { FIXED_PARKING_SPOTS, fetchParkingSpots, getParkingSpotById, checkExpiredBookings } from '../../../constants/parkingData';
import "../../../global.css";
import { GlobalState } from '../../../constants/usecontext';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import ModalSwipe from '../../../components/ModalSwipe';
import { auth } from '../../../firebase';

const { height, width } = Dimensions.get('window');

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
  useEffect(() => {
    parkingSpotsRef.current = parkingSpots;
  }, [parkingSpots]);
  useEffect(() => {
    if (mapRef.current && location) {
      mapRef.current.animateToRegion({
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: searchRadius * 0.1,
        longitudeDelta: searchRadius * 0.1,
      }, 500);
    }
  }, [searchRadius, location]);
  useEffect(() => {
    const loadParkingSpots = async () => {
      setIsFetchingParkingData(true);
      try {
        if (auth?.currentUser) {
          await checkExpiredBookings();
        }
        const spotsFromFirebase = await fetchParkingSpots();
        if (!spotsFromFirebase || spotsFromFirebase.length === 0) {
          setApiError('No parking spots found in the database');
          setParkingSpots([]);
          setIsFetchingParkingData(false);
          return;
        }
        const processedSpots = spotsFromFirebase.map(spot => {
          let latitude = spot.latitude;
          let longitude = spot.longitude;
          
          if ((!latitude || !longitude) && spot.location?.coordinates) {
            longitude = spot.location.coordinates[0];
            latitude = spot.location.coordinates[1];
          }
          
          latitude = typeof latitude === 'string' ? parseFloat(latitude) : latitude;
          longitude = typeof longitude === 'string' ? parseFloat(longitude) : longitude;

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
          const isValid = spot.latitude && spot.longitude && 
            !isNaN(spot.latitude) && !isNaN(spot.longitude);
          return isValid;
        });
        
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
        console.error("Error loading parking spots:", error.message);
        setApiError('Failed to load parking spots from Firebase');
        setParkingSpots([]);
      } finally {
        setIsFetchingParkingData(false);
      }
    };

    loadParkingSpots();
  }, [location]); 

  const updateParkingSpots = useCallback((newLocation) => {
    if (!newLocation) return;
    
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
  }, []);

  const handlebooking = useCallback((parking) => {
    try {
      if (!parking) {
        Alert.alert(
          "Error",
          "No parking spot selected. Please select a valid parking spot first."
        );
        return;
      }
      
      if (!parking.id) {
        Alert.alert(
          "Error",
          "Invalid parking data. Please try selecting the parking spot again."
        );
        return;
      }
      
      if (!parking.availableSpots || parking.availableSpots <= 0) {
        Alert.alert(
          "Sorry",
          "This parking spot is no longer available. Please choose another spot."
        );
        return;
      }
      
      setModalVisible(true);
      router.push(`/(tabs)/Home/Booking/${parking.id}`);
    } catch (error) {
      Alert.alert(
        "Error",
        "There was a problem processing your booking. Please try again later."
      );
    }
  }, [router, setModalVisible]);

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
    }, 500);
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
      alert('Could not open navigation. Please make sure you have a maps app installed.');
    });
  }, []);

  const handleResetLocation = useCallback(async () => {
    setIsResettingLocation(true);
    if (location) {
      setLocationName('Your Location');
      setIsCustomLocation(false);
      if (parkingSpots.length > 0) {
        const currentFiltered = parkingSpots.filter(spot => 
          spot.distance <= searchRadius
        );
        setSelectedParking(null);
        setSearchResults([]);
      }
    }
    
    try {
      const { coords } = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Low 
      });
      
      const newLocation = {
        latitude: coords.latitude,
        longitude: coords.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      };
      setLocation(newLocation);
      updateParkingSpots(newLocation);
    } catch (error) {
      setErrorMsg('Could not get current location');
    } finally {
      setIsResettingLocation(false);
    }
  }, [location, parkingSpots, searchRadius, updateParkingSpots]);
  const handleMapPress = useCallback(() => {
    if (selectedParking) {
    setSelectedParking(null);
      if (mapRef.current && location) {
        mapRef.current.animateToRegion({
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }, 500);
      }
    }
  }, [selectedParking, location]);

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
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (isMounted) {
            setErrorMsg('Permission to access location was denied');
            setIsLoading(false);
          }
          return;
        }
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
  const filteredParkingSpots = useMemo(() => {
    const filtered = parkingSpots.filter(spot => spot.distance <= searchRadius);
    return filtered.map(spot => ({
      ...spot,
      latitude: typeof spot.latitude === 'string' ? parseFloat(spot.latitude) : spot.latitude,
      longitude: typeof spot.longitude === 'string' ? parseFloat(spot.longitude) : spot.longitude
    }));
  }, [parkingSpots, searchRadius]);
  const refreshParkingSpots = useCallback(async () => {
    setIsFetchingParkingData(true);
    try {
      const spotsFromFirebase = await fetchParkingSpots();
      const processedSpots = spotsFromFirebase.map(spot => {
        let latitude = spot.latitude;
        let longitude = spot.longitude;
        if ((!latitude || !longitude) && spot.location?.coordinates) {
          longitude = spot.location.coordinates[0];
          latitude = spot.location.coordinates[1];
        }
        latitude = typeof latitude === 'string' ? parseFloat(latitude) : latitude;
        longitude = typeof longitude === 'string' ? parseFloat(longitude) : longitude;
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
        const isValid = spot.latitude && spot.longitude && 
          !isNaN(spot.latitude) && !isNaN(spot.longitude);
        return isValid;
      });
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
  }, [location]); 
  const focusOnParkingSpot = useCallback((spot) => {
    if (!spot || !spot.latitude || !spot.longitude || !mapRef.current) return;
    const { height } = Dimensions.get('window');
    
    const region = {
      latitude: spot.latitude - 0.001, 
      longitude: spot.longitude,
      latitudeDelta: 0.005,
      longitudeDelta: 0.005,
    };
  
    mapRef.current.animateToRegion(region, 500);
  }, []);
  
  const handleParkingSelection = useCallback((spot) => {
    setSelectedParking(spot);
    setTimeout(() => focusOnParkingSpot(spot), 100);
  }, [focusOnParkingSpot]);
  
  const handleNextParking = useCallback(() => {
    if (!filteredParkingSpots || filteredParkingSpots.length === 0 || !selectedParking) {
      return;
    }
    
    const sortedSpots = [...filteredParkingSpots].sort((a, b) => {
      if (a.distance && b.distance) {
        return a.distance - b.distance;
      }
      return 0;
    });
    
    const currentIndex = sortedSpots.findIndex(spot => spot.id === selectedParking.id);
    
    let nextSpot;
    if (currentIndex === -1 || currentIndex === sortedSpots.length - 1) {
      nextSpot = sortedSpots[0];
    } else {
      nextSpot = sortedSpots[currentIndex + 1];
    }
    
    setSelectedParking(nextSpot);
    focusOnParkingSpot(nextSpot);
  }, [filteredParkingSpots, selectedParking, focusOnParkingSpot]);
  
  const handlePrevParking = useCallback(() => {
    if (!filteredParkingSpots || filteredParkingSpots.length === 0 || !selectedParking) {
      return;
    }
    const sortedSpots = [...filteredParkingSpots].sort((a, b) => {
      if (a.distance && b.distance) {
        return a.distance - b.distance;
      }
      return 0;
    });
    const currentIndex = sortedSpots.findIndex(spot => spot.id === selectedParking.id);
    
    let prevSpot;
    if (currentIndex === -1 || currentIndex === 0) {
      prevSpot = sortedSpots[sortedSpots.length - 1];
    } else {
      prevSpot = sortedSpots[currentIndex - 1];
    }
    
    setSelectedParking(prevSpot);
    focusOnParkingSpot(prevSpot);
  }, [filteredParkingSpots, selectedParking, focusOnParkingSpot]);

  // Modify handleOpenParkingDetails to use the focus function
  const handleOpenParkingDetails = useCallback(() => {
    try {
      if (!parkingSpots || parkingSpots.length === 0) {
        Alert.alert("No Parking Spots", "No parking spots available in this area.");
        return;
      }

      // Filter spots within the search radius
      const filteredParkingSpots = parkingSpots.filter(spot => 
        typeof spot.distance === 'number' && spot.distance <= searchRadius
      );

      if (filteredParkingSpots.length === 0) {
        Alert.alert("No Nearby Spots", "No parking spots found in your selected radius. Try increasing the search distance.");
        return;
      }

      // Sort by distance (closest first)
      const sortedSpots = [...filteredParkingSpots].sort((a, b) => {
        return a.distance - b.distance;
      });

      // Select the closest spot
      const firstSpot = sortedSpots[0];
      
      if (!firstSpot || !firstSpot.id) {
        Alert.alert("Error", "Unable to select parking spot. Please try again.");
        return;
      }

      // Set this spot as selected
      setSelectedParking(firstSpot);
      focusOnParkingSpot(firstSpot);

    } catch (error) {
      Alert.alert("Error", "There was a problem selecting a parking spot. Please try again.");
    }
  }, [parkingSpots, searchRadius]);

  // Loading state with minimal UI
  if (errorMsg) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        <View style={styles.errorGradient}>
          <MaterialIcons name="error" size={64} color="#ff3b30" />
          <Text style={styles.errorTitle}>Location Error</Text>
        <Text style={styles.errorText}>{errorMsg}</Text>
          <TouchableOpacity 
            style={styles.errorButton}
            onPress={() => router.replace('/')}
          >
            <Text style={styles.errorButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (isLoading || isFetchingParkingData) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        <View style={styles.loadingGradient}>
          <View style={styles.logoContainer}>
            <Image 
              source={require('../../../assets/adaptive-icon.png')} 
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
        <Text style={styles.loadingText}>Finding nearby parking spots...</Text>
          <Text style={styles.loadingSubText}>We're searching for the best options around you</Text>
        </View>
      </View>
    );
  }

  return (
    <Animated.View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <Map
        ref={mapRef}
        location={location}
        parkingSpots={filteredParkingSpots}
        searchRadius={searchRadius}
        onParkingSelected={handleParkingSelection}
        selectedParking={selectedParking}
        onMapPress={handleMapPress}
        onMapLongPress={handleMapLongPress}
        isCustomLocation={isCustomLocation}
        onRefreshLocation={handleResetLocation}
      />
      {apiError && (
        <Animated.View 
          entering={FadeIn.duration(300)}
          style={styles.errorOverlay}
        >
          <View style={styles.errorBlur}>
            <MaterialIcons name="warning" size={32} color="#ff9500" />
            <Text style={styles.errorOverlayText}>{apiError}</Text>
            <TouchableOpacity 
              style={styles.errorButton}
              onPress={refreshParkingSpots}
            >
              <Text style={styles.errorButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* Search and Location Area */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBlur}>
        <View style={styles.topBar}>
          <Pressable 
            style={styles.locationButton}
            onPress={() => {
              setShowSearch(true);
              setSearchQuery('');
              setSearchResults([]);
            }}
          >
            <MaterialIcons 
              name={isCustomLocation ? "location-on" : "location-on"} 
              size={24} 
              color="#007AFF" 
            />
            <Text style={styles.locationText} numberOfLines={1}>
              {locationName}
            </Text>
            <MaterialIcons name="keyboard-arrow-down" size={16} color="#007AFF" />
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
                  <MaterialIcons name="home" size={22} color="#007AFF" />
                )}
              </TouchableOpacity>
            )}
              
              <TouchableOpacity
                style={styles.iconButton}
                onPress={refreshParkingSpots}
              >
                <MaterialIcons name="refresh" size={22} color="#007AFF" />
              </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => {
                setShowSearch(true);
                setSearchQuery('');
                setSearchResults([]);
              }}
            >
              <MaterialIcons name="search" size={22} color="#007AFF" />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => setShowFilter(!showFilter)}
            >
              <MaterialIcons name="tune" size={22} color="#007AFF" />
            </TouchableOpacity>
          </View>
        </View>

        {showSearch && (
            <Animated.View 
              entering={FadeIn.duration(300)}
              exiting={FadeOut.duration(300)}
              style={styles.searchInputContainer}
            >
            <MaterialIcons name="search" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for a location..."
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                searchLocations(text);
              }}
              autoFocus
                placeholderTextColor="#999"
            />
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                setShowSearch(false);
                setSearchQuery('');
                setSearchResults([]);
              }}
            >
              <MaterialIcons name="close" size={20} color="#666" />
            </TouchableOpacity>
            </Animated.View>
        )}

        {searchResults.length > 0 && (
            <Animated.View
              entering={FadeIn.duration(300)}
            style={styles.searchResults}
            >
              <FlatList
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
                    <MaterialIcons name="location-on" size={20} color="#007AFF" style={styles.resultIcon} />
                <Text style={styles.searchResultText}>{item.address}</Text>
              </TouchableOpacity>
            )}
          />
            </Animated.View>
        )}
        </View>
      </View>

      {showFilter && (
        <Animated.View 
          entering={FadeIn.duration(300)}
          style={styles.radiusContainer}
        >
          <View style={styles.radiusBlur}>
          <View style={styles.radiusHeader}>
            <Text style={styles.radiusText}>Search Radius: {searchRadius} km</Text>
            <TouchableOpacity
              style={styles.closeFilterButton}
              onPress={() => setShowFilter(false)}
            >
              <MaterialIcons name="close" size={20} color="#666" />
            </TouchableOpacity>
          </View>
          <View style={styles.sliderContainer}>
              <View style={styles.sliderLabelContainer}>
            <Text style={styles.sliderLabel}>1</Text>
            <Slider
              style={styles.slider}
              minimumValue={1}
              maximumValue={10}
              step={1}
                  value={5}
              onValueChange={setSearchRadius}
              minimumTrackTintColor="#007AFF"
              maximumTrackTintColor="#D3D3D3"
              thumbTintColor="#007AFF"
            />
            <Text style={styles.sliderLabel}>10</Text>
          </View>
              <Text style={styles.radiusHint}>Drag to adjust your search radius</Text>
        </View>
          </View>
        </Animated.View>
      )}
      
      {/* Show bottom handle for finding parking spots */}
      {filteredParkingSpots.length > 0 && selectedParking== null && (
        <TouchableOpacity 
          style={styles.bottomSheetHandle}
          onPress={handleOpenParkingDetails}
        >
          <View style={styles.handle} />
          <Text style={styles.handleText}>
            {filteredParkingSpots.length} parking spot{filteredParkingSpots.length !== 1 ? 's' : ''} found
          </Text>
        </TouchableOpacity>
      )}

      {/* Parking details component */}
      <ParkingDetails
        parking={selectedParking}
        onBook={() => {
          if (selectedParking && selectedParking.id) {
            handlebooking(selectedParking);
          } else {
            Alert.alert('Error', 'Unable to book. Please select a parking spot first.');
          }
        }}
        onNavigate={() => {
          if (selectedParking && selectedParking.latitude && selectedParking.longitude) {
            openMapsNavigation(selectedParking);
          } else {
            Alert.alert('Error', 'Unable to navigate. Please select a valid parking spot.');
          }
        }}
        onSwipeNext={handleNextParking}
        onSwipePrev={handlePrevParking}
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
    top: Platform.OS === 'ios' ? 50 : 40,
    left: 15,
    right: 15,
    zIndex: 5,
    borderRadius: 16,
    overflow: 'hidden',
  },
  searchBlur: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 16,
    padding: 12,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  topBarButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 245, 245, 0.8)',
    borderRadius: 10,
    padding: 4,
    marginLeft: 10,
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
    fontWeight: '600',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    marginTop: 8,
    padding: 12,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 8,
  },
  closeButton: {
    padding: 4,
  },
  searchResults: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    marginTop: 5,
    maxHeight: 200,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(230, 230, 230, 0.7)',
  },
  resultIcon: {
    marginRight: 10,
  },
  searchResultText: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  radiusContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 130 : 120,
    left: 15,
    right: 15,
    zIndex: 5,
    borderRadius: 16,
    overflow: 'hidden',
  },
  radiusBlur: {
    borderRadius: 16,
    padding: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
  },
  radiusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  radiusText: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#333',
  },
  closeFilterButton: {
    padding: 4,
  },
  sliderContainer: {
    marginTop: 10,
  },
  sliderLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sliderLabel: {
    fontSize: 14,
    color: '#007AFF',
    width: 20,
    textAlign: 'center',
    fontWeight: '600',
  },
  slider: {
    flex: 1,
    height: 40,
    marginHorizontal: 10,
  },
  radiusHint: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
  },
  loadingGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f0f4ff',
  },
  logoContainer: {
    marginBottom: 30,
  },
  logo: {
    width: 120,
    height: 120,
  },
  loader: {
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  loadingSubText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  errorGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#f0f4ff',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  errorOverlay: {
    position: 'absolute',
    bottom: height * 0.3,
    left: 30,
    right: 30,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 6,
    zIndex: 6,
  },
  errorBlur: {
    padding: 20,
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  errorOverlayText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
    marginVertical: 15,
  },
  errorButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 12,
    marginHorizontal: 5,
    marginTop: 5,
  },
  errorButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  errorButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  bottomSheetHandle: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'white',
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 5,
  },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: '#ddd',
    borderRadius: 3,
    marginBottom: 8,
  },
  handleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
});