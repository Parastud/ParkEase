import React, { useCallback, memo, useMemo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { 
  SlideInDown, 
  SlideOutDown, 
  useAnimatedStyle, 
  useSharedValue, 
  withTiming,
  runOnJS,
  withSpring,
  interpolate,
  Extrapolate,
  withSequence,
  Easing,
  useAnimatedReaction
} from 'react-native-reanimated';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { useAnimatedGestureHandler } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

// Pre-create stable icons once for the entire application lifecycle
const icons = {
  car: <Ionicons name="car" size={18} color="#007AFF" />,
  location: <Ionicons name="location" size={18} color="#007AFF" />,
  time: <Ionicons name="time" size={18} color="#007AFF" />,
  star: <Ionicons name="star" size={16} color="#FFD700" />,
  navigate: <Ionicons name="navigate" size={20} color="#007AFF" />,
  chevronForward: <Ionicons name="chevron-forward" size={24} color="#007AFF" />,
  chevronBack: <Ionicons name="chevron-back" size={24} color="#007AFF" />
};

// Move styles outside component to prevent recreation
const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 10,
    left: 15,
    right: 15,
    borderRadius: 20,
    overflow: 'hidden',
    zIndex: 5,
    backgroundColor: 'transparent'
  },
  card: {
    borderRadius: 20,
    padding: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  swipeIndicator: {
    alignItems: 'center',
    marginBottom: 10,
  },
  swipeLine: {
    width: 40,
    height: 5,
    backgroundColor: '#ddd',
    borderRadius: 3,
    marginBottom: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  titleContainer: {
    flex: 1,
    marginRight: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginLeft: 4,
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  infoContainer: {
    marginBottom: 15,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  infoText: {
    fontSize: 15,
    color: '#555',
    flex: 1,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bookButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  gradientButton: {
    height: '100%',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#007AFF',
  },
  bookText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  swipeArrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 122, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  leftArrow: {
    left: -10,
  },
  rightArrow: {
    right: -10,
  },
  staticContent: {
    backgroundColor: 'transparent',
  }
});
const IconWrapper = memo(({ children }) => {
  return (
    <View style={styles.iconWrapper}>
      {children}
    </View>
  );
});

const InfoItem = memo(({ icon, text }) => {
  return (
    <View style={styles.infoItem}>
      <IconWrapper>
        {icon}
      </IconWrapper>
      <Text style={styles.infoText}>{text}</Text>
    </View>
  );
});
const StaticButtonLayout = memo(({ onBook, onNavigate }) => {
  return (
    <View style={styles.buttonContainer}>
      <TouchableOpacity 
        style={styles.bookButton} 
        onPress={onBook}
      >
        <View style={styles.gradientButton}>
          <Text style={styles.bookText}>Book Now</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
});
const ParkingCard = memo(({ 
  parking, 
  onBook, 
  onNavigate, 
  onSwipeNext, 
  onSwipePrev 
}) => {
  const {
    title = 'Parking Spot',
    price = 'Price unavailable',
    rating = '4.5',
    distance = null,
    availableSpots = 0,
    totalSpots = 0,
    hours = '24 hours',
    description = 'Convenient parking location with security and easy access.'
  } = parking;
  const translateX = useSharedValue(0);
  const isAnimating = useSharedValue(0);
  
  const handleSwipeComplete = useCallback((direction) => {
    if (direction === 'left' && onSwipeNext) {
      onSwipeNext();
    } else if (direction === 'right' && onSwipePrev) {
      onSwipePrev();
    }
  }, [onSwipeNext, onSwipePrev]);

  // Handlers wrapped in useCallback to ensure stable references
  const handleNavigate = useCallback(() => {
    if (onNavigate) onNavigate();
  }, [onNavigate]);

  const handleBook = useCallback(() => {
    if (onBook) onBook();
  }, [onBook]);

  // Memoize text values that need calculations to prevent re-renders
  const distanceText = useMemo(() => 
    distance ? `${distance.toFixed(1)} km away` : 'Distance unknown',
    [distance]
  );
  
  const spotsText = useMemo(() => 
    `${availableSpots} of ${totalSpots} spots available`,
    [availableSpots, totalSpots]
  );
  
  // Using proper animated gesture handler
  const gestureHandler = useAnimatedGestureHandler({
    onStart: (_, ctx) => {
      ctx.startX = translateX.value;
      isAnimating.value = 0;
    },
    onActive: (event, ctx) => {
      if (isAnimating.value === 1) return;
      
      // Add resistance when swiping beyond a certain point
      const dragX = event.translationX;
      const resistance = 0.6; // Less resistance for smoother feel
      
      if (dragX > 0) {
        // Swiping right (to previous)
        translateX.value = ctx.startX + (dragX > 100 ? 100 + (dragX - 100) * resistance : dragX);
      } else {
        // Swiping left (to next)
        translateX.value = ctx.startX + (dragX < -100 ? -100 + (dragX + 100) * resistance : dragX);
      }
    },
    onEnd: (event) => {
      if (isAnimating.value === 1) return;
      
      const velocity = event.velocityX;
      const threshold = 50;
      const velocityThreshold = 500;
      
      if (event.translationX < -threshold || velocity < -velocityThreshold) {
        // Swiped left - show next parking
        isAnimating.value = 1;
        
        // Use velocity for more dynamic feel
        const duration = Math.min(400, 300000 / Math.abs(velocity || 1) + 100);
        
        translateX.value = withSequence(
          withTiming(-width * 1.05, { 
            duration: duration, 
            easing: Easing.out(Easing.cubic) 
          }),
          withTiming(-width, { 
            duration: 100, 
            easing: Easing.inOut(Easing.cubic) 
          }, () => {
            runOnJS(handleSwipeComplete)('left');
            translateX.value = withSequence(
              withTiming(width, { duration: 0 }),
              withTiming(0, { 
                duration: 300, 
                easing: Easing.out(Easing.back(2)) 
              }, () => {
                isAnimating.value = 0;
              })
            );
          })
        );
        
      } else if (event.translationX > threshold || velocity > velocityThreshold) {
        // Swiped right - show previous parking
        isAnimating.value = 1;
        
        // Use velocity for more dynamic feel
        const duration = Math.min(400, 300000 / Math.abs(velocity || 1) + 100);
        
        translateX.value = withSequence(
          withTiming(width * 1.05, { 
            duration: duration, 
            easing: Easing.out(Easing.cubic) 
          }),
          withTiming(width, { 
            duration: 100, 
            easing: Easing.inOut(Easing.cubic) 
          }, () => {
            runOnJS(handleSwipeComplete)('right');
            translateX.value = withSequence(
              withTiming(-width, { duration: 0 }),
              withTiming(0, { 
                duration: 300, 
                easing: Easing.out(Easing.back(2)) 
              }, () => {
                isAnimating.value = 0;
              })
            );
          })
        );
        
      } else {
        // Reset if swipe wasn't far enough - bounce back with spring
        translateX.value = withSpring(0, {
          damping: 20,
          stiffness: 200,
          mass: 0.5,
          overshootClamping: false,
          restDisplacementThreshold: 0.01,
          restSpeedThreshold: 2,
        });
      }
    },
  });
  
  // Create animations for rotation, scale and opacity based on translateX
  const animatedStyle = useAnimatedStyle(() => {
    // Add slight rotation for more realistic card feel
    const rotate = interpolate(
      translateX.value,
      [-width, 0, width],
      [-5, 0, 5],
      Extrapolate.CLAMP
    );
    
    // Add slight scale change during dragging
    const scale = interpolate(
      Math.abs(translateX.value),
      [0, 100, width],
      [1, 0.98, 0.95],
      Extrapolate.CLAMP
    );
    
    return {
      transform: [
        { translateX: translateX.value },
        { rotate: `${rotate}deg` },
        { scale }
      ],
    };
  });

  // Animations for the navigation arrows
  const leftArrowStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [-50, 0, width],
      [0, 0, 1],
      Extrapolate.CLAMP
    );
    
    return {
      opacity,
      transform: [
        { scale: interpolate(translateX.value, [0, width], [0.5, 1], Extrapolate.CLAMP) }
      ]
    };
  });
  
  const rightArrowStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [-width, 0, 50],
      [1, 0, 0],
      Extrapolate.CLAMP
    );
    
    return {
      opacity,
      transform: [
        { scale: interpolate(translateX.value, [-width, 0], [1, 0.5], Extrapolate.CLAMP) }
      ]
    };
  });

  // Memoize static content to prevent re-rendering during animations
  const staticContent = useMemo(() => (
    <View style={styles.staticContent}>
      <View style={styles.swipeIndicator}>
        <View style={styles.swipeLine} />
      </View>

      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.ratingContainer}>
            {icons.star}
            <Text style={styles.rating}>{rating}</Text>
          </View>
        </View>
        <Text style={styles.price}>{price}</Text>
      </View>
      
      <View style={styles.infoContainer}>
        <InfoItem 
          icon={icons.location}
          text={distanceText}
        />
        
        <InfoItem 
          icon={icons.car}
          text={spotsText}
        />
        
        <InfoItem 
          icon={icons.time}
          text={hours}
        />
      </View>
      
      <Text style={styles.description}>
        {description}
      </Text>
      
      <StaticButtonLayout
        onBook={handleBook}
      />
    </View>
  ), [title, price, rating, distanceText, spotsText, hours, description, handleBook]);

  return (
    <View style={{ overflow: 'visible' }}>
      <Animated.View style={[styles.swipeArrow, styles.rightArrow, rightArrowStyle]}>
        {icons.chevronForward}
      </Animated.View>
      
      <Animated.View style={[styles.swipeArrow, styles.leftArrow, leftArrowStyle]}>
        {icons.chevronBack}
      </Animated.View>
      
      <PanGestureHandler
        onGestureEvent={gestureHandler}
        activeOffsetX={[-5, 5]}
        failOffsetY={[-20, 20]}
      >
        <Animated.View style={[styles.card, animatedStyle]}>
          {staticContent}
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
});

// Main component
const ParkingDetails = (props) => {
  const { parking } = props;
  
  if (!parking) return null;

  return (
    <Animated.View 
      style={styles.container}
      entering={SlideInDown.springify().damping(15)}
      exiting={SlideOutDown.duration(200)}
    >
      <ParkingCard {...props} />
    </Animated.View>
  );
};

export default memo(ParkingDetails); 