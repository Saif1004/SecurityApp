// app/nav-screens/Lock.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import * as Haptics from 'expo-haptics'; // 👈 Vibration!

const NGROK_URL = 'https://cerberus.ngrok.dev'; // Your server URL

export default function LockScreen() {
  const [loading, setLoading] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const rotateAnim = useState(new Animated.Value(0))[0];

  const handleUnlock = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${NGROK_URL}/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();

      if (response.ok) {
        animateUnlock();
        setUnlocked(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); // 👈 Vibrate on success
        Alert.alert('Success', 'Lock has been unlocked!');
      } else {
        Alert.alert('Error', data.message || 'Failed to unlock.');
      }
    } catch (error) {
      Alert.alert('Error', 'Unable to reach server.');
    } finally {
      setLoading(false);
    }
  };

  const animateUnlock = () => {
    Animated.timing(rotateAnim, {
      toValue: unlocked ? 0 : 1, // 👈 if already unlocked, rotate back to locked
      duration: 800,
      useNativeDriver: true,
    }).start(() => {
      // After unlock animation
      setUnlocked(prev => !prev);
    });
  };

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'], // Rotate 45 degrees on unlock
  });

  const lockColor = unlocked ? "#22c55e" : "#6EA0F7"; // 👈 Green if unlocked, blue if locked

  return (
    <View style={tw`flex-1 bg-black justify-center items-center`}>
      <Animated.View style={{ transform: [{ rotate: rotation }], marginBottom: 24 }}>
        <Ionicons
          name={unlocked ? "lock-open-outline" : "lock-closed-outline"}
          size={100}
          color={lockColor}
        />
      </Animated.View>

      <Text style={[tw`text-2xl font-bold mb-4`, { color: lockColor }]}>
        {unlocked ? 'Door Unlocked!' : 'Solenoid Lock Control'}
      </Text>

      {loading ? (
        <ActivityIndicator size="large" color={lockColor} />
      ) : (
        <TouchableOpacity
          style={tw`bg-[${lockColor}] py-3 px-10 rounded-xl`}
          onPress={handleUnlock}
        >
          <Text style={tw`text-white text-lg font-semibold`}>
            {unlocked ? 'Lock Again' : 'Unlock Door'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
