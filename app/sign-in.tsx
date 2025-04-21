import React, { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import {
    ScrollView,
    View,
    Image,
    Text,
    StyleSheet,
    TouchableOpacity,
    Button,
    TextInput,
    ActivityIndicator,
    Alert,
} from 'react-native';
import tw from 'twrnc';
import AegisShield from '../assets/images/Aegis-Shield.png';
import google from '../assets/images/google.png';
import { useAuth } from './Authprovider';
import auth from '@react-native-firebase/auth';



export default function SignIn() {
    const router = useRouter();
    const { user } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    // Handle navigation when user is authenticated
    useEffect(() => {
        if (user) {
            router.replace('/nav-screens/HomeScreen');
        }
    }, [user]);


    const handleEmailSignIn = async () => {
        setLoading(true);
        try {
            await auth().signInWithEmailAndPassword(email, password);
        } catch (error) {
            Alert.alert('Sign in failed', error.message);
        } finally {
            setLoading(false);
        }
    };

    // Don't return null anymore - let useEffect handle the navigation
    return (
        <ScrollView contentContainerStyle={tw`flex-1 justify-center items-center bg-white px-4`}>
            <Image source={AegisShield} style={tw`w-60 h-60`} resizeMode="contain" />

            <Text style={tw`text-3xl font-bold text-gray-800 mt-4`}>Aegis Security Systems</Text>

            <View style={styles.container}>
                <TextInput
                    placeholder="Email"
                    value={email}
                    onChangeText={setEmail}
                    style={styles.input}
                    keyboardType="email-address"
                    autoCapitalize="none"
                />
                <TextInput
                    placeholder="Password"
                    value={password}
                    onChangeText={setPassword}
                    style={styles.input}
                    secureTextEntry
                />
                {loading ? (
                    <ActivityIndicator size="large" color="#0000ff" />
                ) : (
                    <Button onPress={handleEmailSignIn} title="Login" />
                )}
            </View>


            <View style={tw`w-full p-4 mt-5`}>
                <Text
                    onPress={() => router.push('/sign-up')}
                    style={tw`bg-blue-600 text-white text-center py-3 rounded-lg`}
                >
                    Go to Sign Up
                </Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 20,
        flex: 1,
        justifyContent: 'center',
    },
    input: {
        marginVertical: 4,
        height: 50,
        width: 300,
        borderWidth: 1,
        borderRadius: 4,
        padding: 10,
        backgroundColor: '#fff',
    },
});