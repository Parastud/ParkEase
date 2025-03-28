import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Image,
  Linking,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome, MaterialIcons } from 'react-native-vector-icons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import { getUserBookings, cancelBooking, checkExpiredBookings } from '../../constants/parkingData';
import { auth } from '../../firebase';
import { useRouter, useFocusEffect } from 'expo-router';
import { GlobalState } from '../../constants/usecontext';

export default function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const router = useRouter();
  const { refreshBookings, setRefreshBookings } = useContext(GlobalState);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (refreshBookings) {
      loadUserBookings();
      setRefreshBookings(false);
    }
  }, [refreshBookings]);

  useFocusEffect(
    useCallback(() => {
      loadUserBookings();
      return () => {};
    }, [])
  );

  const loadUserBookings = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      
      if (!auth.currentUser) {
        setError('You must be logged in to view your bookings');
        setIsLoading(false);
        return;
      }
      
      const userBookings = await getUserBookings();
      
      if (userBookings.length === 0) {
        setBookings([]);
      } else {
        userBookings.sort((a, b) => new Date(b.startTime) - new Date(a.startTime) );
        setBookings(userBookings);
      }
      
      setIsLoading(false);
    } catch (error) {
      setError('Error loading bookings');
      setIsLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
      case 'active':
        return '#4CAF50';
      case 'cancelled':
        return '#F44336';
      case 'completed':
        return '#2196F3'; 
      default:
        return '#9E9E9E';
    }
  };

  const handleCancelBooking = (bookingId, parkingSpotId) => {
    Alert.alert(
      "Cancel Booking",
      "Are you sure you want to cancel this booking?",
      [
        { text: "No", style: "cancel" },
        { 
          text: "Yes", 
          style: "destructive",
          onPress: async () => {
            try {
              setIsLoading(true);
              await cancelBooking(bookingId);
              

              await loadUserBookings();
              
              Alert.alert("Success", "Your booking has been cancelled successfully.");
            } catch (error) {
              Alert.alert("Error", error.message || "Failed to cancel booking. Please try again.");
            } finally {
              setIsLoading(false);
            }
          } 
        }
      ]
    );
  };

  const openMapsNavigation = (latitude, longitude, title) => {
    const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
    const latLng = `${latitude},${longitude}`;
    const label = title;
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`
    });

    Linking.openURL(url).catch((err) => {
      Alert.alert('Error', 'Could not open navigation. Please make sure you have a maps app installed.');
    });
  };

  const renderBookingItem = ({ item }) => {
    const startTime = formatDate(item.startTime);
    const endTime = formatDate(item.endTime);
    const isCancellable = item.status === 'confirmed' || item.status === 'active';
    const isPast = new Date(item.endTime) < new Date();
    const isActive = item.status === 'active' || (item.status === 'confirmed' && new Date(item.startTime) <= new Date() && new Date(item.endTime) >= new Date());

    let displayStatus = item.status === 'active' ? 'ACTIVE' : item.status.toUpperCase();
    if (isPast && (item.status === 'active' || item.status === 'confirmed')) {
      displayStatus = 'COMPLETED';
    }
    
    return (
      <View style={styles.bookingItem}>
        <View style={styles.headerRow}>
          <Text style={styles.parkingTitle}>{item.parkingSpotTitle}</Text>
          <View style={[
            styles.statusBadge, 
            { backgroundColor: isPast && (item.status === 'active' || item.status === 'confirmed') 
              ? '#2196F3'
              : getStatusColor(item.status) 
            }
          ]}>
            <Text style={styles.statusText}>{displayStatus}</Text>
          </View>
        </View>
        
        <View style={styles.infoRow}>
          <FontAwesome name="clock-o" size={18} color="#666" />
          <Text style={styles.infoText}>
            From: {startTime}
          </Text>
        </View>
        
        <View style={styles.infoRow}>
          <FontAwesome name="clock-o" size={18} color="#666" />
          <Text style={styles.infoText}>
            To: {endTime}
          </Text>
        </View>
        
        <View style={styles.infoRow}>
          <FontAwesome5 name="money-bill-wave" size={16} color="#666" />
          <Text style={styles.infoText}>
            Total Cost: Rs{item.totalCost.toFixed(2)}
          </Text>
        </View>
        
        <View style={styles.infoRow}>
          <MaterialIcons name="schedule" size={18} color="#666" />
          <Text style={styles.infoText}>
            Duration: {item.duration} hour(s)
          </Text>
        </View>
        
        <View style={styles.actionsRow}>
          {isCancellable && !isPast ? (
            <>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => handleCancelBooking(item.id, item.parkingSpotId)}
              >
                <Text style={styles.cancelButtonText}>Cancel Booking</Text>
              </TouchableOpacity>
              
              {isActive && item.latitude && item.longitude && (
                <TouchableOpacity
                  style={styles.navigateButton}
                  onPress={() => openMapsNavigation(item.latitude, item.longitude, item.parkingSpotTitle)}
                >
                  <FontAwesome name="location-arrow" size={16} color="#fff" />
                  <Text style={styles.navigateButtonText}>Navigate</Text>
                </TouchableOpacity>
              )}
            </>
          ) : isPast && item.status === 'confirmed' ? (
            <View style={styles.completedBadge}>
              <Text style={styles.completedText}>COMPLETED</Text>
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <FontAwesome name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Bookings</Text>
        <View style={{ width: 24 }} />
      </View>
      
      {isLoading && !isRefreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading your bookings...</Text>
        </View>
      ) : bookings.length === 0 ? (
        <View style={styles.emptyContainer}>
          <FontAwesome name="calendar-o" size={100} color="#CCCCCC" />
          <Text style={styles.emptyTitle}>No Bookings Found</Text>
          <Text style={styles.emptyText}>You haven't made any parking bookings yet.</Text>
          <TouchableOpacity 
            style={styles.findButton}
            onPress={() => router.push('/Home')}
          >
            <Text style={styles.findButtonText}>Find Parking</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={bookings}
          renderItem={renderBookingItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl 
              refreshing={isRefreshing} 
              onRefresh={loadUserBookings} 
              colors={["#007AFF"]}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
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
    marginTop: 10,
  },
  listContent: {
    padding: 16,
  },
  bookingItem: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  parkingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
  },
  statusText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F44336',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  cancelButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  completedBadge: {
    backgroundColor: '#EFEFEF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  completedText: {
    color: '#666',
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyImage: {
    width: 150,
    height: 150,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  findButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  findButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  navigateButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  navigateButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  buttonIcon: {
    marginRight: 5,
  },
}); 
