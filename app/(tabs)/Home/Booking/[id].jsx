import { StyleSheet, Text, View, Modal, TouchableOpacity, ScrollView, Image, Alert, Platform, Button } from 'react-native'
import React, { useEffect, useState, useContext } from 'react'
import { Link, useLocalSearchParams, useRouter } from 'expo-router'
import { FIXED_PARKING_SPOTS } from '../../../../constants/parkingData'
import { GlobalState } from '../../../../constants/usecontext'
import { Redirect } from 'expo-router'
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

const Booking = () => {
  const { id } = useLocalSearchParams();
  const [parkingSpot, setParkingSpot] = useState(null);
  const {modalVisible, setModalVisible} = useContext(GlobalState);
  const router = useRouter();
  
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
    const spot = FIXED_PARKING_SPOTS.find(spot => spot.id == id);
    setParkingSpot(spot);
  }, [id]);
  
  // Calculate total cost when dates change
  useEffect(() => {
    if (parkingSpot) {
      const hourDiff = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60)));
      const price1 = parkingSpot.price.replace('Rs', '')
      const price = parseInt(price1.replace('/hour', ''))
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
  
  const handleBooking = () => {
    Alert.alert(
      "Confirm Booking",
      `Book a spot at ${parkingSpot.title} for Rs${totalCost.toFixed(2)}?`,
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        { 
          text: "Book Now", 
          onPress: () => {
            Alert.alert("Success", "Your parking spot has been booked!");
            setModalVisible(false);
            router.push("/Home");
          }
        }
      ]
    );
  };

  if (!parkingSpot) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading parking spot details...</Text>
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
                <View style={styles.locationRow}>
                  <Ionicons name="location" size={18} color="#666" />
                  <Text style={styles.locationText}>{parkingSpot.description}</Text>
                </View>
                
                <View style={styles.detailsRow}>
                  <View style={styles.detailItem}>
                    <FontAwesome5 name="parking" size={18} color="#007AFF" />
                    <Text style={styles.detailText}>{parkingSpot.spots} spots available</Text>
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
                  <Text style={styles.costValue}>Rs{totalCost.toFixed(2)}</Text>
                </View>
                
                <TouchableOpacity style={styles.bookButton} onPress={handleBooking}>
                  <Text style={styles.bookButtonText}>Book Now</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.policies}>
                <Text style={styles.policiesTitle}>Booking Policies</Text>
                <Text style={styles.policyItem}>• Cancellation is free up to 2 hours before your booking</Text>
                <Text style={styles.policyItem}>• Show your booking confirmation upon arrival</Text>
                <Text style={styles.policyItem}>• Parking rates may vary during peak hours</Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default Booking

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
  loadingText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
})