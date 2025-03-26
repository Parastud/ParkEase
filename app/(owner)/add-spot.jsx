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
  Platform,
  Dimensions
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { addParkingSpot, uploadParkingImage, checkIsRegisteredOwner } from '../../constants/parkingData';
import { router } from 'expo-router';
import { auth } from '../../firebase';
import * as ImagePicker from 'expo-image-picker';
import MapView, { Marker } from 'react-native-maps';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as Location from 'expo-location';

const storage = getStorage();

export default function AddParkingSpot() {
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
    images: [],
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
    getCurrentLocation();
  }, []);

  const checkAuthStatus = async () => {
    try {
      if (!auth.currentUser) {
        Alert.alert(
          "Authentication Required",
          "Please sign in to add parking spots.",
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
      
      setIsLoading(false);
    } catch (error) {
      console.error("Error checking owner status:", error);
      Alert.alert("Error", "Could not verify owner status. Please try again.");
    }
  };

  const getCurrentLocation = async () => {
    setIsLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Permission to access location was denied');
        setIsLoadingLocation(false);
        return;
      }
      
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });
      
      const { latitude, longitude } = location.coords;
      

      setSpotData(prevData => ({
        ...prevData,
        location: { latitude, longitude }
      }));
      

      setMapRegion({
        latitude,
        longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005
      });
      

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
          
          setSpotData(prevData => ({
            ...prevData,
            address: formattedAddress
          }));
        }
      } catch (error) {

        setErrors(prev => ({
          ...prev,
          address: 'Could not determine address, please enter manually.'
        }));
      }
    } catch (error) {
      Alert.alert('Location Error', 'Failed to get your current location. Please set it manually on the map.');
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!spotData.title.trim()) newErrors.title = 'Title is required';
    if (!spotData.description.trim()) newErrors.description = 'Description is required';
    if (!spotData.address.trim()) newErrors.address = 'Address is required';
    if (!spotData.price.trim()) newErrors.price = 'Price is required';
    if (!spotData.totalSpots.trim()) newErrors.totalSpots = 'Total spots is required';
    

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
      handleInputChange('images', [...spotData.images, result.assets[0].uri]);
    }
  };

  const handleMapPress = (e) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    

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
      

      if (errors.location) {
        setErrors({
          ...errors,
          location: null
        });
      }
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert("Form Error", "Please fix the errors in the form before submitting.");
      return;
    }
    
    setIsSubmitting(true);
    
    try {

      const { latitude, longitude } = spotData.location;
      

      const totalSpots = parseInt(spotData.totalSpots, 10);
      
      const spotDataForSubmit = {
        ...spotData,

        latitude,
        longitude,
        price: parseFloat(spotData.price),
        totalSpots: totalSpots,
        availableSpots: totalSpots, // Initialize available spots with the same value as total spots
        images: spotData.images,
      };
      
      const result = await addParkingSpot(spotDataForSubmit);
      
      Alert.alert(
        "Success!",
        "Your parking spot has been added successfully.",
        [{ text: "OK", onPress: () => router.push('/(owner)') }]
      );
    } catch (error) {
      Alert.alert("Submission Failed", error.message || "There was an error adding your parking spot. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <Text style={styles.headerTitle}>Add New Parking Spot</Text>
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
              onPress={getCurrentLocation}
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
                <Marker
                  coordinate={spotData.location}
                  title="Parking Location"
                />
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
                Available spots will be managed automatically based on bookings
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
          
          <Text style={styles.sectionTitle}>Parking Spot Images</Text>
          
          <View style={styles.imagesContainer}>
            {spotData.images.map((image, index) => (
              <Image 
                key={index}
                source={{ uri: image }} 
                style={styles.parkingImage} 
                resizeMode="cover"
              />
            ))}
          </View>
          
          <TouchableOpacity 
            style={styles.imageUpload}
            onPress={pickImage}
          >
            <View style={styles.uploadPlaceholder}>
              <MaterialIcons name="add-photo-alternate" size={50} color="#007AFF" />
              <Text style={styles.uploadText}>Upload More Images</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>Add Parking Spot</Text>
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
  mapInstructions: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
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
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  parkingImage: {
    width: '50%',
    height: 200,
    marginBottom: 8,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    color: '#555',
  },
}); 
