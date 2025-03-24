import React, {useState} from 'react';
import { useRouter } from 'expo-router';
import {ScrollView, View, Image, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Button, ActivityIndicator,
    TextInput} from 'react-native';
import tw from 'twrnc';
import AegisShield from '../assets/images/Aegis-Shield.png';
import google from '../assets/images/google.png';
import {FirebaseError} from "@firebase/util";
import { auth } from './firebase';
import {signInWithEmailAndPassword} from "@firebase/auth";


export default function SignIn  ()  {
    const handleLogin = () => {};
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);


    const signIn = async () => {
        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (e: any) {
            const err = e as FirebaseError;
            alert('Sign in failed: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView contentContainerStyle={tw`flex-1 justify-center items-center bg-white px-4`}>
            <Image
                source={AegisShield}
                style={tw`w-60 h-60`}
                resizeMode="contain"
            />

            <View style={tw`w-full p-4`}>
                <Text
                    onPress={() => router.push('/home')}
                    style={tw`bg-blue-600 text-white text-center py-3 rounded-lg`}
                >
                    home temp button
                </Text>
            </View>

            <Text style={tw`text-3xl font-bold text-gray-800 mt-4`}>
                Aegis Security Systems
            </Text>




            <View style={styles.container}>
                <KeyboardAvoidingView behavior="padding">
                    <TextInput
                        style={styles.input}
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        placeholder="Email"
                    />
                    <TextInput
                        style={styles.input}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        placeholder="Password"
                    />
                    {loading ? (
                        <ActivityIndicator size={'small'} style={{ margin: 28 }} />
                    ) : (
                        <>
                            <Button onPress={signIn} title="Login" />
                        </>
                    )}
                </KeyboardAvoidingView>
            </View>

            <View style={tw`flex-1`} />

            <View style={tw`w-full p-4`}>
                <Text
                    onPress={() => router.push('/sign-up')}
                    style={tw`bg-blue-600 text-white text-center py-3 rounded-lg`}
                >
                    Go to Sign Up
                </Text>

            </View>
        </ScrollView>
    );
};
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
        padding: 5,
        backgroundColor: '#fff'
    }
});

