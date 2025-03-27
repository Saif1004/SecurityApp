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
        <ScrollView contentContainerStyle={tw`flex-1 px-6 py-4 bg-gray-50`}>
            <View style={tw`flex-row justify-between items-center mt-8`}>
                <View style={tw`flex-row items-center`}>
                    <Image source={AegisShield} style={tw`w-12 h-12 rounded-full mr-3 ml-4`} />
                    <View>
                        <Text style={tw`text-black text-base font-bold`}>Hello, {user?.email}!</Text>
                        <Text style={tw`text-gray-600 mt-2 text-sm`}>{time.toLocaleString()}</Text>
                    </View>
                </View>
                <TouchableOpacity onPress={() => router.push('/nav-screens/settings')} style={tw`mr-8`}>
                    <Ionicons name="settings-outline" size={24} color="black" />
                </TouchableOpacity>
            </View>

            <View style={tw`w-77 h-0.5 bg-gray-300 mt-6 ml-4`} />
            <Text style={tw`text-gray-600 text-center mt-8`}>The kids arrived home at {time2}h</Text>

            <View style={tw`w-full flex-row flex-wrap justify-center items-center mt-8`}>
                {[
                    { name: 'Alerts', icon: 'alert-circle', route: '/nav-screens/AlertScreen' },
                    { name: 'Live View', icon: 'eye', route: '/nav-screens/LiveViewScreen' },
                    { name: 'Solenoid Lock', icon: 'lock-closed', route: '/nav-screens/Lock' },
                    { name: 'Motion Sensor', icon: 'radio', route: '/nav-screens/Motion Sensor' }
                ].map((item, index) => (
                    <TouchableOpacity
                        key={index}
                        onPress={() => handlePress(item.route)}
                        style={[
                            tw`w-37 h-44 rounded-2xl m-2 overflow-hidden`,
                            activeBox === item.route ? tw`bg-white` : { backgroundColor: '#4c7efc' }
                        ]}>
                        <LinearGradient
                            colors={['#1D4ED8', '#22D3EE']}
                            start={{ x: 0, y: 1 }}
                            end={{ x: 0, y: 0 }}
                            style={tw`w-37 h-44 items-center justify-between p-4`}
                        >
                            <Ionicons name={item.icon} size={22} color="white" style={tw`mb-4`} />
                            <Text style={tw`text-lg text-white text-center`}>{item.name}</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                ))}
            </View>

            <View style={tw`flex-1 mt-10 mb-10 items-center`}>
                <TouchableOpacity onPress={signOutUser} style={tw`bg-red-600 px-6 py-3 rounded-lg`}>
                    <Text style={tw`text-white text-lg`}>Log Out</Text>
                </TouchableOpacity>
            </View>

            <TouchableOpacity style={tw`absolute bottom-27 left-18 -ml-6 w-12 h-12 bg-white rounded-full shadow-lg items-center justify-center`}>
                <Ionicons name="add" size={24} color="black" />
            </TouchableOpacity>
        </ScrollView>
    );
}
