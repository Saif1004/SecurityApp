import React, { useEffect, useState } from 'react';
import { View, Text, Switch, StyleSheet, Alert } from 'react-native';

const BACKEND_URL = 'http://<YOUR_FLASK_SERVER_IP>:5000';

export default function MotionSensorScreen() {
  const [motionEnabled, setMotionEnabled] = useState(true);

  useEffect(() => {
    // Fetch current motion detection status
    fetch(`${BACKEND_URL}/motion_status`)
      .then(res => res.json())
      .then(data => setMotionEnabled(data.motion_enabled))
      .catch(() => Alert.alert('Error', 'Failed to fetch motion status'));
  }, []);

  const toggleMotion = async () => {
    const newStatus = !motionEnabled;
    setMotionEnabled(newStatus);

    try {
      const res = await fetch(`${BACKEND_URL}/toggle_motion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: newStatus })
      });
      const result = await res.json();
      if (result.status !== 'success') throw new Error();
    } catch {
      Alert.alert('Error', 'Failed to update motion status');
      setMotionEnabled(!newStatus); // rollback on failure
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Motion Sensor</Text>
      <View style={styles.row}>
        <Text style={styles.label}>{motionEnabled ? 'Enabled' : 'Disabled'}</Text>
        <Switch
          value={motionEnabled}
          onValueChange={toggleMotion}
        />
      </View>
      <Text style={styles.status}>
        {motionEnabled
          ? 'Motion detection is currently active.'
          : 'Motion detection is turned off.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 24, marginBottom: 20, fontWeight: 'bold', textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 30 },
  label: { fontSize: 18 },
  status: { fontSize: 16, textAlign: 'center', color: '#666' },
});
