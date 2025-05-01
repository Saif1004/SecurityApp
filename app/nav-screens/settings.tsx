import { View, Text, Pressable } from 'react-native';
import * as React from 'react';
import tw from 'twrnc';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function Settings() {
  return (
    <View style={tw`flex-1 w-full p-4 bg-white`}>
      <StatusBar style="dark" />

      <Text style={tw`text-xl font-bold mb-4`}>Settings</Text>

      <Pressable
        style={tw`bg-blue-600 mb-4 py-3 px-4 rounded-lg`}
        onPress={() => router.push('/nav-screens/HomeScreen')}
      >
        <Text style={tw`text-white text-center`}>Go to Home</Text>
      </Pressable>

      <Pressable
        style={tw`bg-green-600 py-3 px-4 rounded-lg`}
        onPress={() => router.push('/nav-screens/users')}
      >
        <Text style={tw`text-white text-center`}>Go to Users</Text>
      </Pressable>
    </View>
  );
}
