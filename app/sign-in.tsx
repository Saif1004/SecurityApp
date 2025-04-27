import React, { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import {
    ScrollView,
    View,
    Image,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert,
} from 'react-native';
import tw from 'twrnc';
import AegisShield from '../assets/images/Aegis-Shield.png';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from './Authprovider';
import auth from '@react-native-firebase/auth';

export default function SignIn() {
    const router = useRouter();
    const { user } = useAuth(); 
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [redirecting, setRedirecting] = useState(false); // 🆕 Add redirecting state

    useEffect(() => {
        if (user) {
            setRedirecting(true); // 🆕 Show loading
            router.replace('/nav-screens/HomeScreen');
        }
    }, [user]);

    if (redirecting) {
        return (
            <View style={tw`flex-1 justify-center items-center bg-white`}>
                <ActivityIndicator size="large" color="#6EA0F7" />
                <Text style={tw`text-lg text-gray-600 mt-4`}>Redirecting...</Text>
            </View>
        );
    }

    const handleEmailSignIn = async () => {
        setLoading(true);
        try {
            await auth().signInWithEmailAndPassword(email, password);
        } catch (error: any) {
            Alert.alert('Sign in failed', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView contentContainerStyle={tw`flex-1 justify-center items-center bg-white px-4`}>
            <Image source={AegisShield} style={tw`w-48 h-48 mb-4`} resizeMode="contain" />

            <Text style={tw`text-3xl font-bold text-gray-800 mb-6`}>Aegis Security Systems</Text>

            <View style={tw`w-full max-w-sm`}>
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
                    <ActivityIndicator size="large" color="#0000ff" />
                ) : (
                    <TouchableOpacity onPress={handleEmailSignIn} style={tw`rounded-lg shadow-md overflow-hidden`}> 
                        <LinearGradient
                            colors={["#6EA0F7", "#6290DF"]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={tw`py-3`}
                        >
                            <Text style={tw`text-white text-center font-semibold text-lg`}>Login</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                )}
            </View>

            <TouchableOpacity onPress={() => router.push('/sign-up')} style={tw`mt-6`}>                
                <Text style={tw`text-[#6EA0F7] text-lg font-semibold`}>Don't have an account? Sign up</Text>
            </TouchableOpacity>
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
});
