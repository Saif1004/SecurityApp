import React, {useState} from 'react';
import { useRouter } from 'expo-router';
import {ScrollView, View, Image, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Button, ActivityIndicator,
    TextInput} from 'react-native';
import tw from 'twrnc';
import AegisShield from '../assets/images/Aegis-Shield.png';
import {FirebaseError} from "@firebase/util";
import { auth } from './firebase';
import {createUserWithEmailAndPassword} from "@firebase/auth";
import { LinearGradient } from 'expo-linear-gradient';

export default function SignIn  ()  {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);



    const signUp = async () => {
        setLoading(true);
        try {
            await createUserWithEmailAndPassword(auth, email, password);
            alert('Check your emails!');
        } catch (e: any) {
            const err = e as FirebaseError;
            alert('Registration failed: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView contentContainerStyle={tw`flex-1 justify-center items-center bg-white px-6`}>
            <Image
                source={AegisShield}
                style={tw`w-48 h-48`}
                resizeMode="contain"
            />

            <Text style={tw`text-2xl font-bold text-gray-800 mt-6`}>
                Aegis Security Systems
            </Text>

            <View style={tw`h-8`} />

            <View style={styles.container}>
                    <TextInput
                        style={styles.input}
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        placeholder="Email"
                        placeholderTextColor="#9CA3AF"
                    />
                    <TextInput
                        style={styles.input}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        placeholder="Password"
                        placeholderTextColor="#9CA3AF"
                    />
                    {loading ? (
                        <ActivityIndicator size={'small'} style={tw`my-6`} />
                    ) : (
                        
                        <TouchableOpacity onPress={signUp} style={tw`rounded-lg shadow-md overflow-hidden w-full mt-4`}>
    <LinearGradient
      colors={["#6EA0F7", "#6290DF"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={tw`py-4`}
    >
      <Text style={tw`text-white text-center font-semibold text-lg`}>Create Account</Text>
    </LinearGradient>
  </TouchableOpacity>
                        
                    )}

            </View>

            <TouchableOpacity
  onPress={() => router.push('/sign-in')}
  style={tw`mt-6`}
  >
  <Text style={tw`text-[#6EA0F7] text-lg font-semibold`}>Already have an account? Sign in</Text>
  </TouchableOpacity>
</ScrollView>
);
};
const styles = StyleSheet.create({
    container: {
        width: '100%',
        alignItems: 'center',
    },
    input: {
        marginVertical: 8,
        height: 50,
        width: '100%',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        paddingHorizontal: 16,
        fontSize: 16,
        backgroundColor: '#F9FAFB',
    },
    button: {
        backgroundColor: '#2563EB',
        width: '100%',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 16,
    },
});

