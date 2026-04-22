import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AuthContext } from './AuthContext';

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null); // Terá dados do auth.users + a role de profiles
    const [loading, setLoading] = useState(true);

    const fetchUserProfile = async (authUser) => {
        if (!authUser) {
            setUser(null);
            setLoading(false);
            return;
        }

        try {
            // Busca os dados da tabela `profiles` que estende o usuário base
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', authUser.id)
                .single();

            if (error) {
                console.error("Erro ao buscar perfil:", error.message);
                setUser({ ...authUser, role: 'student' }); // Fallback
            } else {
                setUser({ ...authUser, ...data });
            }
        } catch (err) {
            console.error("Erro inesperado ao buscar perfil:", err);
            setUser({ ...authUser, role: 'student' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Obter sessão inicial
        supabase.auth.getSession().then(({ data: { session } }) => {
            fetchUserProfile(session?.user ?? null);
        });

        // Escutar mudanças de estado da autenticação
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            fetchUserProfile(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    const login = async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) throw error;
        return data;
    };

    const register = async (email, password, firstname, lastname) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    firstname,
                    lastname,
                    role: 'student' // Default seguro
                }
            }
        });
        if (error) throw error;
        return data;
    };

    const logout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};