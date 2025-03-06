import React from 'react';
import { useRouter } from 'expo-router';
import {ScrollView, View, Image, Text, TouchableOpacity} from 'react-native';
import tw from 'twrnc';
import AegisShield from '../assets/images/Aegis-Shield.png';
import google from '../assets/images/google.png';


const SignIn = () => {
    const handleLogin = () => {};
    const router = useRouter();

    return (
        <ScrollView contentContainerStyle={tw`flex-1 justify-center items-center bg-white px-4`}>
            <Image
                source={AegisShield}
                style={tw`w-60 h-60`}
                resizeMode="contain"
            />

            <Text style={tw`text-3xl font-bold text-gray-800 mt-4`}>
                Aegis Security Systems
            </Text>

            <TouchableOpacity
                onPress={handleLogin}
                style={tw`flex-row items-center justify-center bg-white shadow-md shadow-zinc-300 rounded-full w-full py-4 mt-5`}>
                    <Image source ={google}
                           style={tw`w-5 h-5 mr-3`}
                           resizeMode="contain"
                    />
                    <Text style={tw`text-lg font-rubik text-black-300`}>
                        Continue with Google
                    </Text>
            </TouchableOpacity>
            <View style={tw`w-full p-4`}>
                <Text
                    onPress={() => router.push('/home')}
                    style={tw`bg-blue-600 text-white text-center py-3 rounded-lg`}
                >
                    Go to home
                </Text>

            </View>
            <View style={tw`flex-1`} />

            <View style={tw`w-full p-4`}>
                <Text
                    onPress={() => router.push('/sign-up')}
                    style={tw`bg-blue-600 text-white text-center py-3 rounded-lg`}
                >
                    Go to Sign Up
                </Text>

            </View>
        </ScrollView>
    );
};

export default SignIn;
