import React from 'react';
import { ScrollView, Text } from 'react-native';
import tw from 'twrnc';

export default function SignUp() {
    return (
        <ScrollView contentContainerStyle={tw`flex-1 justify-center items-center`}>
            <Text>Sign Up Screen</Text>
        </ScrollView>
    );
}
