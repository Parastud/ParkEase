import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { FontAwesome } from 'react-native-vector-icons';
import { auth } from '../../firebase';
import { getParkingSpotsForOwner, getOwnerBookings, checkIsRegisteredOwner } from '../../constants/parkingData';

const OwnerDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSpots: 0,
    totalBookings: 0,
    activeBookings: 0,
    totalRevenue: 0
  });

  useEffect(() => {
    checkOwnerStatus();
  }, []);

  const checkOwnerStatus = async () => {
    try {
      if (!auth.currentUser) {
        Alert.alert(
          "Authentication Required",
          "Please sign in to access the owner dashboard.",
          [{ text: "OK", onPress: () => router.push('/About') }]
        );
        return;
      }
      
      const isOwner = await checkIsRegisteredOwner();
      if (!isOwner) {
        router.replace('/Home');
        return;
      }
      
      loadOwnerData();
    } catch (error) {
      console.error("Error checking owner status:", error);
      Alert.alert("Error", "Could not verify owner status. Please try again.");
    }
  };

  const loadOwnerData = async () => {
    try {
      setLoading(true);
      
      if (!auth.currentUser) {
        Alert.alert('Error', 'You must be logged in to view this page');
        router.push('/About');
        return;
      }


      const spots = await getParkingSpotsForOwner(auth.currentUser.uid);
      

      const bookings = await getOwnerBookings();
      

      const activeBookings = bookings.filter(booking => 
        booking.status === 'approved' && new Date(booking.endTime) > new Date()
      );
      
      const totalRevenue = bookings
        .filter(booking => booking.status === 'approved' || booking.status === 'completed')
        .reduce((sum, booking) => sum + (booking.totalCost || 0), 0);

      setStats({
        totalSpots: spots.length,
        totalBookings: bookings.length,
        activeBookings: activeBookings.length,
        totalRevenue: totalRevenue
      });
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading owner data:', error);
      Alert.alert('Error', 'Failed to load owner data');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text style={styles.loadingText}>Loading owner dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Owner Dashboard</Text>
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={loadOwnerData}
        >
          <FontAwesome name="refresh" size={24} color="#007BFF" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.totalSpots}</Text>
          <Text style={styles.statLabel}>Parking Spots</Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.totalBookings}</Text>
          <Text style={styles.statLabel}>Total Bookings</Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.activeBookings}</Text>
          <Text style={styles.statLabel}>Active Bookings</Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={styles.statValue}>₹{stats.totalRevenue}</Text>
          <Text style={styles.statLabel}>Total Revenue</Text>
        </View>
      </View>
      
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      
      <View style={styles.actionsContainer}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => router.push('/(owner)/my-spots')}
        >
          <FontAwesome name="car" size={32} color="#007BFF" />
          <Text style={styles.actionText}>Manage Spots</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => router.push('/(owner)/booking-requests')}
        >
          <FontAwesome name="calendar" size={32} color="#007BFF" />
          <Text style={styles.actionText}>Booking Requests</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => router.push('/(owner)/add-spot')}
        >
          <FontAwesome name="plus-circle" size={32} color="#007BFF" />
          <Text style={styles.actionText}>Add New Spot</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => router.push('/(owner)/profile')}
        >
          <FontAwesome name="user" size={32} color="#007BFF" />
          <Text style={styles.actionText}>Owner Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 50,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  refreshButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
  },
});

export default OwnerDashboard; 
