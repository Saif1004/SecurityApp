import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Video } from 'expo-av';
import { useLocalSearchParams } from 'expo-router';

export default function VideoScreen() {
  const { videoUrl, name, timestamp } = useLocalSearchParams();

  const fullUrl = videoUrl.startsWith('http')
    ? videoUrl
    : `https://28bd-77-100-167-19.ngrok-free.app${videoUrl}`;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>
        {name} - {new Date(timestamp).toLocaleString()}
      </Text>
      <Video
        source={{ uri: fullUrl }}
        rate={1.0}
        volume={1.0}
        isMuted={false}
        resizeMode="contain"
        useNativeControls
        shouldPlay
        style={styles.video}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop: 50
  },
  header: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10
  },
  video: {
    flex: 1,
    width: '100%'
  }
});
