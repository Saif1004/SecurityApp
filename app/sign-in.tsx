import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Image, ActivityIndicator, Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import tw from 'twrnc';
import AegisShield from '../assets/images/Aegis-Shield.png';

import { auth, db } from './firebase';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export default function SignIn() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [otpStep, setOtpStep] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleEmailSignIn = async () => {
    setLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const uid = result.user.uid;
      const snap = await getDoc(doc(db, 'users', uid));
      const isVerified = snap.data()?.otpVerified;

      if (isVerified) {
        router.replace('/nav-screens/HomeScreen');
        return;
      }

      await signOut(auth); // immediately sign out until OTP is verified

      Alert.alert('OTP Sent', 'Use test code: 100404');
      setConfirm({
        uid,
        confirm: async (code) => {
          if (code === '100404') return Promise.resolve();
          throw new Error('Invalid OTP');
        }
      });

      setOtpStep(true);
    } catch (err) {
      Alert.alert('Login failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setLoading(true);
    try {
      if (!confirm) throw new Error('Missing OTP step');

      await confirm.confirm(otp);

      // Re-authenticate now that OTP is confirmed
      const result = await signInWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, 'users', result.user.uid), { otpVerified: true }, { merge: true });

      router.replace('/nav-screens/HomeScreen');
    } catch (err) {
      Alert.alert('OTP verification failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={tw`flex-1 justify-center items-center bg-white px-4`}>
      <Image source={AegisShield} style={tw`w-48 h-48 mb-4`} />
      <Text style={tw`text-3xl font-bold text-gray-800 mb-6`}>Aegis Security Systems</Text>

      {!otpStep ? (
        <View style={tw`w-full max-w-sm`}>
          <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} />
          <TextInput style={styles.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
          <TouchableOpacity onPress={handleEmailSignIn} style={tw`mt-4`}>
            <LinearGradient colors={['#6EA0F7', '#6290DF']} style={tw`py-3 rounded-lg`}>
              <Text style={tw`text-white text-center text-lg font-semibold`}>Login</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={tw`w-full max-w-sm`}>
          <TextInput style={styles.input} placeholder="Enter OTP" value={otp} onChangeText={setOtp} keyboardType="number-pad" />
          <TouchableOpacity onPress={handleVerifyOtp} style={tw`mt-4`}>
            <LinearGradient colors={['#6EA0F7', '#6290DF']} style={tw`py-3 rounded-lg`}>
              <Text style={tw`text-white text-center text-lg font-semibold`}>Verify OTP</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {loading && <ActivityIndicator size="large" color="#6EA0F7" style={tw`mt-6`} />}

      {!otpStep && (
        <TouchableOpacity onPress={() => router.push('/sign-up')} style={tw`mt-6`}>
          <Text style={tw`text-[#6EA0F7] text-lg font-semibold`}>Don't have an account? Sign up</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  input: {
    marginVertical: 8,
    height: 50,
    width: '100%',
    borderColor: '#E5E7EB',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    fontSize: 16,
  }
});
