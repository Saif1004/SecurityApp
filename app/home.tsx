import { ScrollView, View, Text, Image, Pressable } from 'react-native';
import React, { useEffect, useState } from 'react';
import tw from 'twrnc';
import AegisShield from '../assets/images/Aegis-Shield.png';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Icon from 'react-native-ico-material-design';

const Home = () => {
  const name = 'Harpreet';
  const time2 = '16:00';
  var iconHeight = 26;
  var iconWidth = 26;
  const [time, setTime] = useState(new Date());
  const [screenText, setScreenText] = useState('press a button')

  useEffect(() => {
    setInterval(() => setTime(new Date()), 1000);
  }, []);

  const changeText = (text) => {
    console.log(text + 'has been pressed');
    setScreenText(text),
  };


  return (
    <ScrollView
      contentContainerStyle={tw`flex-1 justify-center items-center bg-gray-200 px-4`}
    >
      <View style={tw`flex-1 items-center`}>
        <Image
          source={AegisShield}
          style={tw`w-10 h-10`}
          resizeMode="contain"
        />
        <Text style={tw`text-black text-6x1 font-bold`}>Hello, {name}!</Text>

        <Text style={tw`items-center mt-2`}>{time.toLocaleString()}</Text>

        <View style={tw`w-80 h-0.5 bg-gray-300 rounded-md mt-5`}></View>

        <Text style={tw`flex-auto text-black text-4x1 mt-4`}>
          The kids arrived home at {time2}h
        </Text>
      </View>

      <View
        style={{
          width: '85%',
          height: '50%',
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
        <Text style={tw`w-35 h-40 bg-white rounded-xl text-center shadow-xl`}>
          Door Bell
        </Text>
        <Text style={tw`w-35 h-40 bg-white rounded-xl text-center shadow-xl`}>
          Main Bell
        </Text>
        <Text style={tw`w-35 h-40 bg-white rounded-xl text-center shadow-xl`}>
          Front Cam
        </Text>
        <Text style={tw`w-35 h-40 bg-white rounded-xl text-center shadow-xl`}>
          Backyard
        </Text>
      </View>

      <View style={{ position: 'absolute', alignItems: 'center', bottom: 20 }}>
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: 'eeeeee',
            width: '90%',
            justifyContent: 'space-evenly',
            borderRadius: 40,
          }}
        >
          <Pressable
            onPress={() => this.changeText('Favourites')}
            style={{ padding: 14 }}
          ></Pressable>
        </View>
      </View>
    </ScrollView>
  );
};
export default Home;
