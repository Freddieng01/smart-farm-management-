import axios from 'axios';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const AuthContext = createContext(null);
const TOKEN_KEY = 'ffms.auth.token';
const USER_KEY = 'ffms.auth.user';

const api = axios.create({
    baseURL: '/api',
    headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
    },
});

function readStoredUser() {
    const storedUser = window.localStorage.getItem(USER_KEY);

    if (!storedUser) {
        return null;
    }

    try {
        return JSON.parse(storedUser);
    } catch {
        window.localStorage.removeItem(USER_KEY);
        return null;
    }
}

export function AuthProvider({ children }) {
    const [token, setToken] = useState(() => window.localStorage.getItem(TOKEN_KEY));
    const [user, setUser] = useState(readStoredUser);
    const [authError, setAuthError] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (token) {
            api.defaults.headers.common.Authorization = `Bearer ${token}`;
        } else {
            delete api.defaults.headers.common.Authorization;
        }
    }, [token]);

    const persistSession = useCallback((payload) => {
        const nextToken = payload.access_token || payload.token;
        const nextUser = payload.user;

        if (!nextToken || !nextUser) {
            throw new Error('Invalid authentication payload.');
        }

        window.localStorage.setItem(TOKEN_KEY, nextToken);
        window.localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
        setToken(nextToken);
        setUser(nextUser);
    }, []);

    const clearSession = useCallback(() => {
        window.localStorage.removeItem(TOKEN_KEY);
        window.localStorage.removeItem(USER_KEY);
        setToken(null);
        setUser(null);
    }, []);

    useEffect(() => {
        let active = true;

        async function bootstrapAuth() {
            if (!token) {
                if (active) {
                    setLoading(false);
                }
                return;
            }

            try {
                const response = await api.get('/me');
                const currentUser = response.data.user || response.data;

                if (!active) {
                    return;
                }

                setUser(currentUser);
                window.localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
            } catch {
                if (active) {
                    clearSession();
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        bootstrapAuth();

        return () => {
            active = false;
        };
    }, [clearSession, token]);

    const login = useCallback(async (credentials) => {
        setLoading(true);
        setAuthError(null);

        try {
            const response = await api.post('/login', credentials);
            persistSession(response.data);
            return response.data.user;
        } catch (error) {
            const message = error.response?.data?.message || 'Login failed. Check your credentials and try again.';
            setAuthError(message);
            throw error;
        } finally {
            setLoading(false);
        }
    }, [persistSession]);

    const register = useCallback(async (payload) => {
        setLoading(true);
        setAuthError(null);

        try {
            const response = await api.post('/register', payload);
            persistSession(response.data);
            return response.data.user;
        } catch (error) {
            const message = error.response?.data?.message || 'Registration failed. Review the form and try again.';
            setAuthError(message);
            throw error;
        } finally {
            setLoading(false);
        }
    }, [persistSession]);

    const logout = useCallback(async () => {
        setLoading(true);

        try {
            if (token) {
                await api.post('/logout');
            }
        } finally {
            clearSession();
            setLoading(false);
        }
    }, [clearSession, token]);

    const hasRole = useCallback((roles) => {
        if (!user) return false;
        const roleArray = Array.isArray(roles) ? roles : [roles];
        return roleArray.includes(user.role);
    }, [user]);

    const value = useMemo(() => ({
        api,
        token,
        user,
        role: user?.role || null,
        authError,
        loading,
        isAuthenticated: Boolean(token && user),
        login,
        register,
        logout,
        hasRole,
    }), [authError, hasRole, loading, login, logout, register, token, user]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error('useAuth must be used inside AuthProvider');
    }

    return context;
}
