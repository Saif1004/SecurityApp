import React, { useEffect, useState } from 'react';
import { ScrollView, Text, View, Image, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import tw from 'twrnc';

const NGROK_URL = 'https://cerberus.ngrok.dev';

const UsersScreen = () => {
  const [users, setUsers] = useState<{ [name: string]: string[] }>({});
  const [loading, setLoading] = useState(true);

  const fetchUsers = () => {
    setLoading(true);
    fetch(`${NGROK_URL}/users`)
      .then((res) => res.json())
      .then((data) => setUsers(data))
      .catch((err) => console.error('Failed to fetch users', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDelete = (name: string) => {
    Alert.alert(
      'Delete User',
      `Are you sure you want to delete "${name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            fetch(`${NGROK_URL}/delete_user/${name}`, { method: 'DELETE' })
              .then((res) => res.json())
              .then((data) => {
                if (data.status === 'success') {
                  fetchUsers();
                } else {
                  Alert.alert('Error', data.message);
                }
              })
              .catch((err) => {
                console.error('Delete failed:', err);
                Alert.alert('Error', 'Could not delete user.');
              });
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={tw`flex-1 justify-center items-center`}>
        <ActivityIndicator size="large" color="blue" />
      </View>
    );
  }

  return (
    <ScrollView style={tw`p-4 bg-white`}>
      <Text style={tw`text-2xl font-bold mb-4`}>Registered Users</Text>
      {Object.entries(users).map(([name, images]) => (
        <View key={name} style={tw`mb-6`}>
          <View style={tw`flex-row justify-between items-center mb-2`}>
            <Text style={tw`text-xl font-semibold`}>{name}</Text>
            <TouchableOpacity
              onPress={() => handleDelete(name)}
              style={tw`bg-red-500 px-3 py-1 rounded`}
            >
              <Text style={tw`text-white text-sm`}>Delete</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal>
            {images.map((url, i) => (
              <Image
                key={i}
                source={{ uri: `${NGROK_URL}${url}` }}
                style={tw`w-36 h-36 mr-2 rounded-lg border`}
              />
            ))}
          </ScrollView>
        </View>
      ))}
    </ScrollView>
  );
};

export default UsersScreen;
