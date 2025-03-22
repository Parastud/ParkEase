import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native'
import React, { useState } from 'react'
import Animated, { FlipInEasyX, FlipOutEasyX } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { auth } from '../../Firebase'
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const router = useRouter()

  const validateForm = () => {
    const newErrors = {}
    
    // Validate name
    if (!name.trim()) {
      newErrors.name = 'Name is required'
    }
    
    // Validate email
    if (!email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^\S+@\S+\.\S+$/.test(email)) {
      newErrors.email = 'Email is invalid'
    }
    
    // Validate password
    if (!password) {
      newErrors.password = 'Password is required'
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }
    
    // Validate confirm password
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password'
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleRegister = async () => {
    if (!validateForm()) {
      return
    }
    
    setIsLoading(true)
    try {
      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      
      // Update profile with name
      await updateProfile(userCredential.user, {
        displayName: name
      })
      
      // Save session data
      await AsyncStorage.setItem('userSession', JSON.stringify({
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        displayName: name,
        lastLogin: new Date().toISOString()
      }))
      
      // Navigate to home
      router.replace('/Home')
    } catch (error) {
      let errorMessage = 'Failed to register'
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'This email is already registered'
          break
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address'
          break
        case 'auth/weak-password':
          errorMessage = 'Password is too weak'
          break
        default:
          errorMessage = error.message
      }
      Alert.alert('Registration Error', errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <Animated.View 
          entering={FlipInEasyX} 
          exiting={FlipOutEasyX}
          className="flex-1 p-6"
        >
          <View className="items-center mb-6">
            <Text className="text-3xl font-bold text-gray-800">Create Account</Text>
            <Text className="text-gray-500 mt-2 text-center">
              Sign up to start finding parking spots near you
            </Text>
          </View>
          
          <View className="mb-6">
            <View className="mb-4">
              <Text className="text-gray-700 mb-1 font-medium">Full Name</Text>
              <View className="flex-row items-center border rounded-xl bg-gray-50 px-3">
                <Ionicons name="person-outline" size={20} color="#9ca3af" />
                <TextInput
                  placeholder="John Doe"
                  value={name}
                  onChangeText={setName}
                  className="flex-1 p-3"
                  placeholderTextColor="#9ca3af"
                />
              </View>
              {errors.name ? <Text className="text-red-500 mt-1">{errors.name}</Text> : null}
            </View>
            
            <View className="mb-4">
              <Text className="text-gray-700 mb-1 font-medium">Email</Text>
              <View className="flex-row items-center border rounded-xl bg-gray-50 px-3">
                <Ionicons name="mail-outline" size={20} color="#9ca3af" />
                <TextInput
                  placeholder="example@email.com"
                  value={email}
                  onChangeText={setEmail}
                  className="flex-1 p-3"
                  placeholderTextColor="#9ca3af"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              {errors.email ? <Text className="text-red-500 mt-1">{errors.email}</Text> : null}
            </View>
            
            <View className="mb-4">
              <Text className="text-gray-700 mb-1 font-medium">Password</Text>
              <View className="flex-row items-center border rounded-xl bg-gray-50 px-3">
                <Ionicons name="lock-closed-outline" size={20} color="#9ca3af" />
                <TextInput
                  placeholder="Min. 6 characters"
                  value={password}
                  onChangeText={setPassword}
                  className="flex-1 p-3"
                  placeholderTextColor="#9ca3af"
                  secureTextEntry
                />
              </View>
              {errors.password ? <Text className="text-red-500 mt-1">{errors.password}</Text> : null}
            </View>
            
            <View className="mb-6">
              <Text className="text-gray-700 mb-1 font-medium">Confirm Password</Text>
              <View className="flex-row items-center border rounded-xl bg-gray-50 px-3">
                <Ionicons name="lock-closed-outline" size={20} color="#9ca3af" />
                <TextInput
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  className="flex-1 p-3"
                  placeholderTextColor="#9ca3af"
                  secureTextEntry
                />
              </View>
              {errors.confirmPassword ? <Text className="text-red-500 mt-1">{errors.confirmPassword}</Text> : null}
            </View>
          </View>
          
          <TouchableOpacity
            className={`bg-blue-500 p-4 rounded-xl mb-4 ${isLoading ? 'opacity-70' : ''}`}
            onPress={handleRegister}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white text-center font-semibold text-lg">
                Create Account
              </Text>
            )}
          </TouchableOpacity>
          
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  )
}