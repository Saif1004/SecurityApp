import {Account, Avatars, Client, OAuthProvider} from 'react-native-appwrite';
import * as Linking from 'expo-linking';
import {openAuthSessionAsync} from "expo-web-browser";

export const config = {
    platform:'.com.jsm.AegisSystems',
    endpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT,
    projectID: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID,
}

export const client = new Client();

client
    .setEndpoint(config.endpoint!)
    .setProject(config.projectID!)
    .setPlatform(config.platform!)

export const avatar = new Avatars(client);
export const account = new Account(client);

export async function login() {
    try {
        const redirectUri = Linking.createURL('/');
        console.log("Generated Redirect URI:", redirectUri);

        // Step 1: Start OAuth Login
        const response = account.createOAuth2Token(
            OAuthProvider.Google,
            redirectUri
        );
        console.log("OAuth Response:", response);

        if (!response) {
            console.error("Error: OAuth response is null");
            throw new Error("Failed to login");
        }

        // Step 2: Open authentication session
        const browserResult = await openAuthSessionAsync(response.toString(), redirectUri);
        console.log("Browser Result:", JSON.stringify(browserResult, null, 2));

        if (browserResult.type !== 'success') {
            console.error("Error: OAuth login failed in browser");
            console.log("Generated Redirect URI:", redirectUri);
            throw new Error("Failed to login");
        }

        // Step 3: Parse returned URL
        const url = new URL(browserResult.url);
        console.log("Parsed URL:", url.toString());

        const secret = url.searchParams.get("secret")?.toString();
        const userId = url.searchParams.get("userId")?.toString();

        console.log("Extracted userId:", userId);
        console.log("Extracted secret:", secret);

        if (!userId || !secret) {
            console.error("Error: Missing userId or secret");
            throw new Error("Failed to login");
        }

        // Step 4: Create session
        const session = await account.createSession(userId, secret);
        console.log("Session Created:", session);

        if (!session) {
            console.error("Error: Failed to create a session");
            throw new Error("Failed to create a session");
        }

        return true;

    } catch (error) {
        console.error("Login Error:", error);
        return false;
    }
}
export async function logout(){
    try{
        await account.deleteSession('current');
        return true;
    } catch(error){
        console.error(error);
        return false;
    }
}

export async function getUser() {
    try {
        const result = await account.get();
        if (result.$id) {
            const userAvatar = avatar.getInitials(result.name);

            return {
                ...result,
                avatar: userAvatar.toString(),
            };
        }
        return null;
    } catch (error) {
        console.log(error);
        return null;
    }
}