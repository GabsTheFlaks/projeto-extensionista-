import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/useAuth';
import { ArrowLeft, FileText, Video, BarChart, File, AlertCircle, MessageSquare } from 'lucide-react';
import ActivityComments from '../components/ActivityComments';

const ClassView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [classData, setClassData] = useState(null);
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [expandedActivity, setExpandedActivity] = useState(null);

    useEffect(() => {
        const fetchClassData = async () => {
            setLoading(true);
            try {
                // 1. Verificar permissão de acesso (RLS deve cuidar disso, mas fazemos a chamada direta)
                const { data: classDetails, error: classError } = await supabase
                    .from('classes')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (classError) throw classError;

                // Verificar se é aluno matriculado ou admin
                if (user.role !== 'admin') {
                    const { error: memberError } = await supabase
                        .from('class_members')
                        .select('id')
                        .eq('class_id', id)
                        .eq('user_id', user.id)
                        .single();

                    if (memberError) {
                        throw new Error("Você não tem permissão para acessar esta turma.");
                    }
                }

                setClassData(classDetails);

                // 2. Buscar atividades do mural
                const { data: activitiesData, error: activitiesError } = await supabase
                    .from('class_activities')
                    .select(`
                        *,
                        profiles (firstname, lastname)
                    `)
                    .eq('class_id', id)
                    .order('created_at', { ascending: false });

                if (activitiesError) throw activitiesError;
                setActivities(activitiesData);

            } catch (err) {
                console.error("Erro ao carregar turma:", err);
                setError(err.message || "Erro ao carregar os dados da turma.");
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            fetchClassData();
        }
    }, [id, user]);

    const getFileIcon = (fileType) => {
        switch(fileType) {
            case 'drive': return <FileText className="w-5 h-5 text-blue-600" />;
            case 'video': return <Video className="w-5 h-5 text-red-600" />;
            case 'office': return <BarChart className="w-5 h-5 text-green-600" />;
            case 'announcement': return <MessageSquare className="w-5 h-5 text-purple-600" />;
            default: return <File className="w-5 h-5 text-gray-500" />;
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-4xl mx-auto mt-8 bg-red-50 text-red-600 p-6 rounded-lg text-center border border-red-200">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
                <h3 className="text-lg font-medium mb-2">Acesso Negado ou Erro</h3>
                <p className="mb-4">{error}</p>
                <button
                    onClick={() => navigate('/dashboard')}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                >
                    Voltar ao Dashboard
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto pb-12">
            {/* Botão Voltar */}
            <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center text-gray-500 hover:text-gray-800 mb-6 transition-colors"
            >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
            </button>

            {/* Cabeçalho da Turma (Capa) */}
            <div className="bg-blue-600 rounded-2xl h-48 sm:h-64 relative overflow-hidden mb-8 shadow-sm">
                {classData.thumbnail_url && (
                    <img
                        src={classData.thumbnail_url}
                        alt={classData.title}
                        className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-overlay"
                    />
                )}
                <div className="absolute bottom-0 left-0 p-6 sm:p-8 w-full">
                    <h1 className="text-3xl sm:text-4xl font-semibold text-white drop-shadow-md">
                        {classData.title}
                    </h1>
                    {classData.category && (
                        <p className="text-blue-100 mt-2 text-lg drop-shadow">
                            {classData.category}
                        </p>
                    )}
                </div>
            </div>

            {/* Mural (Feed de Atividades) */}
            <div className="space-y-6">
                {activities.length === 0 ? (
                    <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-gray-500">
                        Nenhuma atividade postada ainda nesta turma.
                    </div>
                ) : (
                    activities.map((activity) => (
                        <div key={activity.id} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                            {/* Cabeçalho da Atividade */}
                            <div className="p-4 sm:p-6 flex gap-4">
                                <div className="mt-1 bg-gray-100 p-3 rounded-full flex-shrink-0 h-min">
                                    {getFileIcon(activity.file_type)}
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-lg font-medium text-gray-900">
                                                {activity.profiles?.firstname} {activity.file_type === 'announcement' ? 'publicou um aviso' : 'postou um novo material'}: {activity.title}
                                            </h3>
                                            <p className="text-sm text-gray-500 mt-1">
                                                {new Date(activity.created_at).toLocaleDateString('pt-BR', {
                                                    day: 'numeric', month: 'short', year: 'numeric'
                                                })}
                                            </p>
                                        </div>
                                    </div>

                                    {activity.description && (
                                        <p className="mt-4 text-gray-700 whitespace-pre-wrap text-sm">
                                            {activity.description}
                                        </p>
                                    )}

                                    {/* Link do Material */}
                                    {activity.drive_link && (
                                        <div
                                            onClick={() => {
                                                if (activity.file_type === 'office') {
                                                    window.open(activity.drive_link, "_blank", "noopener,noreferrer");
                                                } else {
                                                    navigate(`/activity/${activity.id}`);
                                                }
                                            }}
                                            className="mt-6 border border-gray-200 rounded-md overflow-hidden max-w-sm flex cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all group"
                                        >
                                            <div className="bg-gray-50 border-r border-gray-200 p-4 flex items-center justify-center w-20 group-hover:bg-blue-50 transition-colors">
                                                {getFileIcon(activity.file_type)}
                                            </div>
                                            <div className="p-4 flex flex-col justify-center flex-1 min-w-0 bg-white">
                                                <p className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                                                    {activity.title}
                                                </p>
                                                <p className="text-xs text-gray-500 uppercase mt-1">
                                                    {activity.file_type === 'office' ? 'ABRIR EXTERNO' : 'VISUALIZAR'}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Separador e Botão de Comentários */}
                            <div className="border-t border-gray-100 px-6 py-3 bg-gray-50 flex justify-between items-center">
                                <button
                                    onClick={() => setExpandedActivity(expandedActivity === activity.id ? null : activity.id)}
                                    className="text-sm font-medium text-gray-600 hover:text-gray-900"
                                >
                                    {expandedActivity === activity.id ? 'Ocultar comentários' : 'Ver comentários da turma'}
                                </button>
                            </div>

                            {/* Seção de Comentários Embutida */}
                            {expandedActivity === activity.id && (
                                <div className="border-t border-gray-200">
                                    <ActivityComments activityId={activity.id} />
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default ClassView;