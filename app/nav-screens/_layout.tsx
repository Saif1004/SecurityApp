import { Stack } from 'expo-router';
import { AuthProvider } from '../Authprovider';
import { ThemeProvider } from './ThemeProvider';

export default function NavLayout() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Stack>
          <Stack.Screen name="HomeScreen" options={{ headerShown: false }} />
          <Stack.Screen name="AlertScreen" options={{ title: 'Alerts', presentation: 'modal' }} />
          <Stack.Screen name="LiveViewScreen" options={{ title: 'Live View' }} />
          <Stack.Screen name="Lock" options={{ title: 'Solenoid Lock' }} />
          <Stack.Screen name="Sensor" options={{ title: 'Motion Sensor' }} />
          <Stack.Screen name="AddFaces" options={{ title: 'Add Faces' }} />
          <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        </Stack>
      </ThemeProvider>
    </AuthProvider>
  );
}
