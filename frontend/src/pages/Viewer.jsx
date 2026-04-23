import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/useAuth';
import { ArrowLeft, AlertCircle, FileText, Video, FileSpreadsheet, Presentation, File } from 'lucide-react';
import ActivityComments from '../components/ActivityComments';

const Viewer = () => {
    const { activityId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [activity, setActivity] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchActivityData = async () => {
            setLoading(true);
            try {
                // Busca os dados da atividade específica e garante que o usuário tem acesso à turma
                const { data: activityData, error: activityError } = await supabase
                    .from('class_activities')
                    .select(`
                        *,
                        classes (title)
                    `)
                    .eq('id', activityId)
                    .single();

                if (activityError) {
                    throw new Error("Atividade não encontrada ou você não tem permissão para visualizá-la.");
                }

                // Verificar permissão RLS manual (opcional, o DB RLS já bloqueia no select se bem configurado,
                // mas a query usa JOIN implicito acima via RLS viewable activities)
                if (user.role !== 'admin') {
                    const { error: memberError } = await supabase
                        .from('class_members')
                        .select('id')
                        .eq('class_id', activityData.class_id)
                        .eq('user_id', user.id)
                        .single();

                    if (memberError) {
                        throw new Error("Você não tem permissão para acessar o material desta turma.");
                    }
                }

                // Processar link para tentar versão 'preview' embedável se for link do Drive padrão
                // A maioria dos links gerados pela API v3 já vem prontos (webViewLink) mas podemos garantir:
                let embedLink = activityData.drive_link;
                if (embedLink && embedLink.includes('view?usp=drivesdk')) {
                    embedLink = embedLink.replace('view?usp=drivesdk', 'preview');
                } else if (embedLink && embedLink.includes('/view')) {
                    embedLink = embedLink.replace('/view', '/preview');
                }

                setActivity({ ...activityData, embedLink });

            } catch (err) {
                console.error("Erro ao carregar atividade:", err);
                setError(err.message || "Erro ao carregar o visualizador de aula.");
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            fetchActivityData();
        }
    }, [activityId, user]);

    const getFileBadge = (fileType) => {
        const icons = {
            pdf: <FileText className="w-4 h-4 mr-1 text-red-100" />,
            video: <Video className="w-4 h-4 mr-1 text-blue-100" />,
            xls: <FileSpreadsheet className="w-4 h-4 mr-1 text-green-100" />,
            pptx: <Presentation className="w-4 h-4 mr-1 text-orange-100" />
        };
        const colors = {
            pdf: 'bg-red-500',
            video: 'bg-blue-500',
            xls: 'bg-green-500',
            pptx: 'bg-orange-500'
        };
        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${colors[fileType] || 'bg-gray-500'}`}>
                {icons[fileType] || <File className="w-4 h-4 mr-1 text-gray-100" />}
                {fileType ? fileType.toUpperCase() : 'ARQUIVO'}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[80vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-[80vh] px-4">
                <div className="max-w-lg w-full bg-white text-center p-8 rounded-xl shadow-sm border border-gray-200">
                    <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-8 h-8 text-red-500" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">Ops! Algo deu errado.</h3>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <button
                        onClick={() => navigate(-1)}
                        className="px-6 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors"
                    >
                        Voltar
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto pb-12 flex flex-col gap-6">

            {/* Cabeçalho do Visualizador */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 flex flex-col gap-4">
                <button
                    onClick={() => navigate(`/class/${activity.class_id}`)}
                    className="flex items-center w-fit text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar para {activity.classes?.title || 'a Turma'}
                </button>

                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 leading-tight">
                            {activity.title}
                        </h1>
                        <div className="flex items-center gap-3 mt-2">
                            {getFileBadge(activity.file_type)}
                            <span className="text-sm text-gray-500">
                                Postado em {new Date(activity.created_at).toLocaleDateString('pt-BR')}
                            </span>
                        </div>
                    </div>

                    {/* Botão de fallback caso iframe bloqueie popups ou seja necessário tela cheia nova guia */}
                    {activity.drive_link && (
                        <a
                            href={activity.drive_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors shrink-0"
                        >
                            Abrir no Google Drive
                        </a>
                    )}
                </div>

                {activity.description && (
                    <div className="mt-2 pt-4 border-t border-gray-100">
                        <p className="text-gray-700 text-sm whitespace-pre-wrap">
                            {activity.description}
                        </p>
                    </div>
                )}
            </div>

            {/* Iframe Viewer 100% Responsivo */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden w-full aspect-[4/3] sm:aspect-video flex flex-col">
                {activity.embedLink ? (
                    <iframe
                        src={activity.embedLink}
                        className="w-full h-full border-0 flex-1"
                        allow="autoplay"
                        allowFullScreen
                        title={activity.title}
                    ></iframe>
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 text-gray-500 p-8 text-center">
                        <File className="w-16 h-16 text-gray-300 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Sem material anexado</h3>
                        <p>Esta atividade não possui um arquivo vinculado para visualização.</p>
                    </div>
                )}
            </div>

            {/* Seção de Comentários focada na Aula */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                    <h2 className="text-lg font-medium text-gray-800">Comentários da Aula</h2>
                </div>
                <ActivityComments activityId={activity.id} />
            </div>

        </div>
    );
};

export default Viewer;