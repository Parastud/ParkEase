import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native'
import React, { useState } from 'react'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { auth } from '../../firebase'
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { useRouter } from 'expo-router'
import { MaterialIcons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'

const Register = () => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)
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
    
    // Validate terms acceptance
    if (!acceptTerms) {
      newErrors.terms = 'You must accept the Terms & Conditions'
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
  
  const handleGoogleSignUp = async () => {
    try {
      setIsLoading(true);
      
      // This is just a placeholder for now
      // We'll implement proper Google Sign Up when the native modules issue is resolved
      setTimeout(() => {
        // For testing purposes, let's just show an alert
        Alert.alert("Google Sign Up", "Google Sign Up will be implemented in the production version.");
        setIsLoading(false);
      }, 1500);
      
    } catch (error) {
      Alert.alert("Error", "Failed to start Google sign up process")
      setIsLoading(false);
    }
  }

  return (
    <ScrollView 
      className="flex-1" 
      contentContainerClassName="pb-12"
      showsVerticalScrollIndicator={false}
    >
      <View className="px-6 py-6">
        <Animated.Text 
          entering={FadeInDown.delay(100).duration(500).springify()}
          className="text-2xl font-bold text-gray-800 mb-1"
        >
          Create Account
        </Animated.Text>
        <Animated.Text 
          entering={FadeInDown.delay(200).duration(500).springify()}
          className="text-gray-500 mb-6"
        >
          Sign up to find parking spots near you
        </Animated.Text>
        
        <Animated.View 
          entering={FadeInDown.delay(300).duration(500).springify()}
          className="mb-4"
        >
          <Text className="text-gray-700 mb-2 font-medium">Full Name</Text>
          <View className="flex-row items-center border border-gray-300 rounded-xl px-4 bg-gray-50">
            <MaterialIcons name="person" size={20} color="#6b7280" />
            <TextInput
              placeholder="John Doe"
              value={name}
              onChangeText={setName}
              className="flex-1 py-3 px-2"
              placeholderTextColor="#9ca3af"
            />
          </View>
          {errors.name && <Text className="text-red-500 mt-1 ml-1 text-xs">{errors.name}</Text>}
        </Animated.View>
        
        <Animated.View 
          entering={FadeInDown.delay(400).duration(500).springify()}
          className="mb-4"
        >
          <Text className="text-gray-700 mb-2 font-medium">Email Address</Text>
          <View className="flex-row items-center border border-gray-300 rounded-xl px-4 bg-gray-50">
            <MaterialIcons name="email" size={20} color="#6b7280" />
            <TextInput
              placeholder="example@email.com"
              value={email}
              onChangeText={setEmail}
              className="flex-1 py-3 px-2"
              placeholderTextColor="#9ca3af"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          {errors.email && <Text className="text-red-500 mt-1 ml-1 text-xs">{errors.email}</Text>}
        </Animated.View>
        
        <Animated.View 
          entering={FadeInDown.delay(500).duration(500).springify()}
          className="mb-4"
        >
          <Text className="text-gray-700 mb-2 font-medium">Password</Text>
          <View className="flex-row items-center border border-gray-300 rounded-xl px-4 bg-gray-50">
            <MaterialIcons name="lock" size={20} color="#6b7280" />
            <TextInput
              placeholder="Min. 6 characters"
              value={password}
              onChangeText={setPassword}
              className="flex-1 py-3 px-2"
              placeholderTextColor="#9ca3af"
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <MaterialIcons
                name={showPassword ? "visibility-off" : "visibility"}
                size={20}
                color="#6b7280"
              />
            </TouchableOpacity>
          </View>
          {errors.password && <Text className="text-red-500 mt-1 ml-1 text-xs">{errors.password}</Text>}
        </Animated.View>
        
        <Animated.View 
          entering={FadeInDown.delay(600).duration(500).springify()}
          className="mb-6"
        >
          <Text className="text-gray-700 mb-2 font-medium">Confirm Password</Text>
          <View className="flex-row items-center border border-gray-300 rounded-xl px-4 bg-gray-50">
            <MaterialIcons name="lock" size={20} color="#6b7280" />
            <TextInput
              placeholder="Confirm your password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              className="flex-1 py-3 px-2"
              placeholderTextColor="#9ca3af"
              secureTextEntry={!showConfirmPassword}
            />
            <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
              <MaterialIcons
                name={showConfirmPassword ? "visibility-off" : "visibility"}
                size={20}
                color="#6b7280"
              />
            </TouchableOpacity>
          </View>
          {errors.confirmPassword && <Text className="text-red-500 mt-1 ml-1 text-xs">{errors.confirmPassword}</Text>}
        </Animated.View>
        
        <Animated.View 
          entering={FadeInDown.delay(700).duration(500).springify()}
          className="mb-8"
        >
          <TouchableOpacity 
            className="flex-row items-start" 
            onPress={() => setAcceptTerms(!acceptTerms)}
          >
            <View className={`w-5 h-5 flex items-center justify-center rounded mt-0.5 mr-3 ${acceptTerms ? 'bg-blue-500' : 'border border-gray-300'}`}>
              {acceptTerms && <MaterialIcons name="check" size={14} color="#fff" />}
            </View>
            <Text className="text-gray-600 flex-1">
              I accept the <Text className="text-blue-500 font-medium">Terms of Service</Text> and <Text className="text-blue-500 font-medium">Privacy Policy</Text>
            </Text>
          </TouchableOpacity>
          {errors.terms && <Text className="text-red-500 mt-1 ml-1 text-xs">{errors.terms}</Text>}
        </Animated.View>
        
        <Animated.View entering={FadeInDown.delay(800).duration(500).springify()}>
          <TouchableOpacity
            className={`bg-blue-500 py-4 rounded-xl mb-4 ${isLoading || !acceptTerms ? 'opacity-70' : ''}`}
            onPress={handleRegister}
            disabled={isLoading || !acceptTerms}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white text-center font-bold text-lg">
                Create Account
              </Text>
            )}
          </TouchableOpacity>
          
          <View className="flex-row justify-center items-center mb-2">
            <View className="flex-1 h-0.5 bg-gray-200" />
            <Text className="px-4 text-gray-500">or signup with</Text>
            <View className="flex-1 h-0.5 bg-gray-200" />
          </View>
          
          <View className="flex-row justify-center">
            <TouchableOpacity 
              className="w-12 h-12 rounded-full bg-gray-100 items-center justify-center border border-gray-200"
              onPress={() => Alert.alert("Coming Soon", "Google registration will be available in the production version.")}
            >
              <MaterialIcons name="logo-google" size={20} color="#EA4335" />
            </TouchableOpacity>
          </View>
    </Animated.View>
      </View>
    </ScrollView>
  )
}

export default Register