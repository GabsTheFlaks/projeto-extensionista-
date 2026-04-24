import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/useAuth';
import { supabase } from '../lib/supabase';
import { useLocation } from 'react-router-dom';
import CourseCard from '../components/CourseCard';
import { BookX } from 'lucide-react';

const Dashboard = () => {
    const { user } = useAuth();
    const location = useLocation();

    const [myClasses, setMyClasses] = useState([]);
    const [allClasses, setAllClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [localTab, setLocalTab] = useState(null); // 'my_courses' | 'catalog' ou null se seguir url

    // Controle do Modal de Matrícula
    const [enrollModal, setEnrollModal] = useState({ isOpen: false, course: null });
    const [enrolling, setEnrolling] = useState(false);

    const baseTab = location.pathname === '/catalog' ? 'catalog' : 'my_courses';
    const activeTab = localTab !== null ? localTab : baseTab;

    // Sincronizar o Local Tab para anular ao usar navegação da sidebar
    const [prevPath, setPrevPath] = useState(location.pathname);
    if (location.pathname !== prevPath) {
        setPrevPath(location.pathname);
        setLocalTab(null);
    }

    useEffect(() => {
        const fetchDashboardData = async () => {
            setLoading(true);
            try {
                // 1. Buscar todas as turmas com o nome do criador (professor)
                const { data: classesData, error: classesError } = await supabase
                    .from('classes')
                    .select(`
                        *,
                        profiles:created_by (firstname, lastname)
                    `)
                    .order('created_at', { ascending: false });

                if (classesError) throw classesError;

                // 1.5 Buscar a contagem de alunos matriculados por turma
                const { data: countData, error: countError } = await supabase
                    .from('class_members')
                    .select('class_id');

                if (countError) throw countError;

                const classCounts = countData.reduce((acc, curr) => {
                    acc[curr.class_id] = (acc[curr.class_id] || 0) + 1;
                    return acc;
                }, {});

                const classesWithCount = classesData.map(c => ({
                    ...c,
                    studentCount: classCounts[c.id] || 0
                }));

                // 2. Buscar as matrículas específicas do usuário logado
                const userEnrolledData = countData.filter(m => m.user_id === user?.id);
                const enrolledClassIds = new Set(userEnrolledData.map(m => m.class_id));

                // 3. Separar as turmas matriculadas (ou que ele mesmo criou) do catálogo geral
                const enrolledClasses = classesWithCount.filter(
                    c => enrolledClassIds.has(c.id) || c.created_by === user?.id
                );

                setAllClasses(classesWithCount);
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

    const confirmEnroll = (course) => {
        setEnrollModal({ isOpen: true, course });
    };

    const handleEnroll = async () => {
        if (!enrollModal.course) return;
        setEnrolling(true);
        try {
            const { error } = await supabase
                .from('class_members')
                .insert([{ class_id: enrollModal.course.id, user_id: user.id }]);

            if (error) throw error;

            // Atualizar o estado local sem recarregar tudo
            setMyClasses(prev => [enrollModal.course, ...prev]);
            setLocalTab('my_courses');
            setEnrollModal({ isOpen: false, course: null });

        } catch (error) {
            console.error("Erro ao realizar matrícula:", error.message);
            alert("Não foi possível realizar a matrícula no momento.");
        } finally {
            setEnrolling(false);
        }
    };

    const handleUnenroll = async (course) => {
        if (!window.confirm(`Tem certeza que deseja cancelar sua inscrição na turma ${course.title}?`)) return;
        try {
            const { error } = await supabase
                .from('class_members')
                .delete()
                .eq('class_id', course.id)
                .eq('user_id', user.id);

            if (error) throw error;
            setMyClasses(prev => prev.filter(c => c.id !== course.id));
        } catch (err) {
            console.error(err);
            alert("Erro ao cancelar inscrição.");
        }
    };

    const handleArchiveCourse = async (course) => {
        const isArchiving = !course.is_archived;
        const msg = isArchiving ? `Deseja arquivar a turma "${course.title}"? Alunos não poderão mais acessá-la.` : `Deseja desarquivar a turma "${course.title}"?`;

        if (!window.confirm(msg)) return;

        try {
            const { error } = await supabase
                .from('classes')
                .update({ is_archived: isArchiving })
                .eq('id', course.id);

            if (error) throw error;

            // Força recarregamento completo para evitar falhas de RLS assincrono em cache local
            window.location.reload();

        } catch (err) {
            console.error(err);
            alert("Erro ao arquivar/desarquivar turma.");
        }
    };

    const handleDeleteCourse = async (course) => {
        if (!window.confirm(`ATENÇÃO: Tem certeza que deseja excluir DEFINITIVAMENTE a turma "${course.title}"? Todos os materiais, entregas e matrículas serão perdidos.`)) return;
        try {
            const { error } = await supabase
                .from('classes')
                .delete()
                .eq('id', course.id);

            if (error) throw error;

            window.location.reload();
        } catch (err) {
            console.error(err);
            alert("Erro ao excluir turma. Verifique suas permissões.");
        }
    };

    const isEnrolled = (classId) => {
        const course = allClasses.find(c => c.id === classId);
        // O usuário é considerado "matriculado" (tem acesso) se estiver na lista de myClasses
        // e se não for apenas o criador sem estar efetivamente matriculado (embora o criador tenha acesso).
        // Para a UI, se ele for o criador, ele não precisa se matricular.
        return myClasses.some(c => c.id === classId) || course?.created_by === user?.id;
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
                    onClick={() => setLocalTab('my_courses')}
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
                    onClick={() => setLocalTab('catalog')}
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
                            onClick={() => setLocalTab('catalog')}
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
                            onEnroll={() => confirmEnroll(course)}
                            onUnenroll={handleUnenroll}
                            onDelete={handleDeleteCourse}
                            onArchive={handleArchiveCourse}
                        />
                    ))}
                </div>
            )}

            {/* Modal de Matrícula */}
            {enrollModal.isOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] px-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                        <h2 className="text-xl font-semibold text-gray-800 mb-4">Confirmar Matrícula</h2>
                        <p className="text-gray-600 mb-6">
                            Você tem certeza que deseja participar da turma <strong>{enrollModal.course?.title}</strong>
                            {enrollModal.course?.profiles ? ` com o(a) Prof. ${enrollModal.course.profiles.firstname}` : ''}?
                        </p>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                disabled={enrolling}
                                onClick={() => setEnrollModal({ isOpen: false, course: null })}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none"
                            >
                                Cancelar
                            </button>
                            <button
                                disabled={enrolling}
                                onClick={handleEnroll}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {enrolling ? 'Matriculando...' : 'Confirmar Matrícula'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default Dashboard;