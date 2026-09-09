import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

// Create a base axios instance for API calls
const api = axios.create({
    baseURL: '/',
    headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
    },
});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initializeAuth = async () => {
            if (token) {
                try {
                    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                    const response = await api.get('/api/me');
                    setUser(response.data.user);
                } catch (error) {
                    console.error('Session expired or invalid token');
                    logout();
                }
            }
            setLoading(false);
        };

        initializeAuth();
    }, [token]);

    const login = async (email, password) => {
        const response = await axios.post('/api/login', { email, password });
        const { token: newToken, user: userData } = response.data;

        localStorage.setItem('token', newToken);
        api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

        setToken(newToken);
        setUser(userData);
        return { success: true };
    };

    const logout = () => {
        localStorage.removeItem('token');
        delete api.defaults.headers.common['Authorization'];
        setToken(null);
        setUser(null);
    };

    const hasRole = (allowedRoles) => {
        if (!user || !user.role) return false;
        if (Array.isArray(allowedRoles)) {
            return allowedRoles.includes(user.role);
        }
        return user.role === allowedRoles;
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, login, logout, hasRole, api }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
