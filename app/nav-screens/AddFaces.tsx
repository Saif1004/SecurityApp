import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert, StyleSheet } from 'react-native';

const AddFaces: React.FC = () => {
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');

  const handleCapture = async () => {
    if (!name) {
      Alert.alert('Missing Info', 'Please enter a name.');
      return;
    }

    const formData = new FormData();
    formData.append('name', name);

    try {
      const res = await fetch('https://cerberus.ngrok.dev/capture_face', {
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
      <Text style={styles.heading}>Capture Face using Pi Camera</Text>
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
  container: { padding: 20 },
  heading: { fontSize: 22, fontWeight: 'bold', marginBottom: 15 },
  input: {
    borderWidth: 1,
    padding: 10,
    borderRadius: 6,
    marginBottom: 15,
  },
  message: { marginTop: 10, color: 'green', fontWeight: '600' },
});

export default AddFaces;
