import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import { checkAuthState } from './firebase';

export default function App() {
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await checkAuthState();
      } catch (error) {
        console.error('Error initializing auth:', error);
      }
    };
    
    initializeAuth();
  }, []);

  return null; // This component doesn't render anything as it's handled by expo-router
}
