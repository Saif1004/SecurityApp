import { ScrollView, View, Text, Image, Pressable, TouchableOpacity } from 'react-native';
import * as React from 'react';
import tw from 'twrnc';
import {router} from 'expo-router';
import AegisShield from '../../assets/images/Aegis-Shield.png';
import Eye from '../../assets/images/eye.png';
import Markk from '../../assets/images/Mark.png';
import Lockk from '../../assets/images/Lock.png';
import MotionSensor from '../../assets/images/Motion.png';

export default function AlertScreen() {
  return (
    <ScrollView
        contentContainerStyle={tw`flex-1 justify-center items-center bg-gray-50 px-4`}
    >
        <View style={tw`flex-1 items-center`}>
            <Image
                source={AegisShield}
                style={tw`w-10 h-10`}
                resizeMode="contain"
            />

            <View style={tw`w-80 h-0.5 bg-gray-300 rounded-md mt-5`}></View>
        </View>

        <View
            style={{
                width: '85%',
                height: '40%',
                display: 'flex',
                flexDirection: 'row',
                flexWrap: 'wrap',
                justifyContent: 'space-around',
                alignItems: 'flex-start',
                rowGap: 20,
                columnGap: 30,
                marginBottom: 200,
            }}
        >
            <TouchableOpacity
                onPress={() => router.push('/nav-screens/AlertScreen')}
                style={tw`w-40 h-45 bg-white items-center rounded-xl text-center shadow-xl`}>
                <Image source={Markk} style={tw`w-9 h-10 mr-3`} resizeMode="contain" />
                <Text style={tw`text-lg font-rubik text-center text-black-300`}>Alert Logs</Text>
            </TouchableOpacity>

            <TouchableOpacity
                onPress={() => router.push('/nav-screens/LiveViewScreen')}
                style={tw`w-40 h-45 bg-white items-center rounded-xl text-center shadow-xl`}>
                <Image source={Eye} style={tw`w-10 h-10 mr-3`} resizeMode="contain" />
                <Text style={tw`text-lg font-rubik text-center text-black-300`}>Live View</Text>
            </TouchableOpacity>

            <TouchableOpacity
                onPress={() => router.push('/nav-screens/Lock')}
                style={tw`w-40 h-45 bg-white items-center rounded-xl text-center shadow-xl`}>
                <Image source={Lockk} style={tw`w-10 h-10 mr-3`} resizeMode="contain" />
                <Text style={tw`text-lg font-rubik text-center text-black-300`}>Solenoid Lock</Text>
            </TouchableOpacity>

            <TouchableOpacity
                onPress={() => router.push('/nav-screens/Sensor')}
                style={tw`w-40 h-45 bg-white items-center rounded-xl text-center shadow-xl`}>
                <Image source={MotionSensor} style={tw`w-10 h-10 mr-3`} resizeMode="contain" />
                <Text style={tw`text-lg font-rubik text-center text-black-300`}>Motion Sensor</Text>
            </TouchableOpacity>

        </View>
        <View style={tw`flex-1`} />

    </ScrollView>
);
}
