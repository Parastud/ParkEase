import React, { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { FontAwesome } from '@expo/vector-icons'
import { signOut } from 'firebase/auth'
import { auth } from '../../firebase'
import { checkIsRegisteredOwner } from '../../constants/parkingData'
import AsyncStorage from '@react-native-async-storage/async-storage'

const About = () => {
  const router = useRouter()
  const [isCheckingOwner, setIsCheckingOwner] = useState(false)
  const [isRegisteredOwner, setIsRegisteredOwner] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleOwnerDashboard = async () => {
    if (!auth.currentUser) {
      Alert.alert(
        "Authentication Required",
        "Please sign in to access the owner dashboard."
      )
      return
    }
    
    try {
      setIsCheckingOwner(true)
      const ownerStatus = await checkIsRegisteredOwner()
      setIsRegisteredOwner(ownerStatus)
      setIsCheckingOwner(false)
      
      if (ownerStatus) {
        router.push('/(owner)')
      } else {
        router.push('/(owner)/register')
      }
    } catch (error) {
    }
  }

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Logout", 
        style: "destructive", 
        onPress: async () => {
          setIsLoading(true);
          try {
            await AsyncStorage.removeItem('userSession');
            await signOut(auth);
            router.replace('/Login');
          } catch (error) {
            console.log(error);
          } finally {
            setIsLoading(false);
          }
        }
      }
    ]);
  };
  

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 p-6">
        <View className="items-center mb-8 mt-4">
          <Text className="text-3xl font-bold text-gray-800">Account</Text>
        </View>

        <View className="bg-gray-50 rounded-xl p-6 mb-8">
          <Text className="text-lg font-semibold text-gray-800 mb-2">App Information</Text>
          <Text className="text-gray-600 mb-1">Version: 1.0.0</Text>
          <Text className="text-gray-600">ParkEase - Find parking spots easily</Text>
        </View>

        <View className="bg-gray-50 rounded-xl p-6 mb-8">
          <Text className="text-lg font-semibold text-gray-800 mb-4">Account Options</Text>
          
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/(tabs)/Bookings')}
          >
            <FontAwesome name="calendar" size={24} color="#007AFF" />
            <Text style={styles.menuItemText}>Manage Bookings</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={handleOwnerDashboard}
            disabled={isCheckingOwner}
          >
            <FontAwesome name="building" size={24} color="#5856D6" />
            <Text style={styles.menuItemText}>
              {isCheckingOwner ? "Checking status..." : "Parking Owner Dashboard"}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleLogout}
          >
            <FontAwesome name="sign-out" size={24} color="#FF3B30" />
            <Text style={[styles.menuItemText, styles.signOut]}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <View className="bg-gray-50 rounded-xl p-6">
          <Text className="text-lg font-semibold text-gray-800 mb-2">Contact Support</Text>
          <Text className="text-gray-600 mb-1">Email: test@parkease.com</Text>
          <Text className="text-gray-600">Phone: +918384810862</Text>
        </View>

        <View className="flex-1 justify-end">
          <Text className="text-center text-gray-400 text-sm">
            © 2025 ParkEase. All rights reserved.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  )
}

export default About

const styles = StyleSheet.create({
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  menuItemText: {
    fontSize: 16,
    marginLeft: 12,
    color: '#374151',
  },
  signOut: {
    color: '#FF3B30',
  }
})