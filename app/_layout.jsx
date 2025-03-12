import React,{useState} from 'react'
import {Tabs} from 'expo-router'
import Ionicons from '@expo/vector-icons/Ionicons';
import { GlobalState } from '../constants/usecontext';
const tabs = () => {
   const [modalVisible, setModalVisible] = useState(false);
  return (
    <GlobalState.Provider value={{modalVisible,setModalVisible}}>
    <Tabs screenOptions={{ tabBarActiveTintColor: 'black', headerShown:false } }>
        <Tabs.Screen name='(tabs)/Home/index' options={{title:"Home", tabBarIcon:({color})=><Ionicons name="home" size={32} color={color} />} }/>
        <Tabs.Screen name='(tabs)/About' options={{title:"About", tabBarIcon:({color})=><Ionicons name="cog" size={32} color={color} />} }/>
        <Tabs.Screen name='index' options={{ href: null }}/>
        <Tabs.Screen name='(tabs)/Home/Booking/[id]' options={{ href: null }}/>
    </Tabs>
    </GlobalState.Provider>
  )
}

export default tabs