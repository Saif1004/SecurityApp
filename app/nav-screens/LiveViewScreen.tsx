import { View, Text, ActivityIndicator } from 'react-native';
import React, { useState, useEffect } from 'react';
import { Camera } from 'expo-camera';
import tw from 'twrnc';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function LiveViewScreen() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <View style={tw`flex-1 items-center justify-center`}>
        <ActivityIndicator size="large" color="#00ff00" />
      </View>
    );
  }

  if (hasPermission === null) {
    return <Text style={tw`text-center text-lg`}>Requesting camera permission...</Text>;
  }

  if (hasPermission === false) {
    return <Text style={tw`text-center text-red-500 text-lg`}>Camera access denied. Please enable it in settings.</Text>;
  }

  return (
    <View style={tw`flex-1`}>
      <StatusBar style="auto" />
      <Camera style={tw`flex-1`} />
      
    </View>
  );
}
