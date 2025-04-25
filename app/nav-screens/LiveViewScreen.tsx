import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import { StatusBar } from 'expo-status-bar';
import tw from 'twrnc';
import * as ScreenOrientation from 'expo-screen-orientation';
import { Ionicons } from '@expo/vector-icons';

const NGROK_URL = 'https://cerberus.ngrok.dev'; // your ngrok URL

const LiveViewScreen = () => {
  const [loading, setLoading] = useState(true);
  const [serverUp, setServerUp] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  const [webKey, setWebKey] = useState(0); // <--- Add a key for WebView to force reload

  useEffect(() => {
    fetch(`${NGROK_URL}/`)
      .then(res => {
        if (res.ok) setServerUp(true);
      })
      .catch(() => setServerUp(false))
      .finally(() => setLoading(false));

    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
      setWebKey(prev => prev + 1); // <--- update key to re-render WebView
    });

    return () => {
      if (subscription) subscription.remove();
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
    setWebKey(prev => prev + 1); // <--- Also bump the key when manually switching
  };

  if (loading) {
    return (
      <View style={tw`flex-1 justify-center items-center bg-black`}>
        <ActivityIndicator size="large" color="#00ff00" />
      </View>
    );
  }

  if (!serverUp) {
    return (
      <View style={tw`flex-1 justify-center items-center bg-black`}>
        <Text style={tw`text-red-500 text-center text-lg`}>
          Could not connect to Pi server. Is ngrok running?
        </Text>
      </View>
    );
  }

  return (
    <View style={tw`flex-1 bg-black`}>
      <StatusBar style="light" backgroundColor="#000" hidden={isLandscape} /> 
      <WebView
        key={webKey} // <-- Key forces re-render
        source={{ uri: `${NGROK_URL}/view` }}
        originWhitelist={['*']}
        javaScriptEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        style={{ width: dimensions.width, height: dimensions.height }}
      />
      <TouchableOpacity
        style={tw`absolute top-3 right-3 bg-white/20 p-2 rounded-full`}
        onPress={toggleOrientation}
      >
        <Ionicons name={isLandscape ? "phone-portrait-outline" : "phone-landscape-outline"} size={24} color="white" />
      </TouchableOpacity>
    </View>
  );
};

export default LiveViewScreen;
