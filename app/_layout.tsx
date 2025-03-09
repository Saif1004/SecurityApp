import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { auth } from './firebase'; // Import updated auth
import { User, onAuthStateChanged } from "firebase/auth";
import { View, ActivityIndicator } from 'react-native';

export default function RootLayout() {
    const [initializing, setInitializing] = useState(true);
    const [user, setUser] = useState<User | null>(null);
    const router = useRouter();
    const segments = useSegments();



    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            console.log('onAuthStateChanged', user);
            setUser(user);
            setInitializing(false);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (initializing) return;

        const inAuthGroup = segments[0] === 'nav-screens';

        if (user && !inAuthGroup) {
            console.log("Redirecting to HomeScreen...");
            router.replace('/nav-screens/HomeScreen'); // Use `replace` instead of `push`
        } else if (!user && inAuthGroup) {
            console.log("Redirecting to Sign-In...");
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
