import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import {
    ScrollView,
    View,
    Image,
    Text,
    StyleSheet,
    TouchableOpacity,
    KeyboardAvoidingView,
    Button,
    TextInput,
    ActivityIndicator
} from 'react-native';
import tw from 'twrnc';
import AegisShield from '../assets/images/Aegis-Shield.png';
import google from '../assets/images/google.png';
import { FirebaseError } from "@firebase/util";
import { auth } from './firebase';
import { signInWithEmailAndPassword } from "@firebase/auth";

export default function SignIn() {
    const router = useRouter();
    const handleLogin = () => {};
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const signIn = async () => {
        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
            router.push('../nav-screens/HomeScreen');
        } catch (e: any) {
            const err = e as FirebaseError;
            alert('Sign in failed: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView contentContainerStyle={tw`flex-1 justify-center items-center bg-white px-4`}>
            <Image source={AegisShield} style={tw`w-60 h-60`} resizeMode="contain" />

            <Text style={tw`text-3xl font-bold text-gray-800 mt-4`}>Aegis Security Systems</Text>


            <View style={tw`flex-0.5`} />

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
                        <Button onPress={signIn} title="Login" />
                    )}
            </View>
            <TouchableOpacity
                onPress={handleLogin}
                style={tw`flex-row items-center justify-center bg-white shadow-md shadow-zinc-300 rounded-full w-full py-4 mt-5`}>
                <Image source ={google}
                       style={tw`w-5 h-5 mr-3`}
                       resizeMode="contain"
                />
                <Text style={tw`text-lg font-rubik text-black-300`}>
                    Continue with Google
                </Text>
            </TouchableOpacity>
            <View style={tw`flex-1.5`} />



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
        justifyContent: 'center'
    },
    input: {
        marginVertical: 4,
        height: 50,
        width: 300,
        borderWidth: 1,
        borderRadius: 4,
        padding: 10,
        backgroundColor: '#fff'
    }
});
