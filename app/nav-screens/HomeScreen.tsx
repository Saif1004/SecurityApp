import { ScrollView, View, Text, Image, TouchableOpacity, Alert } from 'react-native';
import React, { useEffect, useState } from 'react';
import tw from 'twrnc';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AegisShield from '../../assets/images/Aegis-Shield.png';
import auth from '@react-native-firebase/auth';
import { useAuth } from '../AuthProvider';

export default function AlertHomeScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const [time, setTime] = useState(new Date());
    const [activeBox, setActiveBox] = useState<string | null>(null);
    const time2 = '16:00';

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const handlePress = (screen: string) => {
        setActiveBox(screen);
        setTimeout(() => {
            setActiveBox(null);
            router.push(screen as any);
        }, 500);
    };

    const signOutUser = async () => {
        if (!user) {
            Alert.alert('Sign-out failed', 'No user is currently signed in.');
            return;
        }
        try {
            await auth().signOut();
            router.replace('/sign-in');
        } catch (error) {
            Alert.alert('Sign-out failed', error.message);
        }
    };

    return (
        <ScrollView contentContainerStyle={tw`flex-1 px-6 pt-2 pb-4 bg-gray-50`}>
            {/* Header Section - Moved up */}
            <View style={tw`flex-row justify-between items-center mt-4`}>
                <View style={tw`flex-row items-center`}>
                    <Image source={AegisShield} style={tw`w-12 h-12 rounded-full mr-3 ml-2`} />
                    <View>
                        <Text style={tw`text-black text-base font-bold`}>Hello, {user?.email}!</Text>
                        <Text style={tw`text-gray-600 mt-1 text-sm`}>{time.toLocaleString()}</Text>
                    </View>
                </View>
                <TouchableOpacity onPress={() => router.push('/nav-screens/settings')} style={tw`mr-4`}>
                    <Ionicons name="settings-outline" size={24} color="black" />
                </TouchableOpacity>
            </View>

            <View style={tw`w-77 h-0.5 bg-gray-300 mt-4 ml-2`} />
            <Text style={tw`text-gray-600 text-center mt-4`}>The kids arrived home at {time2}h</Text>

            {/* Grid Section - Compact layout */}
            <View style={tw`w-full mt-6`}>
                <View style={tw`flex-row justify-between mb-3`}>
                    <GridItem 
                        active={activeBox === '/nav-screens/AlertScreen'}
                        onPress={() => handlePress('/nav-screens/AlertScreen')}
                        icon="alert-circle"
                        label="Alerts"
                    />
                    <GridItem 
                        active={activeBox === '/nav-screens/LiveViewScreen'}
                        onPress={() => handlePress('/nav-screens/LiveViewScreen')}
                        icon="eye"
                        label="Live View"
                    />
                </View>
                <View style={tw`flex-row justify-between`}>
                    <GridItem 
                        active={activeBox === '/nav-screens/Lock'}
                        onPress={() => handlePress('/nav-screens/Lock')}
                        icon="lock-closed"
                        label="Solenoid Lock"
                    />
                    <GridItem 
                        active={activeBox === '/nav-screens/Motion Sensor'}
                        onPress={() => handlePress('/nav-screens/Motion Sensor')}
                        icon="radio"
                        label="Motion Sensor"
                    />
                </View>
            </View>

            {/* Logout Button - Now properly positioned */}
            <View style={tw`mt-6 mb-4 items-center`}>
                <TouchableOpacity 
                    onPress={signOutUser} 
                    style={tw`bg-red-600 px-6 py-3 rounded-lg w-full max-w-xs`}
                >
                    <Text style={tw`text-white text-lg text-center`}>Log Out</Text>
                </TouchableOpacity>
            </View>

            {/* Floating Add Button - Adjusted position */}
            <TouchableOpacity 
                style={tw`absolute bottom-20 right-6 w-12 h-12 bg-white rounded-full shadow-lg items-center justify-center`}
            >
                <Ionicons name="add" size={24} color="black" />
            </TouchableOpacity>
        </ScrollView>
    );
}

// Extracted Grid Item component for cleaner code
function GridItem({ active, onPress, icon, label }: { 
    active: boolean; 
    onPress: () => void; 
    icon: string; 
    label: string 
}) {
    return (
        <TouchableOpacity
            onPress={onPress}
            style={[
                tw`w-[48%] aspect-square rounded-2xl overflow-hidden`,
                active ? tw`bg-white` : null
            ]}
        >
            <LinearGradient
                colors={['#1D4ED8', '#22D3EE']}
                style={tw`flex-1 items-center justify-center p-2`}
            >
                <Ionicons name={icon as any} size={20} color="white" style={tw`mb-1`} />
                <Text style={tw`text-white text-center text-base`}>{label}</Text>
            </LinearGradient>
        </TouchableOpacity>
    );
}