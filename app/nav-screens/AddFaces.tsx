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
      .then(res => {
        if (res.ok) setServerUp(true);
      })
      .catch(() => setServerUp(false));

    const sub = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
      setWebKey(prev => prev + 1);
    });

    return () => {
      if (sub) sub.remove();
    };
  }, []);

  const toggleOrientation = async () => {
    if (isLandscape) {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      setIsLandscape(false);
    } else {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      setIsLandscape(true);
    }
    setWebKey(prev => prev + 1);
  };

  const handleCapture = async () => {
    if (!name) {
      Alert.alert('Missing Info', 'Please enter a name.');
      return;
    }

    const formData = new FormData();
    formData.append('name', name);

    try {
      const res = await fetch(`${NGROK_URL}/capture_face`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      setMessage(data.message);
    } catch (err) {
      console.error(err);
      setMessage('Error triggering camera.');
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
          <TouchableOpacity
            style={styles.orientationButton}
            onPress={toggleOrientation}
          >
            <Ionicons
              name={isLandscape ? 'phone-portrait-outline' : 'phone-landscape-outline'}
              size={24}
              color="black"
            />
          </TouchableOpacity>
        </>
      ) : (
        <Text style={styles.error}>Could not connect to Pi server. Is ngrok running?</Text>
      )}

      <Text style={styles.heading}>Register Face using Pi Camera</Text>
      <TextInput
        placeholder="Enter name"
        style={styles.input}
        value={name}
        onChangeText={setName}
      />
      <Button title="Capture via Pi Camera" onPress={handleCapture} />
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  heading: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 16,
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#999',
    padding: 10,
    borderRadius: 6,
    backgroundColor: '#f9f9f9',
    marginBottom: 15,
  },
  message: {
    marginTop: 10,
    color: 'green',
    fontWeight: '600',
  },
  error: {
    color: 'red',
    textAlign: 'center',
    marginVertical: 20,
  },
  orientationButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#e0e0e0',
    padding: 10,
    borderRadius: 20,
    zIndex: 10,
  },
});

export default AddFaces;
