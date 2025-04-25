import React from 'react';
import { useRouter } from 'expo-router';
import { ScrollView, View, Text, TouchableOpacity } from 'react-native';
import { MotiImage, MotiView } from 'moti';
import tw from 'twrnc';
import AegisShield from '@/assets/images/Aegis-Shield.png';

export default function Index() {
    const router = useRouter();

    return (
        <ScrollView contentContainerStyle={tw`flex-1 bg-white`}>
            <View style={tw`flex-1 justify-center items-center px-6 py-10`}>
                
                {/* Animated Logo */}
                <MotiImage
                    from={{ opacity: 0, translateY: -50 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: 'timing', duration: 1000 }}
                    source={AegisShield}
                    style={tw`w-48 h-48 mb-8`}
                    resizeMode="contain"
                />

                {/* Animated Welcome Text */}
                <MotiView
                    from={{ opacity: 0, translateY: 20 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ delay: 500, type: 'timing', duration: 800 }}
                >
                    <Text style={tw`text-2xl font-extrabold text-gray-800 text-center mb-2`}>
                        Welcome to
                    </Text>
                    <Text style={tw`text-3xl font-extrabold text-blue-600 text-center`}>
                        Aegis Security Systems
                    </Text>
                </MotiView>

                {/* Spacer */}
                <View style={tw`flex-1`} />

                {/* Animated Button */}
                <MotiView
                    from={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 1000, type: 'spring', damping: 10 }}
                    style={tw`w-full mb-8`}
                >
                    <TouchableOpacity
                        onPress={() => router.push('/sign-in')}
                        style={tw`bg-blue-600 rounded-full py-4 px-8`}
                    >
                        <Text style={tw`text-white text-center text-lg font-semibold`}>
                            Go to Sign In
                        </Text>
                    </TouchableOpacity>
                </MotiView>

            </View>
        </ScrollView>
    );
}
