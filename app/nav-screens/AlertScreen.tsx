import { ScrollView, View, Text, Image, TouchableOpacity } from 'react-native';
import React, { useState, useEffect } from 'react';
import tw from 'twrnc';
import { router } from 'expo-router';

const API_URL = 'https://your-server.com/detect';

export default function AlertScreen() {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const response = await fetch(API_URL);
        const data = await response.json();
        if (data.status === 'success') {
          setAlerts((prev) => [...data.detected_faces, ...prev]); 
        }
      } catch (error) {
        console.error('Error fetching alerts:', error);
      }
    };
    const interval = setInterval(fetchAlerts, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={tw`flex-1 bg-gray-900`}>
      <Text style={tw`text-white text-center text-xl font-bold mt-4`}>Alert List</Text>

      <ScrollView style={tw`p-4`}>
        {alerts.map((alert, index) => (
          <TouchableOpacity 
            key={index} 
            style={tw`flex-row bg-gray-800 p-3 rounded-lg mb-3`}
            onPress={() => router.push({ pathname: '/VideoScreen', params: { videoUrl: alert.video } })}
          >
            <Image
              source={{ uri: alert.image }}
              style={tw`w-20 h-20 rounded-lg`}
            />
            <View style={tw`ml-3 flex-1`}>
              <Text style={tw`text-white font-bold text-lg`}>{alert.name || "Unknown"}</Text>
              <Text style={tw`text-gray-400`}>Motion detected</Text>
              <Text style={tw`text-gray-500`}>{alert.timestamp}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
