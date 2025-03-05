import {Button, Image, Text, View} from "react-native";
import {Link, router} from "expo-router";
import AegisShield from "@/assets/images/Aegis-Shield.png";
import React from "react";

export default function Index() {
    return (
        <><View style={{flex: 1, alignItems: 'center'}}>
            <Image
                source={AegisShield}
                style={{width: 400, height: 400, justifyContent: 'top', alignSelf: 'center', marginVertical: 0}}
                resizeMode="contain"/>

        </View>
            <Button
            title="Go to Sign In"
            onPress={() => router.push('/sign-in')}/></>
);
}
