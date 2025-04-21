import { Stack, useRouter, useSegments } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { AuthProvider, useAuth } from './Authprovider';
import {useEffect} from "react";

function AuthWrapper() {
    const { user, initializing } = useAuth();
    const router = useRouter();
    const segments = useSegments();

    useEffect(() => {
        if (initializing) return;

        const inAuthGroup = segments[0] === 'nav-screens';

        if (user && !inAuthGroup) {
            router.replace('/nav-screens/HomeScreen');
        } else if (!user && inAuthGroup) {
            router.replace('/sign-in');
        }
    }, [user, initializing]);

    if (initializing) {
        return (
            <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return (
        <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="nav-screens" options={{ headerShown: false }} />
            <Stack.Screen name="sign-in" options={{ title: 'Login' }} />
            <Stack.Screen name="sign-up" options={{ title: 'Create Account' }} />
        </Stack>
    );
}

export default function RootLayout() {
    return (
        <AuthProvider>
            <AuthWrapper />
        </AuthProvider>
    );
}