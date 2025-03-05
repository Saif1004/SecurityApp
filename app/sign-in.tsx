import React from 'react';
import {router, useRouter} from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, View, Image, Button } from 'react-native';
import AegisShield from '../assets/images/Aegis-Shield.png';

const SignIn = () => {
    const router = useRouter();
    return (
                <><View style={{flex: 1, alignItems: 'center'}}>
                    <Image
                        source={AegisShield}
                        style={{width: 400, height: 400, justifyContent: 'top', alignSelf: 'center', marginVertical: 0}}
                        resizeMode="contain"/>

                </View>
                    <Button
                        title="Go to Sign Up"
                        onPress={() => router.push('/sign-up')}/></>
    );
};

export default SignIn;
