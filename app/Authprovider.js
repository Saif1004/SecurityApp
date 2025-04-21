import React, { createContext, useContext, useEffect, useState } from 'react';
import auth from '@react-native-firebase/auth';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [initializing, setInitializing] = useState(true);

    useEffect(() => {
        const unsubscribe = auth().onAuthStateChanged((user) => {
            console.log('Auth State Changed:', user);
            setUser(user);
            setInitializing(false);
        });

        return unsubscribe; // Cleanup on unmount
    }, []);

    return (
        <AuthContext.Provider value={{ user, initializing }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);