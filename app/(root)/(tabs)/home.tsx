import {View, Text, StatusBar} from 'react-native'
import React from 'react'
import tw from 'twrnc';


const Home = () => {
    return (
        <View style={tw`flex-1 bg-gray-400 items-center p-20`}>
            <Text style={tw`text-black text-7x1 font-bold`}>Welcome!</Text>
        </View>
    );
}
export default Home
