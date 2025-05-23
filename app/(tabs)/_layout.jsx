import React, {useState} from 'react'
import {Tabs} from 'expo-router'
import { GlobalState } from '../../constants/usecontext';
import { TouchableOpacity, Text, Alert } from 'react-native';
import { router } from 'expo-router';
import { checkIsRegisteredOwner } from '../../constants/parkingData';
import { auth } from '../../firebase';
import { FontAwesome } from '@expo/vector-icons';

const TabsLayout = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [refreshBookings, setRefreshBookings] = useState(false);
  
  return (
    <GlobalState.Provider value={{
      modalVisible, 
      setModalVisible,
      refreshBookings,
      setRefreshBookings
    }}>
      <Tabs screenOptions={{ 
        tabBarActiveTintColor: 'black', 
        headerShown: false
      }}>
        <Tabs.Screen 
          name='Home/index' 
          options={{
            title: "Home", 
            tabBarIcon: ({color}) => <FontAwesome name="home" size={32} color={color} />
          }}
        />
        <Tabs.Screen 
          name='Bookings' 
          options={{
            title: "Bookings", 
            tabBarIcon: ({color}) => <FontAwesome name="calendar" size={32} color={color} />
          }}
        />
        <Tabs.Screen 
          name='About' 
          options={{
            title: "Account", 
            tabBarIcon: ({color}) => <FontAwesome name="user" size={32} color={color} />
          }}
        />
        <Tabs.Screen name='Home/Booking/[id]' options={{ href: null }}/>
      </Tabs>
    </GlobalState.Provider>
  )
}

export default TabsLayout;
