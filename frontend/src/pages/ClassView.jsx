import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/useAuth';
import { ArrowLeft, FileText, Video, BarChart, File, AlertCircle, MessageSquare, MoreVertical, Edit2, Trash2 } from 'lucide-react';
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

    // Gestão de Edição (Admin/Prof)
    const [editingActivity, setEditingActivity] = useState(null);
    const [editTitle, setEditTitle] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const [savingEdit, setSavingEdit] = useState(false);

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

                // Verificar permissão de acesso
                if (classDetails.created_by !== user.id) {
                    const { error: memberError } = await supabase
                        .from('class_members')
                        .select('id')
                        .eq('class_id', id)
                        .eq('user_id', user.id)
                        .single();

                    if (memberError && user.role !== 'admin') {
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
            case 'assignment': return <FileText className="w-5 h-5 text-indigo-600" />;
            default: return <File className="w-5 h-5 text-gray-500" />;
        }
    };

    const handleDeleteActivity = async (activityId) => {
        if (!window.confirm("Tem certeza que deseja excluir esta postagem?")) return;

        try {
            const { error } = await supabase
                .from('class_activities')
                .delete()
                .eq('id', activityId);

            if (error) throw error;
            setActivities(prev => prev.filter(a => a.id !== activityId));
        } catch (err) {
            console.error("Erro ao excluir:", err.message);
            alert("Erro ao excluir atividade.");
        }
    };

    const handleSaveEdit = async () => {
        if (!editingActivity) return;
        setSavingEdit(true);

        try {
            const { error } = await supabase
                .from('class_activities')
                .update({ title: editTitle, description: editDesc })
                .eq('id', editingActivity.id);

            if (error) throw error;

            setActivities(prev => prev.map(a =>
                a.id === editingActivity.id
                    ? { ...a, title: editTitle, description: editDesc }
                    : a
            ));

            setEditingActivity(null);
        } catch (err) {
            console.error("Erro ao salvar:", err.message);
            alert("Erro ao atualizar atividade.");
        } finally {
            setSavingEdit(false);
        }
    };

    const startEditing = (activity) => {
        setEditingActivity(activity);
        setEditTitle(activity.title);
        setEditDesc(activity.description || '');
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
                            <div className="p-4 sm:p-6 flex gap-4 relative group">
                                {/* Kebab menu prof */}
                                {user?.role === 'admin' && (
                                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                        <button
                                            onClick={() => startEditing(activity)}
                                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                            title="Editar"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteActivity(activity.id)}
                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                            title="Excluir"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}

                                <div className="mt-1 bg-gray-100 p-3 rounded-full flex-shrink-0 h-min">
                                    {getFileIcon(activity.file_type)}
                                </div>
                                <div className="flex-1 pr-16">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-lg font-medium text-gray-900">
                                                {activity.profiles?.firstname} {activity.file_type === 'announcement' ? 'publicou um aviso' : activity.file_type === 'assignment' ? 'postou uma nova tarefa' : 'postou um novo material'}: {activity.title}
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
                                            {activity.description.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
                                                part.match(/^https?:\/\//)
                                                    ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">{part}</a>
                                                    : part
                                            )}
                                        </p>
                                    )}

                                    {/* Link do Material */}
                                    {activity.drive_link && (
                                        <div
                                            onClick={() => {
                                                if (activity.file_type === 'office') {
                                                    if (user?.role === 'student') supabase.from('material_views').insert([{ activity_id: activity.id, user_id: user.id }]).select().then();
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

            {/* Modal de Edição */}
            {editingActivity && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] px-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
                        <h2 className="text-xl font-semibold text-gray-800 mb-4">Editar Postagem</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                                <input
                                    type="text"
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                                <textarea
                                    rows="4"
                                    value={editDesc}
                                    onChange={(e) => setEditDesc(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                            <button
                                disabled={savingEdit}
                                onClick={() => setEditingActivity(null)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none"
                            >
                                Cancelar
                            </button>
                            <button
                                disabled={savingEdit}
                                onClick={handleSaveEdit}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {savingEdit ? 'Salvando...' : 'Salvar Alterações'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClassView;