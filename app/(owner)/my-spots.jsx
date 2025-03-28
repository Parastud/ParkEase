import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl
} from 'react-native';
import { FontAwesome, MaterialIcons } from 'react-native-vector-icons';
import { getParkingSpotsForOwner, deleteParkingSpot, checkIsRegisteredOwner } from '../../constants/parkingData';
import { useRouter, useFocusEffect } from 'expo-router';
import { auth } from '../../firebase';

export default function MyParkingSpots() {
  const [spots, setSpots] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      checkAuthStatus();
    }, [])
  );

  const checkAuthStatus = async () => {
    if (!auth.currentUser) {
      Alert.alert(
        "Authentication Required",
        "Please sign in to access your parking spots.",
        [{ text: "OK", onPress: () => router.push('/About') }]
      );
      return;
    }
    
    try {
      const isOwner = await checkIsRegisteredOwner();
      if (!isOwner) {
        Alert.alert(
          "Registration Required",
          "You need to register as a parking spot owner first.",
          [{ text: "Register Now", onPress: () => router.push('/(owner)/register') }]
        );
        return;
      }
      
      loadParkingSpots();
    } catch (error) {
      console.error("Error checking owner status:", error);
      Alert.alert("Error", "Could not verify owner status. Please try again.");
    }
  };

  const loadParkingSpots = async () => {
    try {
      setIsLoading(true);
      setError(null);
      

      if (!auth.currentUser) {
        setError('You must be logged in to view your parking spots');
        setIsLoading(false);
        return;
      }
      
      const userId = auth.currentUser.uid;
      const userSpots = await getParkingSpotsForOwner(userId);
      

      const sortedSpots = userSpots.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
        const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
        return dateB - dateA;
      });
      
      setSpots(sortedSpots);
      setIsLoading(false);
      setIsRefreshing(false);
    } catch (error) {
      setError('Failed to load parking spots');
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadParkingSpots();
  };

  const confirmDelete = (id, title) => {
    Alert.alert(
      "Confirm Deletion",
      `Are you sure you want to delete "${title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => handleDelete(id) }
      ]
    );
  };

  const handleDelete = async (id) => {
    try {
      await deleteParkingSpot(id);

      setSpots(spots.filter(spot => spot.id !== id));
      Alert.alert("Success", "Parking spot deleted successfully.");
    } catch (error) {
      console.error('Error deleting parking spot:', error);
      Alert.alert("Error", "Failed to delete parking spot. Please try again.");
    }
  };

  const handleEdit = (id) => {
    router.push(`/(owner)/edit-spot?id=${id}`);
  };

  const handleAddNew = () => {
    router.push('/(owner)/add-spot');
  };

  const renderItem = ({ item }) => (
    <View style={styles.spotCard}>
      <Image 
        source={{ uri: item.image || 'https://via.placeholder.com/300x150?text=No+Image' }} 
        style={styles.spotImage}
        resizeMode="cover"
      />
      
      <View style={styles.spotContent}>
        <View style={styles.spotHeader}>
          <Text style={styles.spotTitle}>{item.title}</Text>
          <Text style={styles.spotPrice}>₹{item.price}/hr</Text>
        </View>
        
        <Text style={styles.spotAddress} numberOfLines={2}>{item.address}</Text>
        
        <View style={styles.spotStats}>
          <View style={styles.spotStat}>
            <Text style={styles.spotStatLabel}>Total spots</Text>
            <Text style={styles.spotStatValue}>{item.totalSpots}</Text>
          </View>
          
          <View style={styles.spotStat}>
            <Text style={styles.spotStatLabel}>Available</Text>
            <Text style={styles.spotStatValue}>{item.availableSpots}</Text>
          </View>
        </View>
        
        <View style={styles.spotActions}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.editButton]} 
            onPress={() => handleEdit(item.id)}
          >
            <FontAwesome name="pencil" size={16} color="#fff" />
            <Text style={styles.actionText}>Edit</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.deleteButton]} 
            onPress={() => confirmDelete(item.id, item.title)}
          >
            <FontAwesome name="trash" size={16} color="#fff" />
            <Text style={styles.actionText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (isLoading && !isRefreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading your parking spots...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerButtons}>
        <TouchableOpacity style={styles.refreshButton} onPress={loadParkingSpots}>
          <FontAwesome name="refresh" size={24} color="#007AFF" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.addButton} onPress={handleAddNew}>
          <FontAwesome name="plus-circle" size={24} color="#007AFF" />
          <Text style={styles.addButtonText}>Add New</Text>
        </TouchableOpacity>
      </View>
      
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadParkingSpots}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {!error && spots.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="local-parking" size={80} color="#ccc" />
          <Text style={styles.emptyTitle}>No Parking Spots</Text>
          <Text style={styles.emptyMessage}>
            You haven't added any parking spots yet. Add your first spot to start earning.
          </Text>
          <TouchableOpacity style={styles.emptyButton} onPress={handleAddNew}>
            <Text style={styles.emptyButtonText}>Add Parking Spot</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={spots}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={["#007AFF"]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  refreshButton: {
    padding: 8,
    marginRight: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  addButtonText: {
    color: '#007AFF',
    marginLeft: 4,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  listContent: {
    padding: 16,
  },
  spotCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  spotImage: {
    width: '100%',
    height: 150,
  },
  spotContent: {
    padding: 16,
  },
  spotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  spotTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  spotPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  spotAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  spotStats: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  spotStat: {
    marginRight: 24,
  },
  spotStatLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  spotStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  spotActions: {
    flexDirection: 'row',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginRight: 8,
  },
  actionText: {
    color: '#fff',
    fontWeight: '500',
    marginLeft: 6,
  },
  editButton: {
    backgroundColor: '#4CAF50',
  },
  deleteButton: {
    backgroundColor: '#F44336',
  },
  errorContainer: {
    padding: 16,
    backgroundColor: '#ffebee',
    margin: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  errorText: {
    color: '#d32f2f',
    marginBottom: 8,
  },
  retryButton: {
    backgroundColor: '#d32f2f',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  retryText: {
    color: '#fff',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
}); 
