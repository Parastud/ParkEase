import React, { useState } from 'react'
import Login from './Login'
import Register from './Register'
import { TouchableOpacity, View, Text, ImageBackground, StatusBar } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import Animated, { FadeIn } from 'react-native-reanimated'

const AuthLayout = () => {
  const [screen, setScreen] = useState(true)
  
  const handlePress = () => {
    setScreen(!screen)
  }

  return (
    <View className="flex-1">
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <ImageBackground
        source={require('../../assets/test.jpg')}
        className="absolute w-full h-full -top-1/2"
        resizeMode="cover"

      >
        <View className="absolute w-full h-full bg-black/50" />
      </ImageBackground>
      
      <SafeAreaView className="flex-1">
        <Animated.View 
          entering={FadeIn.duration(600)} 
          className="flex-1"
        >
          <View className="items-center px-6 pt-12">
            <View className="w-20 h-20 bg-white/20 rounded-2xl items-center justify-center mb-4">
              <Ionicons name="car" size={40} color="#fff" />
            </View>
            <Text className="text-white text-4xl font-bold">ParkEase</Text>
            <Text className="text-white/80 text-base mt-2">Find parking spots with ease</Text>
          </View>
          
          <View className="flex-1 bg-white rounded-t-3xl mt-8">
            {screen ? <Login /> : <Register />}
          </View>
          
          <View className="bg-white px-6 py-4">
            <View className="flex-row items-center justify-center">
              <Text className="text-gray-700 text-base">
                {screen ? "Don't have an account? " : "Already have an account? "}
              </Text>
              <TouchableOpacity onPress={handlePress}>
                <Text className="text-blue-600 font-bold text-base">
                  {screen ? "Register" : "Login"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </SafeAreaView>
    </View>
  )
}

export default AuthLayout