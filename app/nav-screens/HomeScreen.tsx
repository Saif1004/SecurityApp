import { ScrollView, View, Text, Image, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../Authprovider';
import React, { useState, useEffect } from 'react';
import auth from '@react-native-firebase/auth';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [time, setTime] = useState(new Date());
  const [activeBox, setActiveBox] = useState<string | null>(null);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handlePress = (screen: string) => {
    setActiveBox(screen);
    router.push(`/nav-screens/${screen}`);
  };

  const signOutUser = async () => {
    if (!user) {
      Alert.alert('Sign-out failed', 'No user is currently signed in.');
      return;
    }
    try {
      await auth().signOut();
      router.replace('/sign-in');
    } catch (error: any) {
      Alert.alert('Sign-out failed', error.message);
    }
  };

  return (
    <ScrollView contentContainerStyle={tw`flex-1 px-6 pt-2 pb-4 bg-gray-50`}>
      {/* Header with time */}
      <View style={tw`flex-row justify-between items-center mt-4`}>
        <View style={tw`flex-row items-center`}>
          <Image 
            source={require('../../assets/images/Aegis-Shield.png')} 
            style={tw`w-12 h-12 rounded-full mr-3 ml-2`} 
          />
          <View>
            <Text style={tw`text-black text-base font-bold`}>Hello, {user?.email}!</Text>
            <Text style={tw`text-gray-600 mt-1 text-sm`}>
              {time.toLocaleDateString()} {time.toLocaleTimeString()}
            </Text>
          </View>
        </View>
      </View>

      {/* Divider line */}
      <View style={tw`w-full h-0.5 bg-gray-300 mt-4`} />

      {/* Grid buttons */}
      <View style={tw`w-full mt-6`}>
        <View style={tw`flex-row justify-between mb-3`}>
          <GridItem
            active={activeBox === 'AlertScreen'}
            onPress={() => handlePress('AlertScreen')}
            icon="alert-circle"
            label="Alerts"
          />
          <GridItem
            active={activeBox === 'LiveViewScreen'}
            onPress={() => handlePress('LiveViewScreen')}
            icon="eye"
            label="Live View"
          />
        </View>
        <View style={tw`flex-row justify-between`}>
          <GridItem
            active={activeBox === 'Lock'}
            onPress={() => handlePress('Lock')}
            icon="lock-closed"
            label="Solenoid Lock"
          />
          <GridItem
            active={activeBox === 'Sensor'}
            onPress={() => handlePress('Sensor')}
            icon="radio"
            label="Motion Sensor"
          />
        </View>
      </View>

      {/* Logout button */}
      <View style={tw`mt-6 mb-4 items-center`}>
        <TouchableOpacity
          onPress={signOutUser}
          style={tw`bg-red-600 px-6 py-3 rounded-lg w-full max-w-xs`}
        >
          <Text style={tw`text-white text-lg text-center`}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// Grid Item Component
function GridItem({
  active,
  onPress,
  icon,
  label,
}: { 
  active: boolean; 
  onPress: () => void; 
  icon: string; 
  label: string 
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[tw`w-[48%] aspect-square rounded-2xl overflow-hidden`, active ? tw`bg-white` : null]}
    >
      <LinearGradient
        colors={['#1D4ED8', '#22D3EE']}
        style={tw`flex-1 items-center justify-center p-2`}
      >
        <Ionicons name={icon as any} size={24} color="white" style={tw`mb-2`} />
        <Text style={tw`text-white text-center text-base font-medium`}>{label}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}