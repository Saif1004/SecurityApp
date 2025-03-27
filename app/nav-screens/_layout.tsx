// app/_layout.tsx
import { Stack } from 'expo-router';

const Layout = () => {

  return (
    <Stack>
      <Stack.Screen
        name="Sensor"
        options={{ headerShown: true }}
      />
      <Stack.Screen
        name="Lock"
        options={{ headerShown: true }}
      />
      <Stack.Screen
        name="HomeScreen"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AlertScreen"
        options={{ headerShown: true }}
      />
      <Stack.Screen
        name="LiveViewScreen"
        options={{ headerShown: true }}
      />
    </Stack>
  );
};

export default Layout;