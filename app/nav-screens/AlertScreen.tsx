import { ScrollView, View, Text, Image, Pressable } from 'react-native';
import * as React from 'react';
import tw from 'twrnc';
import AegisShield from '../assets/images/Aegis-Shield.png';
import {router} from 'expo-router';

export default function AlertScreen() {
  return (
    <View style={tw`w-full p-4`}>
      <Text
          onPress={() => router.push('/home')}
        style={tw`bg-blue-600 text-white text-center py-3 rounded-lg`}
      >
        this is alert
      </Text>
    </View>

  );
}
