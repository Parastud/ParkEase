import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions, FlatList } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolate
} from 'react-native-reanimated';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAX_TRANSLATE_Y = -SCREEN_HEIGHT + 50;
const MIN_TRANSLATE_Y = 0;
const SPRING_CONFIG = {
  damping: 50,
  mass: 0.3,
  stiffness: 121.6,
  initialVelocity: 0,
};

const ModalSwipe = ({ parkingSpots, onSelectParking, location, currentSelected }) => {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  const scrollTo = useCallback((destination) => {
    'worklet';
    translateY.value = withSpring(destination, SPRING_CONFIG);
  }, []);

  const handleOpenSheet = useCallback(() => {
    scrollTo(MAX_TRANSLATE_Y);
    setIsExpanded(true);
    setIsVisible(true);
  }, [scrollTo]);

  const handleCloseSheet = useCallback(() => {
    scrollTo(MIN_TRANSLATE_Y);
    setIsExpanded(false);
    setIsVisible(false);
  }, [scrollTo]);

  const isActive = useCallback(() => {
    return translateY.value < -SCREEN_HEIGHT / 3;
  }, []);

  const rBottomSheetStyle = useAnimatedStyle(() => {
    const borderRadius = interpolate(
      translateY.value,
      [MAX_TRANSLATE_Y + 50, MAX_TRANSLATE_Y],
      [25, 25],
      Extrapolate.CLAMP
    );

    return {
      borderRadius,
      transform: [{ translateY: translateY.value }],
    };
  });

  const rBackdropStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateY.value,
      [MAX_TRANSLATE_Y + 50, MAX_TRANSLATE_Y],
      [0.5, 0],
      Extrapolate.CLAMP
    );

    return {
      opacity,
    };
  });

  const gestureHandler = useCallback((event) => {
    'worklet';
    const { translationY } = event;
    translateY.value = translationY;

    if (event.state === 4) {
      if (translateY.value > -SCREEN_HEIGHT / 3) {
        scrollTo(MIN_TRANSLATE_Y);
        runOnJS(setIsExpanded)(false);
        runOnJS(setIsVisible)(false);
      } else {
        scrollTo(MAX_TRANSLATE_Y);
        runOnJS(setIsExpanded)(true);
        runOnJS(setIsVisible)(true);
      }
    }
  }, [scrollTo]);

  const renderItem = useCallback(({ item }) => (
    <TouchableOpacity
      style={[
        styles.parkingItem,
        currentSelected?.id === item.id && styles.selectedItem
      ]}
      onPress={() => onSelectParking(item)}
    >
      <View style={styles.parkingItemContent}>
        <View style={styles.parkingItemHeader}>
          <Text style={styles.parkingTitle}>{item.title}</Text>
          <Text style={styles.parkingPrice}>{item.price}</Text>
        </View>
        <View style={styles.parkingDetails}>
          <View style={styles.detailRow}>
            <MaterialIcons name="location-on" size={16} color="#666" />
            <Text style={styles.detailText}>
              {item.distance ? `${item.distance.toFixed(1)} km away` : 'Distance unknown'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <MaterialIcons name="local-parking" size={16} color="#666" />
            <Text style={styles.detailText}>
              {item.availableSpots} spots available
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  ), [currentSelected, onSelectParking]);

  return (
    <>
      <Animated.View style={[styles.backdrop, rBackdropStyle]} />
      
      <PanGestureHandler onGestureEvent={gestureHandler}>
        <Animated.View style={[styles.bottomSheetContainer, rBottomSheetStyle]}>
          <View style={styles.line} />
          
          <View style={styles.content}>
            <View style={styles.header}>
              <Text style={styles.title}>Nearby Parking Spots</Text>
              <Text style={styles.subtitle}>
                {parkingSpots.length} spot{parkingSpots.length !== 1 ? 's' : ''} found
              </Text>
            </View>

            <FlatList
              data={parkingSpots}
              renderItem={renderItem}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
            />
          </View>
        </Animated.View>
      </PanGestureHandler>

      {!isVisible && (
        <TouchableOpacity 
          style={styles.handle}
          onPress={handleOpenSheet}
        >
          <View style={styles.handleContent}>
            <View style={styles.handleLine} />
            <Text style={styles.handleText}>Swipe up to show parking spots</Text>
          </View>
        </TouchableOpacity>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    zIndex: 1,
  },
  bottomSheetContainer: {
    height: SCREEN_HEIGHT,
    width: '100%',
    backgroundColor: '#fff',
    position: 'absolute',
    top: SCREEN_HEIGHT,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    zIndex: 2,
  },
  line: {
    width: 75,
    height: 4,
    backgroundColor: '#DEDEDE',
    alignSelf: 'center',
    marginVertical: 15,
    borderRadius: 10,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  listContent: {
    paddingBottom: 20,
  },
  parkingItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  selectedItem: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  parkingItemContent: {
    flex: 1,
  },
  parkingItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  parkingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  parkingPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  parkingDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
  },
  handle: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 15,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 3,
  },
  handleContent: {
    alignItems: 'center',
  },
  handleLine: {
    width: 40,
    height: 4,
    backgroundColor: '#DEDEDE',
    borderRadius: 2,
    marginBottom: 8,
  },
  handleText: {
    fontSize: 14,
    color: '#666',
  },
});

export default ModalSwipe;
