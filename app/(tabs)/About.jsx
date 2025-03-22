import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native'
import React from 'react'
import { SafeAreaView } from 'react-native'
import Animated from 'react-native-reanimated'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { auth } from '../../Firebase'
import { signOut } from 'firebase/auth'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

const About = () => {
  const router = useRouter()

  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Logout",
          onPress: async () => {
            try {
              // Sign out from Firebase
              await signOut(auth)
              
              // Clear the session from AsyncStorage
              await AsyncStorage.removeItem('userSession')
              
              // Navigate to login screen
              router.replace("/Login")
            } catch (error) {
              console.error("Logout error:", error)
              Alert.alert("Error", "Failed to logout. Please try again.")
            }
          }
        }
      ]
    )
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

        <TouchableOpacity 
          className="bg-red-50 p-4 rounded-xl flex-row items-center justify-between mb-4"
          onPress={handleLogout}
        >
          <View className="flex-row items-center">
            <Ionicons name="log-out-outline" size={24} color="#EF4444" />
            <Text className="text-red-500 font-semibold text-lg ml-3">Logout</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#EF4444" />
        </TouchableOpacity>

        <View className="flex-1 justify-end">
          <Text className="text-center text-gray-400 text-sm">
            © 2023 ParkEase. All rights reserved.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  )
}

export default About

const styles = StyleSheet.create({})