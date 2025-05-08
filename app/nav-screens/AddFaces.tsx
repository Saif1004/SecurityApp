import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, Alert, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
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

  useEffect(() => {
    fetch(`${NGROK_URL}/`)
      .then(res => res.ok && setServerUp(true))
      .catch(() => setServerUp(false));

    const sub = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
      setWebKey(prev => prev + 1);
    });

    return () => sub?.remove();
  }, []);

  const toggleOrientation = async () => {
    if (isLandscape) {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    } else {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    }
    setIsLandscape(!isLandscape);
    setWebKey(prev => prev + 1);
  };

  const handleCapture = async () => {
    if (!name) return Alert.alert('Missing Info', 'Please enter a name.');

    const formData = new FormData();
    formData.append('name', name);

    try {
      const res = await fetch(`${NGROK_URL}/capture_face`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      setMessage(data.message);

      const fingerRes = await fetch(`${NGROK_URL}/enroll_fingerprint`, {
        method: 'POST',
        body: formData,
      });
      const fingerData = await fingerRes.json();
      Alert.alert('Fingerprint', fingerData.message);
    } catch (err) {
      console.error(err);
      setMessage('Error registering user.');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" backgroundColor="#fff" hidden={isLandscape} />
      {serverUp ? (
        <>
          <WebView
            key={webKey}
            source={{ uri: `${NGROK_URL}/view` }}
            originWhitelist={['*']}
            javaScriptEnabled
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            style={{ width: dimensions.width, height: isLandscape ? dimensions.height : 250 }}
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
      <Button title="Register User" onPress={handleCapture} />
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  heading: { fontSize: 20, fontWeight: 'bold', marginTop: 16, marginBottom: 10 },
  input: {
    borderWidth: 1, borderColor: '#ccc', padding: 10, borderRadius: 6, marginBottom: 10,
  },
  message: { marginTop: 10, color: 'green' },
  error: { color: 'red', textAlign: 'center', marginVertical: 20 },
  orientationButton: {
    position: 'absolute', top: 10, right: 10, backgroundColor: '#eee', padding: 10, borderRadius: 20,
  },
});

export default AddFaces;
