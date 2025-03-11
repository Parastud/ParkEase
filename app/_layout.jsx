import React from 'react'
import {Tabs} from 'expo-router'
import Ionicons from '@expo/vector-icons/Ionicons';
const tabs = () => {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: 'black' }}>
        <Tabs.Screen name='index' options={{title:"Home", tabBarIcon:({color})=><Ionicons name="home" size={32} color={color} />} }/>
        <Tabs.Screen name='(tabs)/Home/index' options={{ href: null }}/>
    </Tabs>
  )
}

export default tabs