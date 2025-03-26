import { ScrollView, View, Button, Text, Image, Pressable, TouchableOpacity } from 'react-native';
import React, { useEffect, useState } from 'react';
import tw from 'twrnc';
import {router} from 'expo-router';
import AegisShield from '../../assets/images/Aegis-Shield.png';
import Eye from '../../assets/images/eye.png';
import Markk from '../../assets/images/Mark.png';
import Lockk from '../../assets/images/Lock.png';
import MotionSensor from '../../assets/images/Motion.png';
import auth from '@react-native-firebase/auth';
import { useRouter } from "expo-router";
import {signOut} from "@firebase/auth";
import Icon from 'react-native-ico-material-design'
import MaterialIcons from 'react-native-vector-icons/MaterialIcons'; // Correct import



export default function AlertScreen() {

    const router = useRouter();
    const time2 = '16:00';
    var iconHeight = 26;
    var iconWidth = 26;
    const [time, setTime] = useState(new Date());
    const [activeBox, setActiveBox] = useState<string | null>(null);

    const handlePress = (screen: string) => {
        setActiveBox(screen); // Set the active box to change its color
        setTimeout(() => {
            setActiveBox(null); // Reset the color after 1 second
            router.push(screen as any); // Navigate to the screen
        }, 500); 
    };

    useEffect(() => {
        setInterval(() => setTime(new Date()), 1000);
    }, []);

    return (
        <ScrollView
            contentContainerStyle={tw`flex-1 items-center bg-gray-50 px-4`}
        > 
        <View style={tw`flex-row items-start justify-between w-85 mt-12`}>
            <View style={tw`flex-row items-start`}>
                <Image
                    source={AegisShield}
                    style={tw`w-16 h-16 items-start`}
                    resizeMode="contain"
                />
                <View style={tw`ml-4`}>
                    <Text style={tw`text-black text-xl font-bold`}>Hello, !</Text>
                    <Text style={tw`text-black text-sm mt-1`}>{time.toLocaleString()}</Text>
                </View>            
            </View>

            <TouchableOpacity
                    onPress={() => router.push('/nav-screens/LiveViewScreen')}
                    style={tw`p-2`}>
                    <MaterialIcons name="settings" size={30} />
            </TouchableOpacity>
        </View>
                <View style={tw`w-85 h-0.5 bg-gray-300 rounded-md mt-5`}></View>

                <Text style={tw`text-black text-4x1 mt-10`}>
                    The kids arrived home at {time2}h
                </Text> 

            <View
                style={{
                    width: '95%',
                    height: '30%',
                    display: 'flex',
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    justifyContent:'space-around',
                    alignItems: 'flex-start',
                    rowGap: 20,
                    columnGap: 30,
                    marginTop: 50,
                    marginBottom: 200,
                }}
            >
            <TouchableOpacity
                onPress={() => handlePress('/nav-screens/AlertScreen')}
                style={[
                    tw`w-40 h-45 items-center rounded-xl text-center shadow-xl`,
                    activeBox === '/nav-screens/AlertScreen' ? tw`bg-blue-500` : tw`bg-white`
                ]}
            >
                <Image style={tw`w-9 h-10 mr-3`} resizeMode="contain" />
                <Text style={tw`text-lg font-rubik text-center text-black-300`}>Alert Logs</Text>
            </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => router.push('/nav-screens/LiveViewScreen')}
                    style={tw`w-40 h-45 bg-white items-center rounded-xl text-center shadow-xl`}>
                    <Image style={tw`w-10 h-10 mr-3`} resizeMode="contain" />
                    <Text style={tw`text-lg font-rubik text-center text-black-300`}>Live View</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => router.push('/nav-screens/Lock')}
                    style={tw`w-40 h-45 bg-white items-center rounded-xl text-center shadow-xl`}>
                    <Image style={tw`w-10 h-10 mr-3`} resizeMode="contain" />
                    <Text style={tw`text-lg font-rubik text-center text-black-300`}>Solenoid Lock</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => router.push('/nav-screens/Sensor')}
                    style={tw`w-40 h-45 bg-white items-center rounded-xl text-center shadow-xl`}>
                    <Image style={tw`w-10 h-10 mr-3`} resizeMode="contain" />
                    <Text style={tw`text-lg font-rubik text-center text-black-300`}>Motion Sensor</Text>
                </TouchableOpacity>

            </View>
            <View style={tw`flex-1`} />



        </ScrollView>
    );
}
