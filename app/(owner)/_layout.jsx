import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';
import { Drawer } from 'expo-router/drawer';
import { useNavigation } from '@react-navigation/native';
import { FontAwesome } from '@expo/vector-icons';
import { usePathname, router } from 'expo-router';
import { checkIsOwner } from '../../constants/parkingData';

export default function OwnerLayout() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <Drawer screenOptions={{
        headerShown: false,
        drawerActiveBackgroundColor: '#e6f2ff',
        drawerActiveTintColor: '#007BFF',
        drawerInactiveTintColor: '#333',
        drawerLabelStyle: {
          fontSize: 16,
        },
      }}>
        <Drawer.Screen
          name="index"
          options={{
            drawerLabel: "Dashboard",
            drawerIcon: ({ color }) => <FontAwesome name="home" size={22} color={color} />,
          }}
        />
        <Drawer.Screen
          name="my-spots"
          options={{
            drawerLabel: "My Parking Spots",
            headerTitle: "My Parking Spots",
            drawerIcon: ({ color }) => <FontAwesome name="car" size={22} color={color} />,
          }}
        />
        <Drawer.Screen
          name="booking-requests"
          options={{
            drawerLabel: "Booking Requests",
            headerTitle: "Booking Requests",
            drawerIcon: ({ color }) => <FontAwesome name="calendar" size={22} color={color} />,
          }}
        />
        <Drawer.Screen
          name="add-spot"
          options={{
            drawerLabel: "Add Parking Spot",
            headerTitle: "Add Parking Spot",
            drawerIcon: ({ color }) => <FontAwesome name="plus-circle" size={22} color={color} />,
          }}
        />
        <Drawer.Screen
          name="profile"
          options={{
            drawerLabel: "Profile",
            headerTitle: "Profile",
            drawerIcon: ({ color }) => <FontAwesome name="user" size={22} color={color} />,
          }}
        />
        <Drawer.Screen
          name="register"
          options={{
            drawerLabel: "Business Details",
            headerTitle: "Business Details",
            drawerIcon: ({ color }) => <FontAwesome name="building" size={22} color={color} />,
          }}
        />
        <Drawer.Screen
          name="edit-spot"
          options={{
            drawerLabel: "Edit Spot",
            drawerItemStyle: { display: 'none' }, // Hide this from drawer menu
          }}
        />
      </Drawer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    top:25,
  },
}); 
