import { StyleSheet, Text, View, Modal, TouchableOpacity, ScrollView, Image, Alert, Platform, Button, ActivityIndicator } from 'react-native'
import React, { useEffect, useState, useContext } from 'react'
import { Link, useLocalSearchParams, useRouter } from 'expo-router'
import { getParkingSpotById, createBooking, checkExpiredBookings } from '../../../../constants/parkingData'
import { GlobalState } from '../../../../constants/usecontext'
import { Redirect } from 'expo-router'
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { auth } from '../../../../firebase';

export default function Booking() {
  const { id } = useLocalSearchParams();
  const [parkingSpot, setParkingSpot] = useState(null);
  const {modalVisible, setModalVisible, setRefreshBookings} = useContext(GlobalState);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  
  // New state variables for booking
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(Date.now() + 2 * 60 * 60 * 1000)); // 2 hours from now
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [totalCost, setTotalCost] = useState(0);
  const [pickerMode, setPickerMode] = useState('date'); // 'date' or 'time'
  const [tempDate, setTempDate] = useState(new Date()); // For Android two-step picker
  const [isStartDatePicker, setIsStartDatePicker] = useState(true); // To track which picker is active
  
  useEffect(() => {
    const fetchParkingSpot = async () => {
      setIsLoading(true);
      try {
        // Check for any expired bookings first to ensure spot availability is accurate
        await checkExpiredBookings();
        
        const fetchedSpot = await getParkingSpotById(id);
        if (fetchedSpot) {
          setParkingSpot(fetchedSpot);
        } else {
          // Handle case when parking spot isn't found
          Alert.alert("Error", "Parking spot not found", [
            { text: "OK", onPress: () => router.push('/Home') }
          ]);
        }
      } catch (error) {
        // Handle error
        Alert.alert("Error", "Failed to load parking spot details", [
          { text: "OK", onPress: () => router.push('/Home') }
        ]);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (id) {
      fetchParkingSpot();
    }
  }, [id]);
  
  // Calculate total cost when dates change
  useEffect(() => {
    if (parkingSpot) {
      const hourDiff = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60)));
      let price = 0;
      
      if (typeof parkingSpot.price === 'string') {
        // Extract numeric value from string like "₹ 150/hour" or number
        const extractPriceValue = (priceString) => {
          if (typeof priceString === 'number') return priceString;
          
          // If it's a string, extract the numeric part using regex
          const matches = priceString.match(/₹\s*(\d+(\.\d+)?)/);
          if (matches && matches[1]) {
            return parseFloat(matches[1]);
          }
          
          // Fallback to old format "Rs 150/hour"
          const oldMatches = priceString.match(/Rs\s*(\d+(\.\d+)?)/);
          if (oldMatches && oldMatches[1]) {
            return parseFloat(oldMatches[1]);
          }
          
          return 0; // Default if no valid price found
        };
        
        price = extractPriceValue(parkingSpot.price);
      } else if (typeof parkingSpot.price === 'number') {
        price = parkingSpot.price;
      }
      
      setTotalCost(hourDiff * price);
    }
  }, [startDate, endDate, parkingSpot]);
  
  // Handle showing the date/time picker based on platform
  const showDateTimePicker = (isStart) => {
    setIsStartDatePicker(isStart);
    if (Platform.OS === 'android') {
      // On Android, we'll show the date picker first
      setPickerMode('date');
      setTempDate(isStart ? startDate : endDate);
    }
    
    if (isStart) {
      setShowStartPicker(true);
    } else {
      setShowEndPicker(true);
    }
  };
  
  // Handler for date/time selection
  const onDateTimeChange = (event, selectedDate) => {
    if (event.type === 'dismissed') {
      // User canceled
      setShowStartPicker(false);
      setShowEndPicker(false);
      return;
    }
    
    if (selectedDate) {
      if (Platform.OS === 'android') {
        // On Android, we need a two-step process
        if (pickerMode === 'date') {
          // Save the date and show time picker
          const newDate = new Date(selectedDate);
          setTempDate(newDate);
          setPickerMode('time');
          return; // Don't hide the picker yet
        } else {
          // We have both date and time now
          const combinedDate = new Date(tempDate);
          combinedDate.setHours(selectedDate.getHours());
          combinedDate.setMinutes(selectedDate.getMinutes());
          
          if (isStartDatePicker) {
            // Validate and set start date
            setStartDate(combinedDate);
            // Adjust end date if needed
            if (endDate < combinedDate) {
              const newEndDate = new Date(combinedDate.getTime() + 2 * 60 * 60 * 1000);
              setEndDate(newEndDate);
            }
          } else {
            // Validate and set end date
            if (combinedDate > startDate) {
              setEndDate(combinedDate);
            } else {
              Alert.alert("Invalid Time", "End time must be after start time");
              const newEndDate = new Date(startDate.getTime() + 1 * 60 * 60 * 1000);
              setEndDate(newEndDate);
            }
          }
        }
      } else {
        // On iOS, we can set the date directly
        if (isStartDatePicker) {
          setStartDate(selectedDate);
          if (endDate < selectedDate) {
            const newEndDate = new Date(selectedDate.getTime() + 2 * 60 * 60 * 1000);
            setEndDate(newEndDate);
          }
        } else {
          if (selectedDate > startDate) {
            setEndDate(selectedDate);
          } else {
            Alert.alert("Invalid Time", "End time must be after start time");
            const newEndDate = new Date(startDate.getTime() + 1 * 60 * 60 * 1000);
            setEndDate(newEndDate);
          }
        }
      }
    }
    
    // Hide the picker
    setShowStartPicker(false);
    setShowEndPicker(false);
  };
  
  const handleBooking = async () => {
    // Check if user is logged in
    if (!auth.currentUser) {
      Alert.alert(
        "Login Required",
        "You need to be logged in to book a parking spot",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Login", onPress: () => {
            setModalVisible(false);
            router.push("/Login");
          }}
        ]
      );
      return;
    }
    
    // Check if there are available spots
    const availableSpots = parkingSpot.availableSpots || parkingSpot.spots || 0;
    if (availableSpots <= 0) {
      Alert.alert("No Spots Available", "Sorry, there are no parking spots available at this location.");
      return;
    }
    
    Alert.alert(
      "Confirm Booking", 
      `Book a spot at ${parkingSpot.title} for ₹${totalCost.toFixed(2)}?`,
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        { 
          text: "Confirm", 
          onPress: () => handleBookingConfirm() 
        }
      ]
    );
  };

  const handleBookingConfirm = async () => {
    try {
      setIsLoading(true);
      
      // Create booking data
      const bookingData = {
        parkingSpotId: parkingSpot.id,
        parkingSpotTitle: parkingSpot.title,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        totalCost: totalCost,
        duration: Math.ceil((endDate - startDate) / (1000 * 60 * 60)), // Duration in hours
        paymentStatus: 'paid', // For simplicity, assume payment is done,
        userId: auth.currentUser.uid, // Add the user ID
        userName: auth.currentUser.displayName || auth.currentUser.email || 'User', // Add user name
        status: 'confirmed' // Set initial status
      };
      
      // Save booking to Firebase
      const newBooking = await createBooking(bookingData);
      
      // Signal that bookings should be refreshed
      if (setRefreshBookings) {
        setRefreshBookings(true);
      }
      
      // Close modal first - this is important to prevent it from reappearing
      setModalVisible(false);
      setIsLoading(false);
      
      // Slight delay before navigation to ensure modal is closed
      setTimeout(() => {
        // Show success message
        Alert.alert(
          "Booking Confirmed", 
          "Your parking spot has been successfully booked! View your booking details now.",
          [{ 
            text: "View Bookings", 
            onPress: () => {
              // Navigate directly to Bookings tab
              router.push("/(tabs)/Bookings");
            }
          }]
        );
      }, 300);
    } catch (error) {
      setIsLoading(false);
      Alert.alert("Booking Failed", error.message || "There was an error creating your booking. Please try again.");
    }
  };

  // Add a useEffect that runs when the modalVisible state changes
  useEffect(() => {
    // When the modal becomes visible, refresh the parking spot data
    if (modalVisible && id) {
      const refreshSpotData = async () => {
        try {
          // Check for expired bookings first to ensure availability is up-to-date
          await checkExpiredBookings();
          
          const freshSpotData = await getParkingSpotById(id);
          if (freshSpotData) {
            setParkingSpot(freshSpotData);
          }
        } catch (error) {
          // Error handling
        }
      };
      
      refreshSpotData();
    }
  }, [modalVisible, id]);

  if (isLoading) {
    return (
      <View style={styles.container} className='justify-center'>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!parkingSpot) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Parking spot not found.</Text>
      </View>
    );
  }

  return (
    <View>
      {!modalVisible ? <Redirect href="/Home"/> : null}
            <Modal
              animationType="slide"
              transparent={true}
              visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="arrow-back" size={24} color="#333" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Booking Details</Text>
              <View style={{ width: 24 }} />
            </View>
            
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Processing your booking...</Text>
              </View>
            ) : (
              <ScrollView style={styles.scrollView}>
                <View style={styles.imageContainer}>
                  <Image 
                    source={{ uri: parkingSpot.image || 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Blue_Disc_Parking_Area_Markings_Blue_Paint.JPG/1280px-Blue_Disc_Parking_Area_Markings_Blue_Paint.JPG' }} 
                    style={styles.image}
                    resizeMode="cover"
                  />
                  <View style={styles.badgeContainer}>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{parkingSpot.price}</Text>
                    </View>
                  </View>
                </View>
                
                <View style={styles.infoSection}>
      <Text style={styles.title}>{parkingSpot.title}</Text>
                  
                  <View style={[
                    styles.availableSpotsBadge, 
                    (parkingSpot.availableSpots === 0 || parkingSpot.spots === 0) ? 
                      styles.unavailableSpotsBadge : {}
                  ]}>
                    <Ionicons 
                      name={(parkingSpot.availableSpots === 0 || parkingSpot.spots === 0) ? 
                        "close-circle" : "checkmark-circle"} 
                      size={16} 
                      color="white" 
                    />
                    <Text style={styles.availableSpotsText}>
                      {parkingSpot.availableSpots || parkingSpot.spots || 0} 
                      {(parkingSpot.availableSpots === 1 || parkingSpot.spots === 1) ? 
                        ' Spot Available' : ' Spots Available'}
                    </Text>
                  </View>
                  
                  <View style={styles.locationRow}>
                    <Ionicons name="location" size={18} color="#666" />
                    <Text style={styles.locationText}>{parkingSpot.description}</Text>
                  </View>
                  
                  <View style={styles.detailsRow}>
                    <View style={styles.detailItem}>
                      <FontAwesome5 name="parking" size={18} color="#007AFF" />
                      <Text style={styles.detailText}>
                        {parkingSpot.price} per hour
                      </Text>
                    </View>
                    <View style={styles.detailItem}>
                      <MaterialIcons name="security" size={18} color="#007AFF" />
                      <Text style={styles.detailText}>24/7 Security</Text>
                    </View>
                  </View>
                </View>
                
                <View style={styles.divider} />
                
                <View style={styles.bookingSection}>
                  <Text style={styles.sectionTitle}>Book Your Spot</Text>
                  
                  <View style={styles.dateTimeSection}>
                    <Text style={styles.dateTimeLabel}>From:</Text>
                    <TouchableOpacity 
                      style={styles.dateTimeButton}
                      onPress={() => showDateTimePicker(true)}
                    >
                      <Ionicons name="time-outline" size={20} color="#007AFF" />
                      <Text style={styles.dateTimeText}>
                        {startDate.toLocaleString()}
                      </Text>
                    </TouchableOpacity>
                    
                    <Text style={styles.dateTimeLabel}>To:</Text>
                    <TouchableOpacity 
                      style={styles.dateTimeButton}
                      onPress={() => showDateTimePicker(false)}
                    >
                      <Ionicons name="time-outline" size={20} color="#007AFF" />
                      <Text style={styles.dateTimeText}>
                        {endDate.toLocaleString()}
                      </Text>
                    </TouchableOpacity>
                    
                    {/* Date/Time Picker */}
                    {(showStartPicker || showEndPicker) && (
                      <DateTimePicker
                        testID="dateTimePicker"
                        value={isStartDatePicker ? 
                          (Platform.OS === 'ios' ? startDate : tempDate) : 
                          (Platform.OS === 'ios' ? endDate : tempDate)}
                        mode={Platform.OS === 'ios' ? 'datetime' : pickerMode}
                        is24Hour={true}
                        display={Platform.OS === 'android' ? 'default' : 'spinner'}
                        onChange={onDateTimeChange}
                        minimumDate={isStartDatePicker ? new Date() : 
                          new Date(startDate.getTime() + 15 * 60 * 1000)}
                      />
                    )}
                  </View>
                  
                  <View style={styles.costSummary}>
                    <Text style={styles.costLabel}>Total Cost:</Text>
                    <Text style={styles.costValue}>₹{totalCost.toFixed(2)}</Text>
                  </View>
                  
                  <TouchableOpacity 
                    style={[
                      styles.bookButton, 
                      (!parkingSpot.availableSpots && !parkingSpot.spots) || 
                      (parkingSpot.availableSpots === 0 || parkingSpot.spots === 0) ? 
                      styles.disabledButton : {}
                    ]} 
                    onPress={handleBooking}
                    disabled={(!parkingSpot.availableSpots && !parkingSpot.spots) || 
                      (parkingSpot.availableSpots === 0 || parkingSpot.spots === 0)}
                  >
                    <Text style={styles.bookButtonText}>
                      {(!parkingSpot.availableSpots && !parkingSpot.spots) || 
                      (parkingSpot.availableSpots === 0 || parkingSpot.spots === 0) ? 
                      'No Spots Available' : 'Book Now'}
                    </Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.policies}>
                  <Text style={styles.policiesTitle}>Booking Policies</Text>
                  <Text style={styles.policyItem}>• Cancellation is free up to 2 hours before your booking</Text>
                  <Text style={styles.policyItem}>• Show your booking confirmation upon arrival</Text>
                  <Text style={styles.policyItem}>• Parking rates may vary during peak hours</Text>
                </View>
              </ScrollView>
            )}
          </View>
    </View>
    </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#fff',
    marginTop: 40,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  scrollView: {
    flex: 1,
  },
  imageContainer: {
    position: 'relative',
    height: 200,
    width: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  badgeContainer: {
    position: 'absolute',
    bottom: 10,
    right: 10,
  },
  badge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    color: 'white',
    fontWeight: 'bold',
  },
  infoSection: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  availableSpotsBadge: {
    backgroundColor: '#28a745',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center'
  },
  availableSpotsText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 5
  },
  unavailableSpotsBadge: {
    backgroundColor: '#dc3545',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  locationText: {
    fontSize: 16,
    color: '#666',
    marginLeft: 6,
    flex: 1,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 5,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  detailText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  divider: {
    height: 8,
    backgroundColor: '#f5f5f5',
  },
  bookingSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  dateTimeSection: {
    marginBottom: 20,
  },
  dateTimeLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  dateTimeText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#333',
  },
  costSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
  },
  costLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  costValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  bookButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  bookButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  policies: {
    padding: 16,
    backgroundColor: '#f9f9f9',
  },
  policiesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  policyItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
  },
  disabledButton: {
    backgroundColor: '#dc3545',
    opacity: 0.8,
  },
})