import React, { useState, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, Switch, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { BlurView } from 'expo-blur'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { MaterialIcons } from '@expo/vector-icons'
import { signOut, updateProfile } from 'firebase/auth'
import { auth } from '../../firebase'
import { checkIsRegisteredOwner } from '../../constants/parkingData'

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
    setIsLoading(true)
    try {
      await AsyncStorage.removeItem('userSession')
      await signOut(auth)
      router.replace('/Login')
    } catch (error) {
      setIsLoading(false)
    }
  }

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
            <MaterialIcons name="calendar-today" size={24} color="#007AFF" />
            <Text style={styles.menuItemText}>Manage Bookings</Text>
            <MaterialIcons name="arrow-forward-ios" size={20} color="#007AFF" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={handleOwnerDashboard}
            disabled={isCheckingOwner}
          >
            <MaterialIcons name="business" size={24} color="#5856D6" />
            <Text style={styles.menuItemText}>
              {isCheckingOwner ? "Checking status..." : "Parking Owner Dashboard"}
            </Text>
            <MaterialIcons name="arrow-forward-ios" size={20} color="#5856D6" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleLogout}
          >
            <MaterialIcons name="logout" size={24} color="#FF3B30" />
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

const styles = StyleSheet.create({})