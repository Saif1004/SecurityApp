import React, { useState } from 'react';
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
import { useAuth } from './AuthProvider'; // ✅ Use AuthProvider
import auth from '@react-native-firebase/auth'; // ✅ Use correct Firebase library
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

GoogleSignin.configure({
    webClientId: '455327001497-pp9dlddj2ihhst0l5lac57172uccktov.apps.googleusercontent.com',
});

export default function SignIn() {
    const router = useRouter();
    const { user } = useAuth(); // ✅ Get user state from global Auth Context
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleGoogleSignIn = async () => {
        try {
            await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
            const { idToken } = await GoogleSignin.signIn();
            const googleCredential = auth.GoogleAuthProvider.credential(idToken);
            await auth().signInWithCredential(googleCredential); // ✅ Correct function
        } catch (error) {
            if (error.code === statusCodes.SIGN_IN_CANCELLED) {
                Alert.alert('Google Sign-In cancelled');
            } else {
                Alert.alert('Sign-in failed', error.message);
            }
        }
    };

    const handleEmailSignIn = async () => {
        setLoading(true);
        try {
            await auth().signInWithEmailAndPassword(email, password); // ✅ Correct function
        } catch (error) {
            Alert.alert('Sign in failed', error.message);
        } finally {
            setLoading(false);
        }
    };

    // ✅ If user is already signed in, navigate automatically
    if (user) {
        router.replace('/nav-screens/HomeScreen');
        return null; // Prevents rendering SignIn screen
    }

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

            <TouchableOpacity onPress={handleGoogleSignIn} style={tw`flex-row items-center justify-center bg-white shadow-md rounded-full w-full py-4 mt-5`}>
                <Image source={google} style={tw`w-5 h-5 mr-3`} resizeMode="contain" />
                <Text style={tw`text-lg text-black-300`}>Continue with Google</Text>
            </TouchableOpacity>

            <View style={tw`w-full p-4 mt-5`}>
                <Text onPress={() => router.push('/sign-up')} style={tw`bg-blue-600 text-white text-center py-3 rounded-lg`}>
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
