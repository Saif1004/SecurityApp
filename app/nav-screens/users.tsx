import React, { useEffect, useState } from 'react';
import { ScrollView, Text, View, Image, ActivityIndicator } from 'react-native';
import tw from 'twrnc';

const NGROK_URL = 'https://cerberus.ngrok.dev';

const UsersScreen = () => {
  const [users, setUsers] = useState<{ [name: string]: string[] }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${NGROK_URL}/users`)
      .then((res) => res.json())
      .then((data) => setUsers(data))
      .catch((err) => console.error('Failed to fetch users', err))
      .finally(() => setLoading(false));
  }, []);

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
          <Text style={tw`text-xl font-semibold mb-2`}>{name}</Text>
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
