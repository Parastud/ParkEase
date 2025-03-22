import { Button, SafeAreaView, StyleSheet, Text, TextInput, View, ActivityIndicator, Alert, TouchableOpacity } from 'react-native'
import React, { useState, useEffect } from 'react'
import Animated,{FlipInEasyX,FlipOutEasyX} from 'react-native-reanimated'
import { auth, checkAuthState } from '../../Firebase'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'

const Login = () => {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
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
      
      // Save session data
      await AsyncStorage.setItem('userSession', JSON.stringify({
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        lastLogin: new Date().toISOString()
      }));
      
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

  if (isCheckingAuth) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <Animated.View className="flex-1 justify-center items-center bg-white" entering={FlipInEasyX} exiting={FlipOutEasyX} >
      <View className="w-full p-10">
        <Text className="text-3xl font-bold text-center mb-8 text-gray-800">Welcome Back</Text>
        
        <TextInput
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          className="border p-4 rounded-xl mb-4 bg-gray-50"
          placeholderTextColor="#8b94a5"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        
        <TextInput
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          className="border p-4 rounded-xl mb-6 bg-gray-50"
          placeholderTextColor="#8b94a5"
          secureTextEntry
        />
        
        <TouchableOpacity 
          onPress={handleLogin}
          disabled={isLoading}
          className={`bg-blue-500 p-4 rounded-xl ${isLoading ? 'opacity-70' : ''}`}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white text-center font-semibold text-lg">Login</Text>
          )}
        </TouchableOpacity>
      </View>
    </Animated.View>
  )
}

export default Login

const styles = StyleSheet.create({})