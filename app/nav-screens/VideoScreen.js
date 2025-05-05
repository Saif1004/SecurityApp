import { View, Text, StyleSheet } from 'react-native';
import { Video } from 'expo-av';
import { useLocalSearchParams } from 'expo-router';

export default function VideoScreen() {
  const { videoUrl, name, timestamp } = useLocalSearchParams();

  const uri = videoUrl?.startsWith('http')
    ? videoUrl
    : `https://cerberus.ngrok.dev${videoUrl}`;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{name}</Text>
      <Text style={styles.timestamp}>{new Date(timestamp).toLocaleString()}</Text>
      <Video
        source={{ uri }}
        useNativeControls
        resizeMode="contain"
        shouldPlay
        onError={e => console.log('Video error:', e)}
        style={styles.video}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' },
  title: { color: 'white', fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  timestamp: { color: 'gray', marginBottom: 20 },
  video: { width: '100%', height: 300 },
});
