import { View } from 'react-native';
import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import Video from 'react-native-video';
import tw from 'twrnc';

export default function VideoScreen() {
  const { videoUrl } = useLocalSearchParams();

  return (
    <View style={tw`flex-1 bg-black justify-center items-center`}>
      <Video
        source={{ uri: videoUrl }}
        style={tw`w-full h-full`}
        controls
        resizeMode="contain"
      />
    </View>
  );
}
