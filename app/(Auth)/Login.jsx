import { StyleSheet, Text, TextInput, View, ActivityIndicator, Alert, TouchableOpacity, Dimensions } from 'react-native'
import React, { useState, useEffect } from 'react'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { auth, checkAuthState } from '../../firebase'
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Ionicons } from '@expo/vector-icons'

const { height } = Dimensions.get('window')

const Login = () => {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    try {
      // First check Firebase auth state
      const user = await checkAuthState();
      if (user) {
        router.replace("/Home");
        return;
      }
      
      // If no Firebase auth, check local storage as fallback
      const userSession = await AsyncStorage.getItem('userSession');
      if (userSession) {
        const session = JSON.parse(userSession);
        // Check if the session is still valid (e.g., not expired)
        const lastLogin = new Date(session.lastLogin);
        const now = new Date();
        const hoursDiff = (now - lastLogin) / (1000 * 60 * 60);
        
        // If session is less than 24 hours old, redirect to home
        if (hoursDiff < 24) {
          router.replace("/Home");
        } else {
          // Clear expired session
          await AsyncStorage.removeItem('userSession');
        }
      }
    } catch (error) {
      console.error('Error checking session:', error);
    } finally {
      setIsCheckingAuth(false);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields")
      return
    }

    setIsLoading(true)
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      
      // Save session data if rememberMe is enabled
      if (rememberMe) {
        await AsyncStorage.setItem('userSession', JSON.stringify({
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          lastLogin: new Date().toISOString()
        }));
      }
      
      router.replace("/Home")
    } catch (error) {
      let errorMessage = "An error occurred during login"
      switch (error.code) {
        case 'auth/invalid-email':
          errorMessage = "Invalid email address"
          break
        case 'auth/user-disabled':
          errorMessage = "This account has been disabled"
          break
        case 'auth/user-not-found':
          errorMessage = "No account found with this email"
          break
        case 'auth/wrong-password':
          errorMessage = "Incorrect password"
          break
        default:
          errorMessage = error.message
      }
      Alert.alert("Login Error", errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert("Error", "Please enter your email address")
      return
    }

    try {
      await sendPasswordResetEmail(auth, email)
      Alert.alert(
        "Reset Link Sent",
        "Please check your email for password reset instructions.",
        [
          {
            text: "OK",
            onPress: () => {
              setEmail("")
              setPassword("")
            }
          }
        ]
      )
    } catch (error) {
      let errorMessage = "Failed to send reset link"
      switch (error.code) {
        case 'auth/invalid-email':
          errorMessage = "Invalid email address"
          break
        case 'auth/user-not-found':
          errorMessage = "No account found with this email"
          break
        default:
          errorMessage = error.message
      }
      Alert.alert("Reset Error", errorMessage)
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      
      // This is just a placeholder for now
      // We'll implement proper Google Sign In when the native modules issue is resolved
      setTimeout(() => {
        // For testing purposes, let's just show an alert
        Alert.alert("Google Sign In", "Google Sign In will be implemented in the production version.");
        setIsLoading(false);
      }, 1500);
      
    } catch (error) {
      Alert.alert("Error", "Failed to start Google sign in process")
      setIsLoading(false);
    }
  }

  if (isCheckingAuth) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View className="flex-1 justify-between px-6 pt-6 pb-4">
      <View>
        <Animated.Text 
          entering={FadeInDown.delay(100).duration(600).springify()}
          className="text-2xl font-bold text-gray-800 mb-1"
        >
          Welcome Back
        </Animated.Text>
        <Animated.Text 
          entering={FadeInDown.delay(200).duration(600).springify()}
          className="text-gray-500 mb-8"
        >
          Sign in to continue finding parking
        </Animated.Text>
        
        <Animated.View 
          entering={FadeInDown.delay(300).duration(600).springify()}
          className="mb-4"
        >
          <Text className="text-gray-700 mb-2 font-medium">Email</Text>
          <View className="flex-row items-center border border-gray-300 rounded-xl px-4 bg-gray-50">
            <Ionicons name="mail-outline" size={20} color="#6b7280" />
            <TextInput
              placeholder="Your email address"
              value={email}
              onChangeText={setEmail}
              className="flex-1 py-3 px-2"
              placeholderTextColor="#9ca3af"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </Animated.View>
        
        <Animated.View 
          entering={FadeInDown.delay(400).duration(600).springify()}
          className="mb-6"
        >
          <Text className="text-gray-700 mb-2 font-medium">Password</Text>
          <View className="flex-row items-center border border-gray-300 rounded-xl px-4 bg-gray-50">
            <Ionicons name="lock-closed-outline" size={20} color="#6b7280" />
            <TextInput
              placeholder="Your password"
              value={password}
              onChangeText={setPassword}
              className="flex-1 py-3 px-2"
              placeholderTextColor="#9ca3af"
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons 
                name={showPassword ? "eye-off-outline" : "eye-outline"} 
                size={20} 
                color="#6b7280" 
              />
            </TouchableOpacity>
          </View>
        </Animated.View>
        
        <Animated.View 
          entering={FadeInDown.delay(500).duration(600).springify()}
          className="flex-row justify-between items-center mb-8"
        >
          <TouchableOpacity 
            className="flex-row items-center" 
            onPress={() => setRememberMe(!rememberMe)}
          >
            <View className={`w-5 h-5 flex items-center justify-center rounded mr-2 ${rememberMe ? 'bg-blue-500' : 'border border-gray-300'}`}>
              {rememberMe && <Ionicons name="checkmark" size={14} color="#fff" />}
            </View>
            <Text className="text-gray-600">Remember me</Text>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={handleForgotPassword}>
            <Text className="text-blue-500 font-medium">Forgot Password?</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
      
      <Animated.View 
        entering={FadeInDown.delay(600).duration(600).springify()}
      >
        <TouchableOpacity 
          className={`bg-blue-500 py-4 rounded-xl mb-4 ${isLoading ? 'opacity-70' : ''}`}
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-center text-lg">
              Sign In
            </Text>
          )}
        </TouchableOpacity>
        
        <View className="flex-row justify-center items-center mb-2">
          <View className="flex-1 h-0.5 bg-gray-200" />
          <Text className="px-4 text-gray-500">or continue with</Text>
          <View className="flex-1 h-0.5 bg-gray-200" />
        </View>
        
        <View className="flex-row justify-center">
          <TouchableOpacity 
            className="w-12 h-12 rounded-full bg-gray-100 items-center justify-center border border-gray-200"
            onPress={handleGoogleSignIn}
            disabled={isLoading}
          >
            <Ionicons name="logo-google" size={20} color="#EA4335" />
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  )
}

export default Login

const styles = StyleSheet.create({})