// /app/utils/otp.ts
import axios from 'axios';

const FIREBASE_API_KEY = 'AIzaSyD30npyrMIe1LgD2T-_6mHE0DDtZ9gbTBI'; // Use same as firebaseConfig

export const sendPhoneOTP = async (phoneNumber: string) => {
  const response = await axios.post(
    `https://identitytoolkit.googleapis.com/v1/accounts:sendVerificationCode?key=${FIREBASE_API_KEY}`,
    {
      phoneNumber,
      recaptchaToken: "ignored", // only in test mode
    }
  );
  return response.data.sessionInfo;
};

export const verifyPhoneOTP = async (sessionInfo: string, code: string) => {
  const response = await axios.post(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPhoneNumber?key=${FIREBASE_API_KEY}`,
    {
      sessionInfo,
      code,
    }
  );
  return response.data.idToken;
};
