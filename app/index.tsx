import React from 'react';
import { useRouter } from 'expo-router';
import { ScrollView, View, Image, Text } from 'react-native';
import tw from 'twrnc';
import AegisShield from '@/assets/images/Aegis-Shield.png';

export default function Index() {
    const router = useRouter();
    const API_BASE_URL = "https://f600-77-100-167-19.ngrok-free.app";

    return (
        <ScrollView contentContainerStyle={tw`flex-1 justify-center items-center bg-white px-4`}>
            <Image
                source={AegisShield}
                style={tw`w-60 h-60`}
                resizeMode="contain"
            />

            <Text style={tw`text-center text-3xl font-bold text-gray-800 mt-4`}>
                Welcome to Aegis Security Systems
            </Text>

            <View style={tw`flex-1`} />

            <View style={tw`w-full p-4`}>
                <Text
                    onPress={() => router.push('/sign-in')}
                    style={tw`bg-blue-600 text-white text-center py-3 rounded-lg`}
                >
                    Go to Sign In
                </Text>
            </View>
        </ScrollView>
    );
}
