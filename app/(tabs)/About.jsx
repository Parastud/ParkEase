import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native'
import React, { useState } from 'react'
import { SafeAreaView } from 'react-native'
import Animated from 'react-native-reanimated'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { auth } from '../../firebase'
import { signOut } from 'firebase/auth'
import { useRouter } from 'expo-router'
import { FontAwesome } from 'react-native-vector-icons'
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
      // Error checking owner status
    }
  }

  const handleLogout = async () => {
    setIsLoading(true)
    try {
      // Clear local storage to prevent state inconsistency
      await AsyncStorage.removeItem('userSession')
      // Sign out from Firebase
      await signOut(auth)
      // Navigate after both operations complete
      router.replace('/Login')
    } catch (error) {
      // Logout error
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
            className="flex-row items-center mb-4 bg-blue-50 p-3 rounded-lg"
            onPress={() => router.push('/(tabs)/Bookings')}
          >
            <FontAwesome name="calendar" size={24} color="#007AFF" />
            <Text className="text-blue-600 ml-3 text-base font-medium">My Bookings</Text>
            <FontAwesome name="chevron-right" size={20} color="#007AFF" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>

          <TouchableOpacity 
            className="flex-row items-center mb-4 bg-purple-50 p-3 rounded-lg"
            onPress={handleOwnerDashboard}
            disabled={isCheckingOwner}
          >
            <FontAwesome name="building" size={24} color="#5856D6" />
            <Text className="text-purple-600 ml-3 text-base font-medium">
              {isCheckingOwner ? "Checking status..." : "Owner Dashboard"}
            </Text>
            <FontAwesome name="chevron-right" size={20} color="#5856D6" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            className="flex-row items-center bg-red-50 p-3 rounded-lg"
            onPress={handleLogout}
          >
            <FontAwesome name="sign-out" size={24} color="#FF3B30" />
            <Text className="text-red-600 ml-3 text-base font-medium">Logout</Text>
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