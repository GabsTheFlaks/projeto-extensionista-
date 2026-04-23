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
        <AuthProvider>
            <AppRoutes />
        </AuthProvider>
    );
}

export default App;