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

const API_URL = 'https://cerberus.ngrok.dev/detect';

export default function AlertScreen() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const lastTimestampRef = useRef(null);
  const pushTokenRef = useRef(null);

  // Register push notifications
  useEffect(() => {
    registerForPushNotificationsAsync().then(token => {
      pushTokenRef.current = token;
    });

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
      const response = await fetch(API_URL, {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Expected JSON but got: ${text.substring(0, 50)}`);
      }

      const data = await response.json();

      if (data.status === 'success') {
        const newAlerts = data.detected_faces.filter(
          alert => !alerts.some(existing => existing.timestamp === alert.timestamp)
        );

        if (newAlerts.length > 0) {
          setAlerts(prev => [...newAlerts, ...prev].slice(0, 50));

          // Notify only the newest one
          const newest = newAlerts[0];
          if (newest.timestamp !== lastTimestampRef.current) {
            lastTimestampRef.current = newest.timestamp;
            await sendPushNotification(pushTokenRef.current, newest);
          }
        }
      } else {
        throw new Error(data.message || 'Unknown server error');
      }
    } catch (err) {
      setError(err.message);
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [alerts]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAlerts();
  }, [fetchAlerts]);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 10000); // every 10 sec
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
          source={{ uri: item.image.startsWith('http') ? item.image : API_URL.replace('/detect', item.image) }}
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

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error: {error}</Text>
          <TouchableOpacity onPress={fetchAlerts}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color="#ffffff" style={styles.loader} />
      ) : alerts.length === 0 ? (
        <Text style={styles.emptyText}>No alerts detected yet</Text>
      ) : (
        <FlatList
          data={alerts}
          keyExtractor={item => item.timestamp}
          renderItem={renderAlert}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ffffff" />
          }
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
    return token;
  } else {
    alert('Push notifications only work on a physical device.');
  }
}

async function sendPushNotification(expoPushToken, alert) {
  if (!expoPushToken) return;

  const message = {
    to: expoPushToken,
    sound: 'default',
    title: 'Motion Detected',
    body: `${alert.name} triggered an alert`,
    data: {
      videoUrl: alert.video,
      name: alert.name,
      timestamp: alert.timestamp,
    },
  };

  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    paddingTop: 20,
  },
  header: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  alertContainer: {
    flexDirection: 'row',
    backgroundColor: '#2d2d2d',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    marginHorizontal: 15,
    alignItems: 'center',
  },
  alertImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#333333',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#555555',
  },
  alertTextContainer: {
    flex: 1,
    marginLeft: 15,
  },
  alertName: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  alertText: {
    color: '#aaaaaa',
    fontSize: 14,
    marginBottom: 5,
  },
  alertTimestamp: {
    color: '#777777',
    fontSize: 12,
  },
  loader: {
    marginTop: 50,
  },
  emptyText: {
    color: '#aaaaaa',
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
  },
  errorContainer: {
    backgroundColor: '#ff4444',
    padding: 15,
    marginHorizontal: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  errorText: {
    color: 'white',
    marginBottom: 10,
  },
  retryText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: 20,
  },
});
