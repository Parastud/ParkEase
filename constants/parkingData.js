import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, query, where, setDoc, getFirestore, limit, serverTimestamp } from 'firebase/firestore';
import { auth } from '../firebase';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getAuth } from 'firebase/auth';

// Initialize Firestore using the existing auth instance
const db = getFirestore();
const storage = getStorage();

// Firebase collection references
const parkingCollectionRef = collection(db, 'parkingSpots');
const parkingOwnersCollectionRef = collection(db, 'parkingOwners');
const bookingsCollectionRef = collection(db, 'bookings');
const notificationsCollectionRef = collection(db, 'notifications');

// Initialize collections if they don't exist (Firestore creates collections on first document)
// We'll create collections automatically when data is first added
// const initializeCollections = async () => {
//   try {
//     // Code removed to prevent permission errors
//   } catch (error) {
//   }
// };

// Call initialization function only if user is logged in
auth.onAuthStateChanged((user) => {
  if (user) {
    // Only try to initialize collections if user is logged in
    // initializeCollections();
  }
});

// Helper function to remove undefined values from objects before storing in Firestore
const removeUndefinedValues = (obj) => {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    return obj;
  }
  
  const cleanedObj = {};
  Object.keys(obj).forEach(key => {
    if (obj[key] === undefined) {
      return;
    }
    
    if (obj[key] !== null && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
      const cleaned = removeUndefinedValues(obj[key]);
      if (Object.keys(cleaned).length > 0) {
        cleanedObj[key] = cleaned;
      }
    } 
    else if (Array.isArray(obj[key])) {
      const cleanedArray = obj[key]
        .filter(item => item !== undefined)
        .map(item => {
          if (item !== null && typeof item === 'object') {
            return removeUndefinedValues(item);
          }
          return item;
        });
      cleanedObj[key] = cleanedArray;
    }
    else {
      cleanedObj[key] = obj[key];
    }
  });
  
  return cleanedObj;
};

// Convert Firestore document to parking spot object
const convertDocToParkingSpot = (doc) => {
  return {
    id: doc.id,
    ...doc.data(),
    price: typeof doc.data().price === 'number' ? `₹ ${doc.data().price}/hour` : doc.data().price,
  };
};

// Function to fetch all parking spots from Firebase
export const fetchParkingSpots = async () => {
  try {
    const querySnapshot = await getDocs(parkingCollectionRef);
    
    if (querySnapshot.empty) {
      return [];
    }
    
    const parkingSpots = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      price: typeof doc.data().price === 'number' ? `₹ ${doc.data().price}/hour` : doc.data().price,
    }));
    
    return parkingSpots;
  } catch (error) {
    return [];
  }
};

// Function to fetch parking spots by owner's ID
export const getParkingSpotsForOwner = async (ownerId) => {
  try {
    if (!ownerId) {
      return [];
    }
    
    const q = query(parkingCollectionRef, where("ownerId", "==", ownerId));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    return [];
  }
};

// Function to add a new parking spot
export const addParkingSpot = async (parkingData) => {
  try {
    // Check for authenticated user
    if (!auth.currentUser) {
      throw new Error('You must be logged in to add a parking spot');
    }
    
    // Validate coordinates
    if (!parkingData.latitude || !parkingData.longitude) {
      throw new Error('Missing location coordinates. Please set a location on the map.');
    }
    
    const ownerId = auth.currentUser.uid;
    
    // Ensure the parking data has proper coordinates format for Firebase GeoPoint
    const parkingWithLocation = {
      ...parkingData,
      createdAt: new Date().toISOString(),
      ownerId: ownerId, // Explicitly set owner ID
      // Make sure latitude and longitude are properly formatted for Firebase
      // Keep the original coordinates at the top level as well
      latitude: parkingData.latitude,
      longitude: parkingData.longitude,
      location: {
        coordinates: [parkingData.longitude, parkingData.latitude],
        type: "Point"
      }
    };
    
    // If there's an image provided, upload it to Firebase Storage
    if (parkingData.image && parkingData.image.startsWith('file://')) {
      const imageUrl = await uploadParkingImage(parkingData.image, `parking_${Date.now()}`);
      parkingWithLocation.image = imageUrl;
    } else if (parkingData.imageUri && parkingData.imageUri.startsWith('file://')) {
      const imageUrl = await uploadParkingImage(parkingData.imageUri, `parking_${Date.now()}`);
      parkingWithLocation.image = imageUrl;
    }
    
    // Clean the data object to remove any undefined values
    const cleanedData = removeUndefinedValues(parkingWithLocation);
    
    // Final check for coordinates
    if (!cleanedData.latitude || !cleanedData.longitude) {
      throw new Error('Coordinates were lost during processing. Please try again.');
    }
    
    const docRef = await addDoc(parkingCollectionRef, cleanedData);
    return { id: docRef.id, ...cleanedData };
  } catch (error) {
    throw error;
  }
};

// Function to update a parking spot
export const updateParkingSpot = async (id, parkingData) => {
  try {
    const parkingDoc = doc(db, 'parkingSpots', id);
    
    // Validate coordinates if they're included in the update
    if (parkingData.latitude !== undefined && parkingData.longitude !== undefined) {
      if (!parkingData.latitude || !parkingData.longitude) {
        throw new Error('Invalid location coordinates. Please set a valid location on the map.');
      }
    }
    
    // Prepare data for update
    const updateData = {
      ...parkingData,
      updatedAt: new Date().toISOString(),
    };
    
    // If coordinates are updated, ensure they are stored properly
    if (parkingData.latitude && parkingData.longitude) {
      // Keep them at the top level
      updateData.latitude = parkingData.latitude;
      updateData.longitude = parkingData.longitude;
      
      // Update the location field for GeoPoint compatibility
      updateData.location = {
        coordinates: [parkingData.longitude, parkingData.latitude],
        type: "Point"
      };
    }
    
    // If there's a new image, upload it
    if (parkingData.image && parkingData.image.startsWith('file://')) {
      const imageUrl = await uploadParkingImage(parkingData.image, `parking_${id}_${Date.now()}`);
      updateData.image = imageUrl;
    } else if (parkingData.imageUri && parkingData.imageUri.startsWith('file://')) {
      const imageUrl = await uploadParkingImage(parkingData.imageUri, `parking_${id}_${Date.now()}`);
      updateData.image = imageUrl;
    }
    
    // Clean the data object to remove any undefined values
    const cleanedData = removeUndefinedValues(updateData);
    
    await updateDoc(parkingDoc, cleanedData);
    return { id, ...cleanedData };
  } catch (error) {
    throw error;
  }
};

// Function to delete a parking spot
export const deleteParkingSpot = async (id) => {
  try {
    const parkingDoc = doc(db, 'parkingSpots', id);
    await deleteDoc(parkingDoc);
    return true;
  } catch (error) {
    throw error;
  }
};

// Function to get a single parking spot by ID
export const getParkingSpotById = async (id) => {
  try {
    const parkingDoc = doc(db, 'parkingSpots', id);
    const docSnap = await getDoc(parkingDoc);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      throw new Error('Parking spot not found');
    }
  } catch (error) {
    throw error;
  }
};

// PARKING OWNER FUNCTIONS

// Function to register a new parking owner
export const registerParkingOwner = async (ownerData) => {
  try {
    if (!auth.currentUser) {
      throw new Error('User not authenticated');
    }
    
    const ownerId = auth.currentUser.uid;
    
    // Add owner info to Firestore
    const ownerDoc = doc(db, 'parkingOwners', ownerId);
    
    // Prepare data for saving, removing any file URIs
    const dataToSave = {
      ...ownerData,
      userId: ownerId,
      updatedAt: new Date().toISOString(),
      // Set verification status
      verified: false, // New registrations start as unverified
    };
    
    // If updating existing profile, preserve verification status
    if (ownerData.verified) {
      dataToSave.verified = ownerData.verified;
    }
    
    // Handle document upload
    // Note: In a real implementation, you would upload these images to Firebase Storage
    // and store the download URLs instead of the local URIs
    if (ownerData.identityDocument) {
      dataToSave.hasIdentityDocument = true;
      // Remove the actual URI as it's a local file path
      delete dataToSave.identityDocument;
    }
    
    if (ownerData.businessDocument) {
      dataToSave.hasBusinessDocument = true;
      // Remove the actual URI as it's a local file path
      delete dataToSave.businessDocument;
    }
    
    // Clean the data to remove any undefined values
    const cleanedData = removeUndefinedValues(dataToSave);
    
    await setDoc(ownerDoc, cleanedData);
    
    return { success: true, ownerId };
  } catch (error) {
    throw error;
  }
};

// Function to get parking owner details
export const getParkingOwnerDetails = async () => {
  try {
    if (!auth.currentUser) {
      return null;
    }
    
    const ownerId = auth.currentUser.uid;
    const ownerDoc = doc(db, 'parkingOwners', ownerId);
    const docSnap = await getDoc(ownerDoc);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      return null; // No owner profile found
    }
  } catch (error) {
    throw error;
  }
};

// Function to upload a parking spot image
export const uploadParkingImage = async (uri, name) => {
  try {
    if (!uri || typeof uri !== 'string') {
      return 'https://via.placeholder.com/400x300?text=No+Image';
    }
    
    // If Firebase Storage isn't configured yet, use placeholders
    const useFirebaseStorage = false; // Set to true when Firebase Storage is configured
    
    if (!useFirebaseStorage) {
      if (name.includes('profile')) {
        return 'https://via.placeholder.com/150?text=Profile';
      } else if (name.includes('verification')) {
        return 'https://via.placeholder.com/400x300?text=Verification+Document';
      } else {
        return 'https://via.placeholder.com/400x300?text=Parking+Spot';
      }
    }
    
    // If URI is already a remote URL, return it directly
    if (uri.startsWith('http')) {
      return uri;
    }
    
    // For local file URIs that start with 'file://'
    if (uri.startsWith('file://')) {
      const response = await fetch(uri);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      const storageRef = ref(storage, `parking_images/${name}`);
      await uploadBytes(storageRef, blob);
      return await getDownloadURL(storageRef);
    } 
    
    throw new Error(`Unsupported URI format: ${uri}`);
  } catch (error) {
    return 'https://via.placeholder.com/400x300?text=Image+Error';
  }
};

// Function to get all verified parking owners (for admin)
export const getAllVerifiedOwners = async () => {
  try {
    const q = query(parkingOwnersCollectionRef, where("verified", "==", true));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    return [];
  }
};

// BOOKING FUNCTIONS

// Function to create a new booking
export const createBooking = async (booking) => {
  try {
    // Create booking document
    const bookingRef = await addDoc(bookingsCollectionRef, {
      ...booking,
      status: 'active',
      createdAt: serverTimestamp()
    });
    
    // Get the parking spot
    const parkingSpotDoc = await getDoc(doc(parkingCollectionRef, booking.parkingSpotId));
    
    if (parkingSpotDoc.exists()) {
      const parkingSpotData = parkingSpotDoc.data();
      const currentSpots = parkingSpotData.availableSpots || parkingSpotData.spots || 0;
      
      // Update the available spots (decrement by 1)
      await updateDoc(doc(parkingCollectionRef, booking.parkingSpotId), {
        availableSpots: Math.max(currentSpots - 1, 0)
      });
      
      // Create notification for parking owner
      await addDoc(notificationsCollectionRef, {
        userId: parkingSpotData.ownerId,
        title: 'New Booking',
        message: `You have a new booking for ${parkingSpotData.title} by ${booking.userName}`,
        createdAt: serverTimestamp(),
        read: false,
        type: 'booking',
        bookingId: bookingRef.id
      });
      
      return { 
        success: true, 
        bookingId: bookingRef.id,
        parkingSpotId: booking.parkingSpotId,
        availableSpots: Math.max(currentSpots - 1, 0)
      };
    } else {
      throw new Error('Parking spot not found');
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Function to get a user's bookings
export const getUserBookings = async () => {
  try {
    if (!auth.currentUser) {
      throw new Error('You must be logged in to view your bookings');
    }
    
    const userId = auth.currentUser.uid;
    
    // Query for bookings made by this user
    const q = query(bookingsCollectionRef, where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    
    const bookings = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      // Ensure createdAt is a valid Date for sorting
      createdAt: doc.data().createdAt ? 
        (typeof doc.data().createdAt === 'object' && doc.data().createdAt.toDate ? 
          doc.data().createdAt.toDate() : doc.data().createdAt) 
        : new Date()
    }));
    
    return bookings;
  } catch (error) {
    return [];
  }
};

// Function to get bookings for a specific parking spot
export const getParkingSpotBookings = async (parkingSpotId) => {
  try {
    // Query for bookings for this parking spot
    const q = query(bookingsCollectionRef, where("parkingSpotId", "==", parkingSpotId));
    const querySnapshot = await getDocs(q);
    
    // Map the results to include document ID
    const bookings = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return bookings;
  } catch (error) {
    throw error;
  }
};

// Function to cancel a booking
export const cancelBooking = async (bookingId) => {
  try {
    const bookingDoc = await getDoc(doc(bookingsCollectionRef, bookingId));
    
    if (bookingDoc.exists()) {
      const bookingData = bookingDoc.data();
      
      // Update booking status
      await updateDoc(doc(bookingsCollectionRef, bookingId), {
        status: 'cancelled',
        cancelledAt: serverTimestamp()
      });
      
      // Get the parking spot
      const parkingSpotId = bookingData.parkingSpotId;
      const parkingSpotDoc = await getDoc(doc(parkingCollectionRef, parkingSpotId));
      
      if (parkingSpotDoc.exists()) {
        const parkingSpotData = parkingSpotDoc.data();
        const currentSpots = parkingSpotData.availableSpots || parkingSpotData.spots || 0;
        
        // Update the available spots (increment by 1)
        await updateDoc(doc(parkingCollectionRef, parkingSpotId), {
          availableSpots: currentSpots + 1
        });
        
        // Create notification for parking owner about cancellation
        await addDoc(notificationsCollectionRef, {
          userId: parkingSpotData.ownerId,
          title: 'Booking Cancelled',
          message: `A booking for ${parkingSpotData.title} has been cancelled`,
          createdAt: serverTimestamp(),
          read: false,
          type: 'cancellation',
          bookingId: bookingId
        });
        
        return { 
          success: true, 
          parkingSpotId: parkingSpotId,
          availableSpots: currentSpots + 1
        };
      }
    }
    
    throw new Error('Booking not found');
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Function to get bookings for all parking spots owned by a specific owner
export const getOwnerBookings = async () => {
  try {
    if (!auth.currentUser) {
      throw new Error('You must be logged in to view your bookings');
    }
    
    const ownerId = auth.currentUser.uid;
    
    // First, get all parking spots owned by this user
    const parkingSpotsQuery = query(parkingCollectionRef, where("ownerId", "==", ownerId));
    const parkingSpotsSnapshot = await getDocs(parkingSpotsQuery);
    
    if (parkingSpotsSnapshot.empty) {
      return [];
    }
    
    // Get all the parking spot IDs
    const parkingSpotIds = parkingSpotsSnapshot.docs.map(doc => doc.id);
    
    // Now get all bookings for these parking spots
    let allBookings = [];
    
    // We need to use multiple queries since Firestore doesn't support "in" queries with more than 10 values
    // Split the IDs into chunks of 10
    const idChunks = [];
    for (let i = 0; i < parkingSpotIds.length; i += 10) {
      idChunks.push(parkingSpotIds.slice(i, i + 10));
    }
    
    // Query bookings for each chunk of IDs
    for (const chunk of idChunks) {
      const bookingsQuery = query(bookingsCollectionRef, where("parkingSpotId", "in", chunk));
      const bookingsSnapshot = await getDocs(bookingsQuery);
      
      const chunkBookings = bookingsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      allBookings = [...allBookings, ...chunkBookings];
    }
    
    // Sort bookings by creation date (newest first)
    allBookings.sort((a, b) => {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    
    return allBookings;
  } catch (error) {
    throw error;
  }
};

// Function to check for expired bookings and update spot availability
export const checkExpiredBookings = async () => {
  try {
    // Skip if not authenticated
    if (!auth.currentUser) {
      return 0;
    }

    const now = new Date();
    
    // Query for active bookings first
    const activeQuery = query(
      bookingsCollectionRef,
      where("status", "==", "active")
    );
    
    const activeSnapshot = await getDocs(activeQuery);
    
    // Query for confirmed bookings
    const confirmedQuery = query(
      bookingsCollectionRef,
      where("status", "==", "confirmed")
    );
    
    const confirmedSnapshot = await getDocs(confirmedQuery);
    
    // Query for approved bookings
    const approvedQuery = query(
      bookingsCollectionRef,
      where("status", "==", "approved")
    );
    
    const approvedSnapshot = await getDocs(approvedQuery);
    
    // Combine all bookings
    const allBookings = [
      ...activeSnapshot.docs,
      ...confirmedSnapshot.docs,
      ...approvedSnapshot.docs
    ];
    
    // Filter for expired bookings manually
    const expiredBookings = allBookings.filter(bookingDoc => {
      const bookingData = bookingDoc.data();
      return bookingData.endTime && new Date(bookingData.endTime) <= now;
    });
    
    if (expiredBookings.length === 0) {
      return 0; // No expired bookings to process
    }
    
    // Process each expired booking
    const batch = [];
    expiredBookings.forEach((bookingDoc) => {
      const bookingData = bookingDoc.data();
      
      // Add update operation to batch
      batch.push({
        id: bookingDoc.id,
        parkingSpotId: bookingData.parkingSpotId
      });
    });
    
    // Process each expired booking individually
    for (const item of batch) {
      try {
        // Update booking status to completed
        await updateDoc(doc(bookingsCollectionRef, item.id), {
          status: 'completed',
          updatedAt: new Date().toISOString()
        });
        
        // Increment available spots for the parking spot
        const parkingSpotDoc = await getDoc(doc(parkingCollectionRef, item.parkingSpotId));
        
        if (parkingSpotDoc.exists()) {
          const parkingSpotData = parkingSpotDoc.data();
          const currentSpots = parkingSpotData.availableSpots || 0;
          
          await updateDoc(doc(parkingCollectionRef, item.parkingSpotId), {
            availableSpots: currentSpots + 1
          });
        }
      } catch (error) {
        // Silent error handling
      }
    }
    
    return batch.length; // Return count of processed bookings
  } catch (error) {
    return 0;
  }
};

// Function to check if current user is a registered owner
export const checkIsRegisteredOwner = async () => {
  try {
    if (!auth.currentUser) {
      return false;
    }
    
    const ownerId = auth.currentUser.uid;
    const ownerDoc = doc(db, 'parkingOwners', ownerId);
    const docSnap = await getDoc(ownerDoc);
    
    return docSnap.exists();
  } catch (error) {
    return false;
  }
};

// Remove the static sample parkingList array as it's no longer needed
export const getClosestParkingSpots = async (numSpots = 10, coordinates = null) => {
  try {
    const querySnapshot = await getDocs(parkingCollectionRef);
    
    let spots = querySnapshot.docs.map(doc => convertDocToParkingSpot(doc));
    
    // Filter for active spots only
    spots = spots.filter(spot => spot.isActive !== false);
    
    // Calculate distances if coordinates provided
    if (coordinates) {
      spots = spots.map(spot => {
        if (spot.location) {
          spot.distance = calculateDistance(
            coordinates.latitude, 
            coordinates.longitude,
            spot.location.latitude,
            spot.location.longitude
          ).toFixed(1);
        } else {
          spot.distance = 'Unknown';
        }
        return spot;
      });
      
      // Sort by distance
      spots.sort((a, b) => {
        if (a.distance === 'Unknown') return 1;
        if (b.distance === 'Unknown') return -1;
        return parseFloat(a.distance) - parseFloat(b.distance);
      });
    }
    
    // Limit number of results
    return spots.slice(0, numSpots);
  } catch (error) {
    return [];
  }
}; 