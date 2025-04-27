import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

const API_URL = 'https://cerberus.ngrok.dev';

export default function AlertScreen() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const lastTimestampRef = useRef(null);

  useEffect(() => {
    registerForPushNotificationsAsync();
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const { videoUrl, name, timestamp } = response.notification.request.content.data;
      router.push({
        pathname: '/VideoScreen',
        params: { videoUrl, name, timestamp }
      });
    });
    return () => subscription.remove();
  }, []);

  const fetchAlerts = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch(`${API_URL}/detect`);
      const data = await response.json();
      if (data.status === 'success') {
        setAlerts(data.detected_faces);
      } else {
        throw new Error('Server error');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAlerts();
  }, [fetchAlerts]);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 10000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  const renderAlert = ({ item }) => (
    <TouchableOpacity
      style={styles.alertContainer}
      onPress={() =>
        router.push({
          pathname: '/VideoScreen',
          params: {
            videoUrl: item.video,
            name: item.name,
            timestamp: item.timestamp
          }
        })
      }
    >
      {item.image ? (
        <Image
          source={{ uri: `${API_URL}${item.image}` }}
          style={styles.alertImage}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.iconContainer}>
          <Ionicons name="person-circle" size={48} color="#555555" />
        </View>
      )}
      <View style={styles.alertTextContainer}>
        <Text style={styles.alertName}>{item.name}</Text>
        <Text style={styles.alertText}>Motion detected</Text>
        <Text style={styles.alertTimestamp}>
          {new Date(item.timestamp).toLocaleString()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Alert List</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#ffffff" style={styles.loader} />
      ) : (
        <FlatList
          data={alerts}
          keyExtractor={item => item.timestamp}
          renderItem={renderAlert}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ffffff" />}
        />
      )}
    </View>
  );
}

async function registerForPushNotificationsAsync() {
  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      alert('Failed to get push token!');
      return;
    }
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log(token);
    await fetch('https://cerberus.ngrok.dev/register_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });
  } else {
    alert('Must use physical device for Push Notifications');
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a1a', paddingTop: 20 },
  header: { color: 'white', fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  loader: { marginTop: 50 },
  listContent: { paddingBottom: 20 },
  alertContainer: { flexDirection: 'row', backgroundColor: '#2d2d2d', borderRadius: 10, padding: 15, marginBottom: 15, marginHorizontal: 15, alignItems: 'center' },
  alertImage: { width: 80, height: 80, borderRadius: 10 },
  iconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#333333', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#555555' },
  alertTextContainer: { flex: 1, marginLeft: 15 },
  alertName: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  alertText: { color: '#aaaaaa', fontSize: 14, marginBottom: 5 },
  alertTimestamp: { color: '#777777', fontSize: 12 },
});
