import React, { useEffect, useRef, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  Image,
  Animated,
  Pressable,
  Alert,
  TouchableOpacity
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import AegisShield from '../../assets/images/Aegis-Shield.png';
import tw from 'twrnc';

import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useAuth } from '../Authprovider';
import { useTheme } from './ThemeProvider';

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const signOutUser = async () => {
    try {
      await signOut(auth);
      router.replace('/sign-in');
    } catch (error: any) {
      Alert.alert('Sign-out failed', error.message);
    }
  };

  const featureItems = [
    { name: 'Alerts', icon: 'alert-circle', route: '/nav-screens/AlertScreen' },
    { name: 'Live View', icon: 'eye', route: '/nav-screens/LiveViewScreen' },
    { name: 'Solenoid Lock', icon: 'lock-closed', route: '/nav-screens/Lock' },
    { name: 'Motion Sensor', icon: 'radio', route: '/nav-screens/Sensor' }
  ];

  const FeatureBox = ({ item }: any) => {
    const scale = useRef(new Animated.Value(1)).current;
    const animateIn = () => Animated.spring(scale, { toValue: 0.95, useNativeDriver: true }).start();
    const animateOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();

    return (
      <Animated.View style={[{ transform: [{ scale }] }, tw`m-3`]}>
        <Pressable
          onPressIn={animateIn}
          onPressOut={animateOut}
          onPress={() => router.push(item.route)}
          style={tw`w-38 h-44 rounded-2xl overflow-hidden`}
        >
          <LinearGradient
            colors={['#6EA0F7', '#6290DF']}
            start={{ x: 0, y: 1 }}
            end={{ x: 0, y: 0 }}
            style={tw`flex-1 items-center justify-center px-3 py-4`}
          >
            <Ionicons name={item.icon} size={28} color="white" style={tw`mb-3`} />
            <Text style={tw`text-lg text-white text-center font-semibold`}>{item.name}</Text>
          </LinearGradient>
        </Pressable>
      </Animated.View>
    );
  };

  return (
    <View style={tw`${isDark ? 'bg-black' : 'bg-gray-50'} flex-1 relative`}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header */}
      <View style={tw`flex-row items-center justify-between px-6 pt-12`}>
        <View style={tw`flex-row items-center`}>
          <Image source={AegisShield} style={tw`w-10 h-10 mr-3`} />
          <View>
            <Text style={tw`${isDark ? 'text-white' : 'text-black'} text-base font-bold`}>
              Hello, {user?.email?.split('@')[0]}!
            </Text>
            <Text style={tw`${isDark ? 'text-gray-400' : 'text-gray-600'} text-xs mt-0.5`}>
              {time.toLocaleString()}
            </Text>
          </View>
        </View>
        <View style={tw`flex-row items-center`}>
          <Pressable onPress={toggleTheme} style={tw`mr-3`}>
            <Ionicons
              name={isDark ? 'sunny-outline' : 'moon-outline'}
              size={22}
              color={isDark ? 'white' : 'black'}
            />
          </Pressable>
          <Pressable onPress={() => router.push('/nav-screens/settings')}>
            <Ionicons name="people-outline" size={22} color={isDark ? 'white' : 'black'} />
          </Pressable>
        </View>
      </View>

      {/* Body */}
      <ScrollView contentContainerStyle={tw`pb-40 pt-6`}>
        <View style={tw`w-11/12 h-0.5 ${isDark ? 'bg-gray-700' : 'bg-gray-300'} self-center`} />

        <View style={tw`flex-row flex-wrap justify-center mt-10 px-4`}>
          {featureItems.map((item, index) => (
            <FeatureBox key={index} item={item} />
          ))}
        </View>

        <View style={tw`items-center mt-10`}>
          <TouchableOpacity onPress={signOutUser} style={tw`bg-red-600 px-6 py-3 rounded-lg`}>
            <Text style={tw`text-white text-lg font-medium`}>Log Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <TouchableOpacity
        onPress={() => router.push('/nav-screens/AddFaces')}
        style={tw`absolute bottom-28 left-6 bg-white w-14 h-14 rounded-full items-center justify-center shadow-lg border border-gray-300`}
      >
        <Ionicons name="add" size={28} color="#1D4ED8" />
      </TouchableOpacity>
    </View>
  );
}
