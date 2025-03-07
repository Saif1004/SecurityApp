import { ScrollView, View, Text, Image, Pressable } from 'react-native';
import * as React from 'react';
import tw from 'twrnc';
import AegisShield from '../assets/images/Aegis-Shield.png';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function LiveViewScreen({ navigation }) {
  return (
    <View style={tw`w-full p-4`}>
      <Text
        onPress={() => navigation.navigate('Home')}
        style={tw`bg-blue-600 text-white text-center py-3 rounded-lg`}
      >
        Go to home
      </Text>
    </View>
  );
}
