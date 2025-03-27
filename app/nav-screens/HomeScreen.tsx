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
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';


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
                    onPress={() => router.push('/nav-screens/settings')}
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
                    tw`w-37 h-44 items-center rounded-2xl text-center shadow-xl overflow-hidden`,
                    activeBox === '/nav-screens/LiveViewScreen' ? tw`bg-white` : {backgroundColor: '#4c7efc'}
                ]}
            >
                  <LinearGradient
                    colors={['#1D4ED8', '#22D3EE']}
                    start={{ x: 0, y: 1 }}
                    end={{ x: 0, y: 0 }}
                    style={tw`w-37 h-44 items-center justify-between p-3`}
                >
                    <Ionicons name="alert-circle" size={20} color="white" style={tw`w-7 h-7 mb-4`} />
                    <Image style={tw`w-9 h-10 mr-3`} resizeMode="contain" />
                    <Text style={tw`text-lg font-rubik text-center text-white`}>Alert Logs</Text>
                </LinearGradient>

            </TouchableOpacity>

            <TouchableOpacity
                onPress={() => handlePress('/nav-screens/LiveViewScreen')}
                style={[
                    tw`w-37 h-44 items-center rounded-2xl text-center shadow-xl overflow-hidden`,
                    activeBox === '/nav-screens/LiveViewScreen' ? tw`bg-white` : {backgroundColor: '#4c7efc'}
                ]}
            >                  
                <LinearGradient
                    colors={['#1D4ED8', '#22D3EE']}
                    start={{ x: 0, y: 1 }}
                    end={{ x: 0, y: 0 }}
                    style={tw`w-37 h-44 items-center justify-between p-3`}
                >
                    <Ionicons name="eye" size={22} color="white" style={tw`w-7 h-7 mb-4`} />
                    <Image style={tw` h-3`} resizeMode="contain" />
                    <Text style={tw`text-lg font-rubik text-center text-white`}>Live View</Text>
                </LinearGradient>

            </TouchableOpacity>

            <TouchableOpacity
                onPress={() => handlePress('/nav-screens/Lock')}
                style={[
                    tw`w-37 h-44 items-center rounded-2xl text-center shadow-xl overflow-hidden`,
                    activeBox === '/nav-screens/Lock' ? tw`bg-white` : {backgroundColor: '#4c7efc'}
                ]}
            >
                <LinearGradient
                    colors={['#1D4ED8', '#22D3EE']}
                    start={{ x: 0, y: 1 }}
                    end={{ x: 0, y: 0 }}
                    style={tw`w-37 h-44 items-center justify-between p-3`}
                >
                    <Ionicons name="lock-closed" size={20} color="white" style={tw`w-7 h-7 mb-4`} />
                    <Image style={tw`w-9 h-10 mr-3`} resizeMode="contain" />
                    <Text style={tw`text-lg font-rubik text-center text-white`}>Solenoid Lock</Text>
                </LinearGradient>

            </TouchableOpacity>

            <TouchableOpacity
                onPress={() => handlePress('/nav-screens/Motion Sensor')}
                style={[
                    tw`w-37 h-44 items-center rounded-2xl text-center shadow-xl overflow-hidden`,
                    activeBox === '/nav-screens/Motion Sensor' ? tw`bg-white` : {backgroundColor: '#4c7efc'}
                ]}
            >
                <LinearGradient
                    colors={['#1D4ED8', '#22D3EE']}
                    start={{ x: 0, y: 1 }}
                    end={{ x: 0, y: 0 }}
                    style={tw`w-37 h-44 items-center justify-between p-3`}
                >
                    <Ionicons name="radio" size={20} color="white" style={tw`w-7 h-7 mb-4`} />
                    <Image style={tw`w-9 h-10 mr-3`} resizeMode="contain" />
                    <Text style={tw`text-lg font-rubik text-center text-white`}>Motion Sensor</Text>
                </LinearGradient>

            </TouchableOpacity>

            </View>

            <View style={tw`flex-row items-start justify-between mt-2`}>
                <View style={tw`flex-row items-start w-25`}>
                    <TouchableOpacity style={tw`w-12 h-12 bg-white rounded-full shadow-lg items-center justify-center`}>
                        <Ionicons name="add" size={24} color="black" />
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    onPress={() => router.push('/sign-in')}
                >
                    <LinearGradient
                        colors={['#8B0000', '#d80000']}
                        start={{ x: 0, y: 1 }}
                        end={{ x: 0, y: 0 }}
                        style={[
                            tw`w-25 h-11 items-center rounded-xl text-center shadow-xl overflow-hidden mr-24`,
                        ]}                
                    >
                        <Image style={tw`w-9 mr-3`} resizeMode="contain" />
                        <Text style={tw`text-lg font-rubik text-center text-white mt-1`}>Logout</Text>
                    </LinearGradient>

                </TouchableOpacity>
            </View>



        </ScrollView>
    );
}
