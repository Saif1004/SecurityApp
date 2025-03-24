// app/_layout.tsx
import { Stack } from 'expo-router';

const Layout = () => {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{ headerShown: false }} 
      />
      <Stack.Screen
        name="home"
        options={{ headerShown: false }} 
      />
      <Stack.Screen
        name="sign-in" 
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="nav-screens/HomeScreen" 
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="nav-screens/AlertScreen" 
        options={{ headerShown: false }} 
      />
      <Stack.Screen
        name="nav-screens/LiveViewScreen"
        options={{ headerShown: false }} 
      />
    </Stack>
  );
};

export default Layout;