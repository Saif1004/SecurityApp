import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  Alert,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import * as ScreenOrientation from 'expo-screen-orientation';
import { StatusBar } from 'expo-status-bar';

const NGROK_URL = 'https://cerberus.ngrok.dev';

const AddFaces: React.FC = () => {
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [serverUp, setServerUp] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  const [webKey, setWebKey] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${NGROK_URL}/`)
      .then(res => res.ok && setServerUp(true))
      .catch(() => setServerUp(false));

    const sub = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
      setWebKey(prev => prev + 1);
    });

    return () => sub?.remove?.();
  }, []);

  const toggleOrientation = async () => {
    await ScreenOrientation.lockAsync(
      isLandscape
        ? ScreenOrientation.OrientationLock.PORTRAIT_UP
        : ScreenOrientation.OrientationLock.LANDSCAPE
    );
    setIsLandscape(!isLandscape);
    setWebKey(prev => prev + 1);
  };

  const handleCaptureFace = async () => {
    if (!name.trim()) return Alert.alert('Missing Info', 'Please enter a name.');

    const formData = new FormData();
    formData.append('name', name);

    try {
      setLoading(true);
      const res = await fetch(`${NGROK_URL}/capture_face`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      setMessage(data.message);
      Alert.alert('Face Capture', data.message);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Could not capture face.');
    } finally {
      setLoading(false);
    }
  };

  const handleEnrollFingerprint = async () => {
    if (!name.trim()) return Alert.alert('Missing Info', 'Please enter a name.');

    const formData = new FormData();
    formData.append('name', name);

    Alert.alert('Fingerprint', 'Place your finger on the sensor now.');

    try {
      setLoading(true);
      const res = await fetch(`${NGROK_URL}/enroll_fingerprint`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      Alert.alert('Fingerprint', data.message);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Could not enroll fingerprint.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style="dark" hidden={isLandscape} />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {serverUp ? (
          <>
            <WebView
              key={webKey}
              source={{ uri: `${NGROK_URL}/view` }}
              style={{
                width: dimensions.width,
                height: isLandscape ? dimensions.height : 250,
              }}
              javaScriptEnabled
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
            />
            <TouchableOpacity style={styles.orientationButton} onPress={toggleOrientation}>
              <Ionicons
                name={isLandscape ? 'phone-portrait-outline' : 'phone-landscape-outline'}
                size={24}
                color="black"
              />
            </TouchableOpacity>
          </>
        ) : (
          <Text style={styles.error}>Could not connect to server. Is ngrok running?</Text>
        )}

        <Text style={styles.heading}>Register Face & Fingerprint</Text>
        <TextInput
          placeholder="Enter name"
          style={styles.input}
          value={name}
          onChangeText={setName}
        />

        <Button title="Register Face" onPress={handleCaptureFace} />
        <View style={{ height: 10 }} />
        <Button title="Enroll Fingerprint" onPress={handleEnrollFingerprint} />

        {loading && <ActivityIndicator style={{ marginTop: 15 }} />}
        {message ? <Text style={styles.message}>{message}</Text> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  heading: { fontSize: 20, fontWeight: 'bold', marginTop: 16, marginBottom: 10 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
  },
  message: { marginTop: 10, color: 'green' },
  error: { color: 'red', textAlign: 'center', marginVertical: 20 },
  orientationButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#eee',
    padding: 10,
    borderRadius: 20,
  },
});

export default AddFaces;
