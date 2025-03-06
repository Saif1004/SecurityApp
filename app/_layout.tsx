import { Stack } from "expo-router";
import {GestureHandlerRootView} from "react-native-gesture-handler";
import GlobalProvider from "@/lib/global-provider";

export default function RootLayout() {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <GlobalProvider>
                <Stack />
            </GlobalProvider>
        </GestureHandlerRootView>
    );
}
