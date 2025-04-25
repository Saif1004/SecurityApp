import { View, Text, Image, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../Authprovider';
import React, { useState, useEffect } from 'react';
import auth from '@react-native-firebase/auth';
import { MotiView } from 'moti';
import tw from 'twrnc';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [time, setTime] = useState(new Date());
  const [activeBox, setActiveBox] = useState<string | null>(null);

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
    <View style={tw`flex-1 bg-white pt-10 px-6`}>
      {/* Header */}
      <View style={tw`flex-row items-center mb-6`}>
        <Image 
          source={require('../../assets/images/Aegis-Shield.png')} 
          style={tw`w-14 h-14 rounded-full mr-4`} 
        />
        <View>
          <Text style={tw`text-gray-900 text-lg font-bold`}>Hello, {user?.email}!</Text>
          <Text style={tw`text-gray-500 text-sm mt-1`}>
            {time.toLocaleDateString()} • {time.toLocaleTimeString()}
          </Text>
        </View>
      </View>

      {/* Divider */}
      <View style={tw`w-full h-0.5 bg-gray-300 mb-6`} />

      {/* Main Content */}
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 600 }}
        style={tw`mb-8`}
      >
        <View style={tw`flex-row justify-between mb-5`}>
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
      </MotiView>

      <TouchableOpacity
        onPress={() => router.push('/nav-screens/AddFaces')}
        style={tw`absolute bottom-28 left-6 bg-white w-14 h-14 rounded-full items-center justify-center shadow-lg`}
      >
        <Ionicons name="add" size={28} color="#1D4ED8" />
      </TouchableOpacity>

      <MotiView
        from={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 500, type: 'spring', damping: 12 }}
        style={tw`items-center mt-6`}
      >
        <TouchableOpacity
          onPress={signOutUser}
          style={tw`bg-red-600 w-full max-w-xs py-4 rounded-full`}
        >
          <Text style={tw`text-white text-lg font-semibold text-center`}>
            Log Out
          </Text>
        </TouchableOpacity>
      </MotiView>
    </View>
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
      style={[
        tw`w-[48%] aspect-square rounded-3xl overflow-hidden shadow-md`, 
        active ? tw`bg-white` : null
      ]}
    >
      <LinearGradient
        colors={['#1D4ED8', '#22D3EE']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={tw`flex-1 items-center justify-center rounded-3xl p-3`}
      >
        <Ionicons name={icon as any} size={32} color="white" style={tw`mb-2`} />
        <Text style={tw`text-white text-base font-semibold text-center`}>
          {label}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}
