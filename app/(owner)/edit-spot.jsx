import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Switch,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { 
  getParkingSpotById, 
  updateParkingSpot, 
  uploadParkingImage,
  checkIsRegisteredOwner
} from '../../constants/parkingData';
import { router, useLocalSearchParams } from 'expo-router';
import { auth } from '../../firebase';
import * as ImagePicker from 'expo-image-picker';
import MapView, { Marker } from 'react-native-maps';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as Location from 'expo-location';

const storage = getStorage();

export default function EditParkingSpot() {
  const { id } = useLocalSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [spotData, setSpotData] = useState({
    title: '',
    description: '',
    address: '',
    location: {
      latitude: 40.7128,
      longitude: -74.0060
    },
    price: '',
    totalSpots: '',
    image: null,
    features: {
      security: false,
      covered: false,
      disabled: false,
      electric: false,
    },
  });
  const [errors, setErrors] = useState({});
  const [mapRegion, setMapRegion] = useState({
    latitude: 40.7128,
    longitude: -74.0060,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      if (!auth.currentUser) {
        Alert.alert(
          "Authentication Required",
          "Please sign in to edit parking spots.",
          [{ text: "OK", onPress: () => router.push('/About') }]
        );
        return;
      }
      
      const isOwner = await checkIsRegisteredOwner();
      if (!isOwner) {
        Alert.alert(
          "Registration Required",
          "You need to register as a parking spot owner first.",
          [{ text: "Register Now", onPress: () => router.push('/(owner)/register') }]
        );
        return;
      }
      
      loadParkingSpot();
    } catch (error) {
      console.error("Error checking owner status:", error);
      Alert.alert("Error", "Could not verify owner status. Please try again.");
    }
  };

  const loadParkingSpot = async () => {
    if (!id) {
      Alert.alert("Error", "No parking spot ID provided");
      router.back();
      return;
    }

    try {
      setIsLoading(true);
      const spot = await getParkingSpotById(id);
      
      // Check if the spot belongs to the current user
      if (spot.ownerId !== auth.currentUser?.uid) {
        Alert.alert(
          "Access Denied",
          "You don't have permission to edit this parking spot.",
          [{ text: "OK", onPress: () => router.back() }]
        );
        return;
      }
      
      // Ensure location data is properly formatted with numerical values
      let locationData = {
        latitude: 40.7128,
        longitude: -74.0060
      };

      // Try to get location from spot data - ensure values are numbers
      if (spot.location) {
        if (typeof spot.location.latitude === 'number' && typeof spot.location.longitude === 'number') {
          locationData = spot.location;
        } 
        // Try latitude/longitude at the top level if location object doesn't have valid coordinates
        else if (typeof spot.latitude === 'number' && typeof spot.longitude === 'number') {
          locationData = {
            latitude: spot.latitude,
            longitude: spot.longitude
          };
        }
      }
      
      // Format numeric values as strings for the form
      setSpotData({
        ...spot,
        location: locationData,
        price: spot.price.toString(),
        totalSpots: spot.totalSpots.toString(),
        features: {
          security: spot.features?.security || false,
          covered: spot.features?.covered || false,
          disabled: spot.features?.disabled || false,
          electric: spot.features?.electric || false,
        }
      });
      
      // Update map region with the valid location data
      setMapRegion({
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    } catch (error) {
      console.error('Error loading parking spot:', error);
      Alert.alert(
        "Error",
        "Failed to load parking spot details. Please try again.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!spotData.title.trim()) newErrors.title = 'Title is required';
    if (!spotData.description.trim()) newErrors.description = 'Description is required';
    if (!spotData.address.trim()) newErrors.address = 'Address is required';
    if (!spotData.price.trim()) newErrors.price = 'Price is required';
    if (!spotData.totalSpots.trim()) newErrors.totalSpots = 'Total spots is required';
    
    // Validate location coordinates
    if (!spotData.location || typeof spotData.location.latitude !== 'number' || typeof spotData.location.longitude !== 'number') {
      newErrors.location = 'Please set a valid location on the map';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setSpotData({
        ...spotData,
        [parent]: {
          ...spotData[parent],
          [child]: value
        }
      });
    } else {
      setSpotData({
        ...spotData,
        [field]: value
      });
    }
    
    // Clear error when user types
    if (errors[field]) {
      setErrors({
        ...errors,
        [field]: null
      });
    }
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert("Permission Required", "You need to allow access to your photos to upload images.");
      return;
    }
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    
    if (!result.canceled) {
      handleInputChange('image', result.assets[0].uri);
    }
  };

  const handleMapPress = (e) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    
    // Ensure coordinates are valid numbers
    if (typeof latitude === 'number' && typeof longitude === 'number') {
      setSpotData({
        ...spotData,
        location: { latitude, longitude }
      });
      setMapRegion({
        ...mapRegion,
        latitude,
        longitude
      });
      
      // Clear location error if it exists
      if (errors.location) {
        setErrors({
          ...errors,
          location: null
        });
      }
    }
  };

  const handleCurrentLocation = async () => {
    try {
      setIsLoadingLocation(true);
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to use this feature.');
        setIsLoadingLocation(false);
        return;
      }
      
      // Get current position
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });
      
      // Update form data with coordinates
      const { latitude, longitude } = location.coords;
      setSpotData({
        ...spotData,
        latitude: String(latitude),
        longitude: String(longitude)
      });
      
      // Try to get address from coordinates
      try {
        const addressResponse = await Location.reverseGeocodeAsync({
          latitude,
          longitude
        });
        
        if (addressResponse && addressResponse.length > 0) {
          const addressObj = addressResponse[0];
          const formattedAddress = [
            addressObj.name,
            addressObj.street,
            addressObj.district,
            addressObj.city,
            addressObj.region,
            addressObj.postalCode,
            addressObj.country
          ]
            .filter(Boolean)
            .join(', ');
          
          setSpotData(prev => ({
            ...prev,
            address: formattedAddress
          }));
        }
      } catch (error) {
        // Address lookup failed, but we still have coordinates
        setErrors(prev => ({
          ...prev,
          address: 'Could not determine address, please enter manually.'
        }));
      }
      
      setIsLoadingLocation(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to get your location. Please try again or enter manually.');
      setIsLoadingLocation(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert("Form Error", "Please fix the errors in the form before submitting.");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Extract location coordinates
      const { latitude, longitude } = spotData.location;
      
      // Convert string values to numbers
      const totalSpots = parseInt(spotData.totalSpots, 10);
      
      const spotDataForSubmit = {
        ...spotData,
        // Explicitly include latitude and longitude at the top level
        latitude,
        longitude,
        price: parseFloat(spotData.price),
        totalSpots: totalSpots,
        // Pass the image as is - the backend will handle the upload
        image: spotData.image,
      };
      
      await updateParkingSpot(id, spotDataForSubmit);
      
      Alert.alert(
        "Success!",
        "Your parking spot has been updated successfully.",
        [{ text: "OK", onPress: () => router.push('/(owner)/my-spots') }]
      );
    } catch (error) {
      console.error('Error updating parking spot:', error);
      Alert.alert("Update Failed", error.message || "There was an error updating your parking spot. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading parking spot details...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Parking Spot</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Title</Text>
            <TextInput
              style={[styles.input, errors.title && styles.inputError]}
              value={spotData.title}
              onChangeText={(text) => handleInputChange('title', text)}
              placeholder="Enter parking spot title"
            />
            {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.textArea, errors.description && styles.inputError]}
              value={spotData.description}
              onChangeText={(text) => handleInputChange('description', text)}
              placeholder="Describe your parking spot"
              multiline={true}
              numberOfLines={4}
            />
            {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Address</Text>
            <TextInput
              style={[styles.input, errors.address && styles.inputError]}
              value={spotData.address}
              onChangeText={(text) => handleInputChange('address', text)}
              placeholder="Enter the full address"
            />
            {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}
          </View>

          <Text style={styles.sectionTitle}>Location on Map</Text>
          <View style={styles.mapHeader}>
            <Text style={styles.mapInstructions}>Tap on the map to adjust the location</Text>
            <TouchableOpacity 
              style={styles.locationButton} 
              onPress={handleCurrentLocation}
              disabled={isLoadingLocation}
            >
              <Ionicons name="locate" size={20} color="#007AFF" />
              <Text style={styles.locationButtonText}>
                {isLoadingLocation ? "Getting location..." : "Use my location"}
              </Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.mapContainer}>
            {isLoadingLocation ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Getting your location...</Text>
              </View>
            ) : (
              <MapView
                style={styles.map}
                region={mapRegion}
                onPress={handleMapPress}
              >
                {spotData.location && 
                 typeof spotData.location.latitude === 'number' && 
                 typeof spotData.location.longitude === 'number' && (
                  <Marker
                    coordinate={spotData.location}
                    title="Parking Location"
                  />
                )}
              </MapView>
            )}
          </View>
          {errors.location && <Text style={styles.errorText}>{errors.location}</Text>}
          
          <Text style={styles.sectionTitle}>Pricing & Availability</Text>
          
          <View style={styles.rowInputs}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
              <Text style={styles.label}>Price per Hour (₹)</Text>
              <TextInput
                style={[styles.input, errors.price && styles.inputError]}
                value={spotData.price}
                onChangeText={(text) => handleInputChange('price', text)}
                placeholder="0.00"
                keyboardType="decimal-pad"
              />
              {errors.price && <Text style={styles.errorText}>{errors.price}</Text>}
            </View>
            
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Total Spots</Text>
              <TextInput
                style={[styles.input, errors.totalSpots && styles.inputError]}
                value={spotData.totalSpots}
                onChangeText={(text) => handleInputChange('totalSpots', text)}
                placeholder="0"
                keyboardType="number-pad"
              />
              {errors.totalSpots && <Text style={styles.errorText}>{errors.totalSpots}</Text>}
              <Text style={styles.helperText}>
                Available spots are managed automatically based on bookings
              </Text>
            </View>
          </View>
          
          <Text style={styles.sectionTitle}>Features</Text>
          
          <View style={styles.featuresContainer}>
            <View style={styles.featureItem}>
              <Switch
                value={spotData.features.security}
                onValueChange={(value) => handleInputChange('features.security', value)}
                trackColor={{ false: '#767577', true: '#81b0ff' }}
                thumbColor={spotData.features.security ? '#007AFF' : '#f4f3f4'}
              />
              <Text style={styles.featureText}>Security</Text>
            </View>
            
            <View style={styles.featureItem}>
              <Switch
                value={spotData.features.covered}
                onValueChange={(value) => handleInputChange('features.covered', value)}
                trackColor={{ false: '#767577', true: '#81b0ff' }}
                thumbColor={spotData.features.covered ? '#007AFF' : '#f4f3f4'}
              />
              <Text style={styles.featureText}>Covered</Text>
            </View>
            
            <View style={styles.featureItem}>
              <Switch
                value={spotData.features.disabled}
                onValueChange={(value) => handleInputChange('features.disabled', value)}
                trackColor={{ false: '#767577', true: '#81b0ff' }}
                thumbColor={spotData.features.disabled ? '#007AFF' : '#f4f3f4'}
              />
              <Text style={styles.featureText}>Disabled Access</Text>
            </View>
            
            <View style={styles.featureItem}>
              <Switch
                value={spotData.features.electric}
                onValueChange={(value) => handleInputChange('features.electric', value)}
                trackColor={{ false: '#767577', true: '#81b0ff' }}
                thumbColor={spotData.features.electric ? '#007AFF' : '#f4f3f4'}
              />
              <Text style={styles.featureText}>EV Charging</Text>
            </View>
          </View>
          
          <Text style={styles.sectionTitle}>Parking Spot Image</Text>
          
          <TouchableOpacity 
            style={styles.imageUpload}
            onPress={pickImage}
          >
            {spotData.image ? (
              <Image 
                source={{ uri: spotData.image }} 
                style={styles.parkingImage} 
                resizeMode="cover"
              />
            ) : (
              <View style={styles.uploadPlaceholder}>
                <MaterialIcons name="add-photo-alternate" size={50} color="#007AFF" />
                <Text style={styles.uploadText}>Upload Parking Image</Text>
              </View>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>Update Parking Spot</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  formContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 12,
    color: '#333',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    color: '#555',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fafafa',
    minHeight: 120,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: '#ff3b30',
  },
  errorText: {
    color: '#ff3b30',
    fontSize: 12,
    marginTop: 4,
  },
  rowInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  mapContainer: {
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    backgroundColor: '#f0f8ff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  locationButtonText: {
    color: '#007AFF',
    marginLeft: 4,
    fontSize: 14,
  },
  mapInstructions: {
    fontSize: 14,
    color: '#666',
    marginBottom: 0,
    fontStyle: 'italic',
  },
  featuresContainer: {
    marginVertical: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  featureText: {
    fontSize: 16,
    marginLeft: 12,
    color: '#333',
  },
  imageUpload: {
    height: 200,
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
  },
  uploadPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  uploadText: {
    fontSize: 16,
    color: '#007AFF',
    marginTop: 8,
  },
  parkingImage: {
    width: '100%',
    height: '100%',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  disabledButton: {
    backgroundColor: '#aaa',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
}); 