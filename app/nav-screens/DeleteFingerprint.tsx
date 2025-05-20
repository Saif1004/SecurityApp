import React, { useEffect, useState } from 'react';
import { View, Text, Alert, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/app/nav-screens/ThemeProvider';
import tw from 'twrnc';

export default function DeleteFingerprint() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [fingerprints, setFingerprints] = useState<{ id: string, name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('https://cerberus.ngrok.dev/fingerprints')
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') setFingerprints(data.fingerprints);
        else Alert.alert('Error', data.message);
        setLoading(false);
      })
      .catch(err => {
        Alert.alert('Error', 'Failed to fetch fingerprints');
        setLoading(false);
      });
  }, []);

  const deleteFingerprint = (id: string) => {
    Alert.alert(
      'Confirm Deletion',
      `Delete fingerprint ID ${id}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            fetch(`https://cerberus.ngrok.dev/delete_fingerprint/${id}`, { method: 'DELETE' })
              .then(res => res.json())
              .then(data => {
                if (data.status === 'success') {
                  setFingerprints(prev => prev.filter(fp => fp.id !== id));
                }
                Alert.alert(data.status === 'success' ? 'Deleted' : 'Error', data.message);
              })
              .catch(() => Alert.alert('Error', 'Failed to delete'));
          }
        }
      ]
    );
  };

  return (
    <View style={tw`flex-1 p-4 ${isDark ? 'bg-black' : 'bg-white'}`}>
      <Text style={tw`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-black'}`}>
        Delete Fingerprints
      </Text>
      {loading ? (
        <ActivityIndicator size="large" />
      ) : (
        <FlatList
          data={fingerprints}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={tw`flex-row justify-between items-center px-4 py-3 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              <Text style={tw`${isDark ? 'text-white' : 'text-black'}`}>{item.name} (ID: {item.id})</Text>
              <TouchableOpacity onPress={() => deleteFingerprint(item.id)}>
                <Ionicons name="trash" size={22} color="#DC2626" />
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}
