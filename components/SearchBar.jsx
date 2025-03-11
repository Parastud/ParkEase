import React from 'react';
import { View, TextInput, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';

const SearchBar = ({
  searchQuery,
  onSearchChange,
  searchRadius,
  onRadiusChange,
  isCustomLocation,
  onResetLocation
}) => {
  return (
    <View style={styles.searchContainer}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search nearby parking spots..."
        value={searchQuery}
        onChangeText={onSearchChange}
        placeholderTextColor="#666"
      />
      <View style={styles.radiusContainer}>
        <Text style={styles.radiusText}>Search Radius: {searchRadius.toFixed(1)} km</Text>
        <Slider
          style={styles.radiusSlider}
          minimumValue={0.1}
          maximumValue={5}
          value={searchRadius}
          onValueChange={onRadiusChange}
          minimumTrackTintColor="#007AFF"
          maximumTrackTintColor="#000000"
        />
      </View>
      <Text style={styles.helpText}>Long press anywhere on the map to change your location</Text>
      {isCustomLocation && (
        <TouchableOpacity 
          style={styles.resetButton}
          onPress={onResetLocation}
        >
          <Text style={styles.resetButtonText}>Reset to Current Location</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  searchContainer: {
    position: 'absolute',
    top: 40,
    left: 10,
    right: 10,
    zIndex: 1,
    backgroundColor: 'transparent',
  },
  searchInput: {
    height: 50,
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    borderRadius: 25,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  radiusContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  radiusText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 10,
  },
  radiusSlider: {
    width: '100%',
    height: 40,
  },
  helpText: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 15,
    marginTop: 10,
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  resetButton: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  resetButtonText: {
    color: '#007AFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default SearchBar; 