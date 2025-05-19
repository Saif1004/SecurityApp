import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, Image, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, StyleSheet
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const API_URL = 'https://cerberus.ngrok.dev';

export default function AlertScreen() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/detect`);
      const data = await res.json();
      if (data.status === 'success') setAlerts(data.detected_faces);
    } catch (err) {
      console.error('Fetch alerts failed', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 10000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  const renderAlert = ({ item }) => (
    <TouchableOpacity
      style={styles.alertContainer}
      onPress={() => router.push({
        pathname: '/nav-screens/VideoScreen',
        params: {
          videoUrl: item.video || '',
          name: item.name,
          timestamp: item.timestamp
        }
      })}
    >
      {item.image ? (
        <Image source={{ uri: `${API_URL}${item.image}` }} style={styles.alertImage} />
      ) : (
        <Ionicons name="person-circle" size={48} color="#555" />
      )}
      <View style={styles.alertTextContainer}>
        <Text style={styles.alertName}>{item.name}</Text>
        <Text style={styles.alertText}>Motion detected</Text>
        <Text style={styles.alertTimestamp}>{new Date(item.timestamp).toLocaleString()}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Alert List</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#fff" />
      ) : (
        <FlatList
          data={alerts}
          keyExtractor={item => item.timestamp}
          renderItem={renderAlert}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchAlerts} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a1a', paddingTop: 20 },
  header: { color: 'white', fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  alertContainer: { flexDirection: 'row', backgroundColor: '#2d2d2d', borderRadius: 10, padding: 15, marginBottom: 15, marginHorizontal: 15, alignItems: 'center' },
  alertImage: { width: 80, height: 80, borderRadius: 10 },
  alertTextContainer: { flex: 1, marginLeft: 15 },
  alertName: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  alertText: { color: '#aaaaaa', fontSize: 14, marginBottom: 5 },
  alertTimestamp: { color: '#777777', fontSize: 12 },
});
