import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, Home, BookOpen, LogOut, PlusCircle, User, X } from 'lucide-react';
import { useAuth } from '../../context/useAuth';

const ClassroomLayout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const navLinks = [
        { path: '/dashboard', label: 'Início', icon: <Home className="w-5 h-5" /> },
        { path: '/catalog', label: 'Catálogo', icon: <BookOpen className="w-5 h-5" /> },
    ];

    return (
        <div className="flex h-screen overflow-hidden bg-gray-50">
            {/* Sidebar Ocultável (Mobile Overlay) */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 bg-white border-r border-gray-200 transform transition-all duration-300 ease-in-out md:relative ${
                    isSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0 md:w-20'
                }`}
            >
                <div className="h-full flex flex-col">
                    <div className={`flex items-center h-16 border-b border-gray-200 ${isSidebarOpen ? 'px-4 justify-between' : 'justify-center'}`}>
                        {isSidebarOpen && <span className="text-xl font-semibold text-gray-800">Sala de Aula</span>}
                        <button
                            className="md:hidden text-gray-500 hover:text-gray-700 focus:outline-none"
                            onClick={() => setIsSidebarOpen(false)}
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <nav className={`flex-1 py-4 space-y-1 overflow-y-auto ${isSidebarOpen ? 'px-4' : 'px-2'}`}>
                        {navLinks.map((link) => (
                            <Link
                                key={link.path}
                                to={link.path}
                                title={!isSidebarOpen ? link.label : ''}
                                className={`flex items-center rounded-md text-sm font-medium transition-colors ${
                                    isSidebarOpen ? 'px-3 py-2.5' : 'justify-center py-3'
                                } ${
                                    location.pathname === link.path
                                        ? 'bg-blue-50 text-blue-700'
                                        : 'text-gray-700 hover:bg-gray-100'
                                }`}
                                onClick={() => { if(window.innerWidth < 768) setIsSidebarOpen(false); }}
                            >
                                <span className={isSidebarOpen ? "mr-3" : ""}>{link.icon}</span>
                                {isSidebarOpen && link.label}
                            </Link>
                        ))}

                        {/* Divisor */}
                        <div className={`my-4 border-t border-gray-200 ${!isSidebarOpen && 'mx-2'}`}></div>

                        {user?.role === 'admin' && (
                            <Link
                                to="/admin"
                                title={!isSidebarOpen ? 'Painel Prof.' : ''}
                                className={`flex items-center rounded-md text-sm font-medium transition-colors ${
                                    isSidebarOpen ? 'px-3 py-2.5' : 'justify-center py-3'
                                } ${
                                    location.pathname === '/admin'
                                        ? 'bg-green-50 text-green-700'
                                        : 'text-gray-700 hover:bg-gray-100'
                                }`}
                                onClick={() => { if(window.innerWidth < 768) setIsSidebarOpen(false); }}
                            >
                                <PlusCircle className={`w-5 h-5 ${isSidebarOpen ? 'mr-3' : ''}`} />
                                {isSidebarOpen && 'Painel Prof.'}
                            </Link>
                        )}
                    </nav>

                    {/* Rodapé da Sidebar (User Info Mobile) */}
                    <div className="p-4 border-t border-gray-200 md:hidden">
                         <div className="flex items-center gap-3 mb-4">
                            <div className="bg-blue-100 p-2 rounded-full text-blue-600">
                                <User className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                    {user?.firstname} {user?.lastname}
                                </p>
                                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="flex items-center w-full px-3 py-2 text-sm font-medium text-red-600 rounded-md hover:bg-red-50 transition-colors"
                        >
                            <LogOut className="w-5 h-5 mr-3" />
                            Sair
                        </button>
                    </div>
                </div>
            </aside>

            {/* Conteúdo Principal */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Navbar Topo */}
                <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center">
                        <button
                            className="text-gray-500 hover:text-gray-700 focus:outline-none p-2 -ml-2 rounded-md"
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                        <span className="ml-4 text-lg font-medium text-gray-800 md:hidden">Sala de Aula</span>
                    </div>

                    <div className="flex items-center gap-4">
                        {user?.role === 'admin' && (
                            <Link
                                to="/admin"
                                className="hidden sm:flex items-center justify-center p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors tooltip"
                                title="Criar Turma"
                            >
                                <PlusCircle className="w-6 h-6 text-gray-600" />
                            </Link>
                        )}

                        {/* User Menu Dropdown Simples */}
                        <div className="hidden md:flex items-center gap-3">
                            <div className="relative group">
                                <button className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors overflow-hidden">
                                    {user?.avatar_url ? (
                                        <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <User className="w-5 h-5" />
                                    )}
                                </button>

                                {/* Dropdown */}
                                <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg py-1 border border-gray-200 invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all z-50">
                                    <div className="px-4 py-3 border-b border-gray-100 flex flex-col">
                                        <p className="text-sm font-medium text-gray-800 truncate">
                                            {user?.firstname || user?.email?.split('@')[0]} {user?.lastname || ''}
                                        </p>
                                        <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                                    </div>

                                    <Link
                                        to="/settings"
                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center transition-colors"
                                    >
                                        Configurações
                                    </Link>

                                    <button
                                        onClick={handleLogout}
                                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 flex items-center rounded-b-md transition-colors"
                                    >
                                        <LogOut className="w-4 h-4 mr-2" />
                                        Sair
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Área Scrollável das Páginas */}
                <main className="flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-6 lg:p-8 relative">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default ClassroomLayout;