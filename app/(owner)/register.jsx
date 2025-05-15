import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { FontAwesome } from 'react-native-vector-icons';
import { router } from 'expo-router';
import { auth, db } from '../../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export default function OwnerRegistration() {
  const [isLoading, setIsLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isAlreadyRegistered, setIsAlreadyRegistered] = useState(false);
  const [formData, setFormData] = useState({
    businessName: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    phoneNumber: '',
    taxId: '',
    description: ''
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    checkAuthStatus();
    checkOwnerStatus();
  }, []);

  const checkAuthStatus = () => {
    if (!auth.currentUser) {
      Alert.alert(
        "Authentication Required",
        "You need to be logged in to register as a parking owner.",
        [{ text: "OK", onPress: () => router.replace('/auth/login') }]
      );
      router.replace('/Home');
    }
  };

  const checkOwnerStatus = async () => {
    try {
      setIsLoading(true);
      
      if (!auth.currentUser) {
        setIsLoading(false);
        return;
      }
      
      const userId = auth.currentUser.uid;
      const userRef = doc(db, "parkingOwners", userId);
      const docSnap = await getDoc(userRef);
      
      if (docSnap.exists()) {

        setIsAlreadyRegistered(true);
        const ownerData = docSnap.data();
        

        setFormData({
          businessName: ownerData.businessName || '',
          address: ownerData.address || '',
          city: ownerData.city || '',
          state: ownerData.state || '',
          pincode: ownerData.pincode || '',
          phoneNumber: ownerData.phoneNumber || '',
          taxId: ownerData.taxId || '',
          description: ownerData.description || ''
        });
      }
    } catch (error) {
      console.error('Error checking owner status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData({
      ...formData,
      [field]: value
    });
    

    if (errors[field]) {
      setErrors({
        ...errors,
        [field]: null
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.businessName.trim()) newErrors.businessName = 'Business name is required';
    if (!formData.address.trim()) newErrors.address = 'Address is required';
    if (!formData.city.trim()) newErrors.city = 'City is required';
    if (!formData.state.trim()) newErrors.state = 'State is required';
    if (!formData.pincode.trim()) newErrors.pincode = 'Pincode is required';
    if (!formData.phoneNumber.trim()) newErrors.phoneNumber = 'Phone number is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert("Form Error", "Please fix the errors before submitting.");
      return;
    }
    
    setIsRegistering(true);
    
    try {
      const userId = auth.currentUser.uid;
      const userEmail = auth.currentUser.email;
      

      await setDoc(doc(db, "parkingOwners", userId), {
        ...formData,
        userId,
        email: userEmail,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: isAlreadyRegistered ? 'active' : 'pending', // New registrations might need approval
      });
      

      await setDoc(doc(db, "users", userId), {
        name: auth.currentUser.displayName || '',
        email: userEmail,
        role: 'owner',
        updatedAt: new Date()
      }, { merge: true });
      
      Alert.alert(
        "Success!",
        isAlreadyRegistered
          ? "Your owner profile has been updated successfully."
          : "Your parking owner registration has been submitted successfully!",
        [{ text: "OK", onPress: () => router.push('/(owner)') }]
      );
    } catch (error) {
      console.error('Error registering as parking owner:', error);
      Alert.alert("Registration Failed", "There was an error submitting your registration. Please try again.");
    } finally {
      setIsRegistering(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading...</Text>
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
            <FontAwesome name="arrow-left" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isAlreadyRegistered ? 'Update Owner Profile' : 'Register as Parking Owner'}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.sectionTitle}>Business Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Business Name</Text>
            <TextInput
              style={[styles.input, errors.businessName && styles.inputError]}
              value={formData.businessName}
              onChangeText={(text) => handleInputChange('businessName', text)}
              placeholder="Your parking business name"
            />
            {errors.businessName && <Text style={styles.errorText}>{errors.businessName}</Text>}
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Business Description</Text>
            <TextInput
              style={styles.textArea}
              value={formData.description}
              onChangeText={(text) => handleInputChange('description', text)}
              placeholder="Describe your parking business"
              multiline={true}
              numberOfLines={4}
            />
          </View>
          
          <Text style={styles.sectionTitle}>Contact Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Address</Text>
            <TextInput
              style={[styles.input, errors.address && styles.inputError]}
              value={formData.address}
              onChangeText={(text) => handleInputChange('address', text)}
              placeholder="Street address"
            />
            {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}
          </View>
          
          <View style={styles.rowInputs}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>City</Text>
              <TextInput
                style={[styles.input, errors.city && styles.inputError]}
                value={formData.city}
                onChangeText={(text) => handleInputChange('city', text)}
                placeholder="City"
              />
              {errors.city && <Text style={styles.errorText}>{errors.city}</Text>}
            </View>
            
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>State</Text>
              <TextInput
                style={[styles.input, errors.state && styles.inputError]}
                value={formData.state}
                onChangeText={(text) => handleInputChange('state', text)}
                placeholder="State"
              />
              {errors.state && <Text style={styles.errorText}>{errors.state}</Text>}
            </View>
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Pincode</Text>
            <TextInput
              style={[styles.input, errors.pincode && styles.inputError]}
              value={formData.pincode}
              onChangeText={(text) => handleInputChange('pincode', text)}
              placeholder="Postal code"
              keyboardType="number-pad"
            />
            {errors.pincode && <Text style={styles.errorText}>{errors.pincode}</Text>}
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={[styles.input, errors.phoneNumber && styles.inputError]}
              value={formData.phoneNumber}
              onChangeText={(text) => handleInputChange('phoneNumber', text)}
              placeholder="Business phone number"
              keyboardType="phone-pad"
            />
            {errors.phoneNumber && <Text style={styles.errorText}>{errors.phoneNumber}</Text>}
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tax ID / GST Number (Optional)</Text>
            <TextInput
              style={styles.input}
              value={formData.taxId}
              onChangeText={(text) => handleInputChange('taxId', text)}
              placeholder="For business tax purposes"
            />
          </View>
          
          <TouchableOpacity
            style={[styles.submitButton, isRegistering && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={isRegistering}
          >
            {isRegistering ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>
                {isAlreadyRegistered ? 'Update Profile' : 'Register as Owner'}
              </Text>
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
    textAlign: 'center',
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
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  disabledButton: {
    backgroundColor: '#B0C4DE',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 
