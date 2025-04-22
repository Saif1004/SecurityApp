import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import tw from 'twrnc';
import { router } from 'expo-router';

const API_URL = 'https://c73c-77-100-167-19.ngrok-free.app/detect';

export default function AlertScreen() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = useCallback(async () => {
    try {
      const response = await fetch(API_URL);
      const data = await response.json();

      if (data.status === 'success') {
        const newAlerts = data.detected_faces.filter(
          alert =>
            !alerts.some(
              existing =>
                existing.timestamp === alert.timestamp &&
                existing.name === alert.name
            )
        );
        setAlerts(prev => [...newAlerts, ...prev]);
      }
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  }, [alerts]);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 5000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  const renderAlert = ({ item }) => (
    <TouchableOpacity
      style={tw`flex-row bg-gray-800 p-3 rounded-lg mb-3`}
      onPress={() =>
        router.push({
          pathname: '/VideoScreen',
          params: { videoUrl: item.video },
        })
      }
    >
      <Image
        source={{
          uri: item.image || 'https://via.placeholder.com/100x100',
        }}
        style={tw`w-20 h-20 rounded-lg`}
        resizeMode="cover"
      />
      <View style={tw`ml-3 flex-1`}>
        <Text style={tw`text-white font-bold text-lg`}>
          {item.name || 'Unknown'}
        </Text>
        <Text style={tw`text-gray-400`}>Motion detected</Text>
        <Text style={tw`text-gray-500`}>{item.timestamp}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={tw`flex-1 bg-gray-900`}>
      <Text style={tw`text-white text-center text-xl font-bold mt-4`}>
        Alert List
      </Text>

      {loading ? (
        <ActivityIndicator size="large" color="white" style={tw`mt-10`} />
      ) : alerts.length === 0 ? (
        <Text style={tw`text-gray-400 text-center mt-10`}>
          No alerts yet.
        </Text>
      ) : (
        <FlatList
          data={alerts}
          keyExtractor={(item, index) => `${item.timestamp}-${item.name}-${index}`}
          renderItem={renderAlert}
          contentContainerStyle={tw`p-4`}
        />
      )}
    </View>
  );
}