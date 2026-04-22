import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/useAuth';
import { supabase } from '../lib/supabase';
import CourseCard from '../components/CourseCard';
import { BookX } from 'lucide-react';

const Dashboard = () => {
    const { user } = useAuth();
    const [myClasses, setMyClasses] = useState([]);
    const [allClasses, setAllClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('my_courses'); // 'my_courses' | 'catalog'

    useEffect(() => {
        const fetchDashboardData = async () => {
            setLoading(true);
            try {
                // 1. Buscar todas as turmas
                const { data: classesData, error: classesError } = await supabase
                    .from('classes')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (classesError) throw classesError;

                // 2. Buscar as matrículas do usuário
                const { data: membersData, error: membersError } = await supabase
                    .from('class_members')
                    .select('class_id')
                    .eq('user_id', user.id);

                if (membersError) throw membersError;

                const enrolledClassIds = new Set(membersData.map(m => m.class_id));

                // 3. Separar as turmas matriculadas do catálogo geral
                const enrolledClasses = classesData.filter(c => enrolledClassIds.has(c.id));

                setAllClasses(classesData);
                setMyClasses(enrolledClasses);

            } catch (error) {
                console.error("Erro ao carregar dados do dashboard:", error.message);
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            fetchDashboardData();
        }
    }, [user]);

    const handleEnroll = async (classId) => {
        try {
            const { error } = await supabase
                .from('class_members')
                .insert([{ class_id: classId, user_id: user.id }]);

            if (error) throw error;

            // Atualizar o estado local sem recarregar tudo
            const newlyEnrolledClass = allClasses.find(c => c.id === classId);
            if (newlyEnrolledClass) {
                setMyClasses(prev => [newlyEnrolledClass, ...prev]);
            }
            setActiveTab('my_courses');

        } catch (error) {
            console.error("Erro ao realizar matrícula:", error.message);
            alert("Não foi possível realizar a matrícula no momento.");
        }
    };

    const isEnrolled = (classId) => {
        return myClasses.some(c => c.id === classId);
    };

    if (loading) {
        return (
            <div className="max-w-7xl mx-auto py-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="bg-white rounded-xl h-72 border border-gray-200 shadow-sm animate-pulse flex flex-col">
                            <div className="h-28 bg-gray-200 rounded-t-xl"></div>
                            <div className="p-4 flex-1">
                                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    const currentClasses = activeTab === 'my_courses' ? myClasses : allClasses;

    return (
        <div className="max-w-7xl mx-auto">
            {/* Tabs de Navegação */}
            <div className="flex border-b border-gray-200 mb-6 gap-6">
                <button
                    className={`pb-4 text-sm font-medium transition-colors relative ${
                        activeTab === 'my_courses'
                            ? 'text-blue-600'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                    onClick={() => setActiveTab('my_courses')}
                >
                    Minhas Turmas
                    {activeTab === 'my_courses' && (
                        <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-md"></span>
                    )}
                </button>
                <button
                    className={`pb-4 text-sm font-medium transition-colors relative ${
                        activeTab === 'catalog'
                            ? 'text-blue-600'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                    onClick={() => setActiveTab('catalog')}
                >
                    Explorar Catálogo
                    {activeTab === 'catalog' && (
                        <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-md"></span>
                    )}
                </button>
            </div>

            {/* Empty States */}
            {currentClasses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                    <div className="bg-gray-100 p-4 rounded-full mb-4">
                        <BookX className="w-12 h-12 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-medium text-gray-800 mb-2">
                        {activeTab === 'my_courses' ? 'Nenhuma turma encontrada' : 'O catálogo está vazio'}
                    </h3>
                    <p className="text-gray-500 text-sm max-w-sm">
                        {activeTab === 'my_courses'
                            ? 'Você ainda não está participando de nenhuma turma. Vá até a aba Explorar para encontrar novos conteúdos.'
                            : 'Ainda não há turmas disponíveis na plataforma.'}
                    </p>
                    {activeTab === 'my_courses' && (
                        <button
                            onClick={() => setActiveTab('catalog')}
                            className="mt-6 px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            Explorar Turmas
                        </button>
                    )}
                </div>
            ) : (
                /* Grid de Cursos */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {currentClasses.map(course => (
                        <CourseCard
                            key={course.id}
                            course={course}
                            isEnrolled={isEnrolled(course.id)}
                            onEnroll={handleEnroll}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default Dashboard;