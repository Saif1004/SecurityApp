import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import {
  ScrollView, View, Image, Text, StyleSheet, TextInput, TouchableOpacity,
  Alert, ActivityIndicator
} from 'react-native';
import tw from 'twrnc';
import AegisShield from '../assets/images/Aegis-Shield.png';
import { LinearGradient } from 'expo-linear-gradient';

import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

export default function SignUp() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const sendOTP = () => {
    // Fake OTP flow for Expo Go testing
    Alert.alert('Test OTP Sent', 'Use code: 100404');
    setOtpSent(true);
  };

  const verifyOTPandSignUp = async () => {
    if (!otpSent) {
      Alert.alert('Error', 'Send the OTP first.');
      return;
    }

    setLoading(true);
    try {
      if (otp !== '100404') throw new Error('Invalid OTP');

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      await setDoc(doc(db, 'users', userCredential.user.uid), {
        email,
        phoneNumber: phone,
        otpVerified: true,
      });

      Alert.alert('Success', 'Account created!');
      router.replace('/sign-in');
    } catch (e) {
      Alert.alert('Failed', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={tw`flex-1 justify-center items-center bg-white px-6`}>
      <Image source={AegisShield} style={tw`w-48 h-48`} resizeMode="contain" />
      <Text style={tw`text-2xl font-bold text-gray-800 mt-6`}>Aegis Security Systems</Text>
      <View style={styles.container}>
        <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="Email" />
        <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry placeholder="Password" />
        <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="Phone (+123...)" keyboardType="phone-pad" />

        <TouchableOpacity onPress={sendOTP} style={tw`rounded-lg shadow-md overflow-hidden w-full mt-2`}>
          <LinearGradient colors={['#6EA0F7', '#6290DF']} style={tw`py-4`}>
            <Text style={tw`text-white text-center font-semibold text-lg`}>Send OTP</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TextInput style={styles.input} value={otp} onChangeText={setOtp} placeholder="Enter OTP" keyboardType="number-pad" />

        {loading ? (
          <ActivityIndicator size="small" style={tw`my-6`} />
        ) : (
          <TouchableOpacity onPress={verifyOTPandSignUp} style={tw`rounded-lg shadow-md overflow-hidden w-full mt-4`}>
            <LinearGradient colors={['#6EA0F7', '#6290DF']} style={tw`py-4`}>
              <Text style={tw`text-white text-center font-semibold text-lg`}>Create Account</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={() => router.push('/sign-in')} style={tw`mt-6`}>
          <Text style={tw`text-[#6EA0F7] text-lg font-semibold`}>Already have an account? Sign in</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', alignItems: 'center' },
  input: {
    marginVertical: 8, height: 50, width: '100%',
    borderWidth: 1, borderColor: '#E5E7EB',
    borderRadius: 12, paddingHorizontal: 16,
    fontSize: 16, backgroundColor: '#F9FAFB',
  },
});
