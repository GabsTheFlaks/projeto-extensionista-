import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthProvider';
import { useAuth } from './context/useAuth';
import ProtectedRoute from './components/ProtectedRoute';
import ClassroomLayout from './components/layout/ClassroomLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';
import ClassView from './pages/ClassView';
import Viewer from './pages/Viewer';
import Admin from './pages/Admin';

const ConfigWarning = () => {
    const isDefaultConfig = import.meta.env.VITE_SUPABASE_URL === undefined || import.meta.env.VITE_SUPABASE_URL.includes('localhost');

    if (!isDefaultConfig) return null;

    return (
        <div className="bg-red-600 text-white px-4 py-3 text-center sm:px-6 lg:px-8 z-50 fixed top-0 w-full shadow-md text-sm font-medium">
            <p>
                ⚠️ <strong>Aviso Importante:</strong> O Supabase não está configurado. Crie o arquivo <code className="bg-red-800 px-1 py-0.5 rounded">.env</code> e insira sua <code className="bg-red-800 px-1 py-0.5 rounded">VITE_SUPABASE_URL</code> e <code className="bg-red-800 px-1 py-0.5 rounded">VITE_SUPABASE_ANON_KEY</code>.
            </p>
        </div>
    );
};

const AdminRoute = () => {
    const { user, loading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!loading && user?.role !== 'admin') {
            navigate('/dashboard', { replace: true });
        }
    }, [user, loading, navigate]);

    if (loading || user?.role !== 'admin') return null;

    return <Outlet />;
};

const AppRoutes = () => {
    return (
        <BrowserRouter>
            <Routes>
                {/* Rotas Públicas */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />

                {/* Rotas Protegidas Autenticadas */}
                <Route element={<ProtectedRoute />}>
                    <Route element={<ClassroomLayout />}>
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/catalog" element={<Dashboard />} /> {/* Reaproveita o Dashboard */}
                        <Route path="/class/:id" element={<ClassView />} />
                        <Route path="/activity/:activityId" element={<Viewer />} />

                        {/* Rotas de Admin */}
                        <Route element={<AdminRoute />}>
                            <Route path="/admin" element={<Admin />} />
                        </Route>
                    </Route>
                </Route>

                {/* Fallback temporário até criar o dashboard */}
                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        </BrowserRouter>
    );
};

function App() {
    return (
        <>
            <ConfigWarning />
            <AuthProvider>
                <div className={import.meta.env.VITE_SUPABASE_URL === undefined || import.meta.env.VITE_SUPABASE_URL.includes('localhost') ? 'pt-12' : ''}>
                    <AppRoutes />
                </div>
            </AuthProvider>
        </>
    );
}

export default App;