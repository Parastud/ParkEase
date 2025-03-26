import React, { useEffect } from 'react';
import { checkAuthState, auth } from './firebase';

export default function App() {
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await checkAuthState();
      } catch (error) {
        // Error initializing auth
      }
    };
    
    initializeAuth();

    const unsubscribe = auth.onAuthStateChanged((user) => {
      // User state changed
    });

    return () => unsubscribe();
  }, []);

  return null;
}
