import { ScrollView, View, Text, Image, Button, TouchableOpacity, Alert } from 'react-native';
import React, { useEffect, useState } from 'react';
import tw from 'twrnc';
import AegisShield from '../../assets/images/Aegis-Shield.png';
import auth from '@react-native-firebase/auth';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../AuthProvider';

export default function HomeScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const [time, setTime] = useState(new Date());
    const time2 = '16:00';

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

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
        <ScrollView contentContainerStyle={[tw`flex-1 px-6 py-4`, { backgroundColor: '#F4F3F8' }]}>
            {/* Top Section */}
            <View style={tw`flex-row justify-between items-center mt-8`}>
                <View style={tw`flex-row items-center`}>
                    <Image source={AegisShield} style={tw`w-12 h-12 rounded-full mr-3 ml-4`} />
                    <View>
                        <Text style={[tw`text-black text-base`, { fontWeight: '250', fontSize: 19 }]}>Hello, {user?.email}!</Text>
                        <Text style={[tw`text-gray-600 mt-2`, { fontSize: 12 }]}>{time.toLocaleString()}</Text>
                    </View>
                </View>
                <TouchableOpacity style={tw`mr-8`}>
                    <Ionicons name="settings-outline" size={24} color="black" />
                </TouchableOpacity>
            </View>

            <View style={tw`w-77 h-0.4 bg-gray-300 mt-6 ml-4`} />

            <Text style={tw`text-gray-600 text-center mt-8 mr-4`}>The kids arrived home at {time2}h</Text>

            <View style={tw`w-full flex-row flex-wrap shadow-lg justify-center items-center mt-8`}>
                {[
                    { name: 'Alerts', icon: 'alert-circle', route: '../nav-screens/AlertScreen' },
                    { name: 'Live view', icon: 'eye', route: '../nav-screens/LiveViewScreen' },
                    { name: 'Solenoid lock', icon: 'lock-closed', route: '../nav-screens/Lock' },
                    { name: 'Motion', icon: 'radio', route: '../nav-screens/Sensor' }
                ].map((item, index) => (
                    <TouchableOpacity
                        key={index}
                        onPress={() => router.push(item.route)}
                        style={[tw`w-37 h-44 rounded-2xl m-2 p-4`, { backgroundColor: '#4c7efc' }]}
                    >
                        <Ionicons name={item.icon} size={20} color="white" style={tw`w-7 h-7 mb-4`} />
                        <Text style={[tw`text-white`, { fontSize: 16 }]}>{item.name}</Text>
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
