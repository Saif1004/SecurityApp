import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import tw from 'twrnc';
import { StatusBar } from 'expo-status-bar';

const NGROK_URL = 'https://c73c-77-100-167-19.ngrok-free.app'; // Replace with your HTTPS URL

const LiveViewScreen = () => {
  const [loading, setLoading] = useState(true);
  const [serverUp, setServerUp] = useState(false);

  useEffect(() => {
    fetch(`${NGROK_URL}/`)
      .then(res => {
        if (res.ok) setServerUp(true);
      })
      .catch(() => setServerUp(false))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={tw`flex-1 justify-center items-center`}>
        <ActivityIndicator size="large" color="#00ff00" />
      </View>
    );
  }

  if (!serverUp) {
    return (
      <View style={tw`flex-1 justify-center items-center`}>
        <Text style={tw`text-red-500 text-center text-lg`}>
          Could not connect to Pi server. Is ngrok running?
        </Text>
      </View>
    );
  }

  return (
    <View style={tw`flex-1`}>
      <StatusBar style="auto" />
      <WebView
        source={{ uri: `${NGROK_URL}/video_feed` }}
        originWhitelist={['*']}
        javaScriptEnabled
        allowsInlineMediaPlayback
        style={tw`flex-1`}
      />
    </View>
  );
};

export default LiveViewScreen;