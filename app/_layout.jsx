import React from 'react'
import {Tabs} from 'expo-router'
import Ionicons from '@expo/vector-icons/Ionicons';
const tabs = () => {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: 'black', headerShown:false } }>
        <Tabs.Screen name='(tabs)' options={{title:"Home", tabBarIcon:({color})=><Ionicons name="home" size={32} color={color} />} }/>
        <Tabs.Screen name='index' options={{ href: null }}/>
    </Tabs>
  )
}

export default tabs