import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { auth } from '../../firebase';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { getOwnerBookings, checkExpiredBookings, approveBooking, rejectBooking, checkIsRegisteredOwner } from '../../constants/parkingData';

export default function BookingRequests() {
  const router = useRouter();
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all', 'active', 'completed', 'cancelled'

  useFocusEffect(
    useCallback(() => {
      checkAuthStatus();
    }, [])
  );

  const checkAuthStatus = async () => {
    try {
      if (!auth.currentUser) {
        Alert.alert(
          "Authentication Required",
          "Please sign in to access booking requests.",
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
      
      loadBookings();
    } catch (error) {
      Alert.alert("Error", "Could not verify owner status. Please try again.");
    }
  };

  const loadBookings = async () => {
    try {
      setIsLoading(true);
      
      if (!auth.currentUser) {
        Alert.alert(
          "Authentication Required",
          "You need to be logged in to view booking requests.",
          [{ text: "OK", onPress: () => router.replace('/auth/login') }]
        );
        setIsLoading(false);
        return;
      }
      
      // Check for expired bookings first
      await checkExpiredBookings();
      
      // Get all bookings for spots owned by this user
      const ownerBookings = await getOwnerBookings();
      
      // Sort bookings by date (newest first)
      const sortedBookings = ownerBookings.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt) : new Date();
        const dateB = b.createdAt ? new Date(b.createdAt) : new Date();
        return dateB - dateA;
      });
      
      setBookings(sortedBookings);
    } catch (error) {
      Alert.alert(
        "Error", 
        "Failed to load your booking requests. Please try again."
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadBookings();
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
      case 'active':
        return '#4CAF50'; // Green
      case 'cancelled':
      case 'rejected':
        return '#F44336'; // Red
      case 'completed':
        return '#2196F3'; // Blue
      case 'pending':
        return '#FFC107'; // Yellow
      default:
        return '#9E9E9E'; // Gray
    }
  };

  const handleApproveBooking = (bookingId) => {
    Alert.alert(
      "Approve Booking",
      "Are you sure you want to approve this booking?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Approve", 
          onPress: async () => {
            try {
              setIsLoading(true);
              await approveBooking(bookingId);
              
              // Reload bookings to get fresh data
              await loadBookings();
              
              Alert.alert("Success", "Booking has been approved successfully.");
            } catch (error) {
              Alert.alert("Error", error.message || "Failed to approve booking. Please try again.");
            } finally {
              setIsLoading(false);
            }
          } 
        }
      ]
    );
  };

  const handleRejectBooking = (bookingId) => {
    Alert.alert(
      "Reject Booking",
      "Are you sure you want to reject this booking?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Reject", 
          style: "destructive",
          onPress: async () => {
            try {
              setIsLoading(true);
              await rejectBooking(bookingId);
              
              // Reload bookings to get fresh data
              await loadBookings();
              
              Alert.alert("Success", "Booking has been rejected successfully.");
            } catch (error) {
              Alert.alert("Error", error.message || "Failed to reject booking. Please try again.");
            } finally {
              setIsLoading(false);
            }
          } 
        }
      ]
    );
  };

  const filteredBookings = () => {
    if (filter === 'all') return bookings;
    
    return bookings.filter(booking => {
      if (filter === 'active') 
        return booking.status === 'active' || booking.status === 'confirmed';
      return booking.status === filter;
    });
  };

  const renderBookingItem = ({ item }) => {
    const startTime = formatDate(item.startTime);
    const endTime = formatDate(item.endTime);
    
    // Check if booking is in the past
    const isPast = new Date(item.endTime) < new Date();
    const isPending = item.status === 'pending';
    const displayStatus = item.status.toUpperCase();
    
    return (
      <View style={styles.bookingItem}>
        <View style={styles.headerRow}>
          <Text style={styles.parkingTitle}>{item.parkingSpotTitle}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{displayStatus}</Text>
          </View>
        </View>
        
        <View style={styles.infoRow}>
          <Ionicons name="person-outline" size={18} color="#666" />
          <Text style={styles.infoText}>
            Booked by: {item.userName || "User"}
          </Text>
        </View>
        
        <View style={styles.infoRow}>
          <Ionicons name="time-outline" size={18} color="#666" />
          <Text style={styles.infoText}>
            From: {startTime}
          </Text>
        </View>
        
        <View style={styles.infoRow}>
          <Ionicons name="time-outline" size={18} color="#666" />
          <Text style={styles.infoText}>
            To: {endTime}
          </Text>
        </View>
        
        <View style={styles.infoRow}>
          <FontAwesome5 name="money-bill-wave" size={16} color="#666" />
          <Text style={styles.infoText}>
            Revenue: ₹{item.totalCost?.toFixed(2) || '0.00'}
          </Text>
        </View>
        
        <View style={styles.infoRow}>
          <MaterialIcons name="schedule" size={18} color="#666" />
          <Text style={styles.infoText}>
            Duration: {item.duration || '0'} hour(s)
          </Text>
        </View>
        
        {isPending && !isPast && (
          <View style={styles.actionsRow}>
            <TouchableOpacity 
              style={styles.approveButton}
              onPress={() => handleApproveBooking(item.id)}
            >
              <Text style={styles.approveButtonText}>Approve</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.rejectButton}
              onPress={() => handleRejectBooking(item.id)}
            >
              <Text style={styles.rejectButtonText}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.filterContainer}>
        <TouchableOpacity 
          style={[styles.filterButton, filter === 'all' && styles.activeFilter]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.activeFilterText]}>All</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.filterButton, filter === 'active' && styles.activeFilter]}
          onPress={() => setFilter('active')}
        >
          <Text style={[styles.filterText, filter === 'active' && styles.activeFilterText]}>Active</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.filterButton, filter === 'completed' && styles.activeFilter]}
          onPress={() => setFilter('completed')}
        >
          <Text style={[styles.filterText, filter === 'completed' && styles.activeFilterText]}>Completed</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.filterButton, filter === 'cancelled' && styles.activeFilter]}
          onPress={() => setFilter('cancelled')}
        >
          <Text style={[styles.filterText, filter === 'cancelled' && styles.activeFilterText]}>Cancelled</Text>
        </TouchableOpacity>
      </View>
      
      {isLoading && !isRefreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading booking requests...</Text>
        </View>
      ) : filteredBookings().length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={100} color="#CCCCCC" />
          <Text style={styles.emptyTitle}>No Bookings Found</Text>
          <Text style={styles.emptyText}>
            {filter === 'all' 
              ? "You don't have any bookings yet." 
              : `No ${filter} bookings found.`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredBookings()}
          renderItem={renderBookingItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl 
              refreshing={isRefreshing} 
              onRefresh={handleRefresh} 
              colors={["#007AFF"]}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 4,
  },
  activeFilter: {
    backgroundColor: '#E8F4FF',
  },
  filterText: {
    fontSize: 14,
    color: '#666',
  },
  activeFilterText: {
    color: '#007AFF',
    fontWeight: 'bold',
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
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  approveButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
  },
  approveButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  rejectButton: {
    backgroundColor: '#F44336',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    flex: 1,
    marginLeft: 8,
    alignItems: 'center',
  },
  rejectButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
}); 