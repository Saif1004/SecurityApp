import { View, Text, StyleSheet } from 'react-native';
import { Video } from 'expo-av';
import { useLocalSearchParams } from 'expo-router';

export default function VideoScreen() {
  const { videoUrl, name, timestamp } = useLocalSearchParams();

  const base = 'https://cerberus.ngrok.dev';
  const fullUrl = videoUrl?.startsWith('http') ? videoUrl : `${base}${videoUrl}`;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{name}</Text>
      <Text style={styles.timestamp}>
        {timestamp ? new Date(timestamp).toLocaleString() : 'Unknown Time'}
      </Text>
      {videoUrl ? (
        <Video
          source={{ uri: fullUrl }}
          useNativeControls
          resizeMode="contain"
          style={styles.video}
        />
      ) : (
        <Text style={styles.error}>No video available</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  title: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  timestamp: {
    color: 'gray',
    marginBottom: 20,
  },
  video: {
    width: '100%',
    height: 300,
  },
  error: {
    color: 'red',
    fontSize: 16,
  },
});
