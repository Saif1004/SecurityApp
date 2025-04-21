import { ScrollView, View, Text, Image, Pressable } from 'react-native';
import * as React from 'react';
import tw from 'twrnc';
import AegisShield from '../assets/images/Aegis-Shield.png';
import {router, useRouter} from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function LiveViewScreen() {
  return (
    <View style={tw`w-full p-4`}>
      <Text
        onPress={() => router.push('/nav-screens/HomeScreen')}
        style={tw`bg-blue-600 text-white text-center py-3 rounded-lg`}
      >
        this is settings
      </Text>
    </View>
  );
}