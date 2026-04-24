import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Upload, CheckCircle2 } from 'lucide-react';

const Admin = () => {
    // Tab de navegação no painel (Criar Turma vs Postar Material vs Relatórios)
    const [activeTab, setActiveTab] = useState('class');

    // States: Criar Turma
    const [classTitle, setClassTitle] = useState('');
    const [classDesc, setClassDesc] = useState('');
    const [classCategory, setClassCategory] = useState('');
    const [classImage, setClassImage] = useState('');
    const [classLoading, setClassLoading] = useState(false);

    // States: Postar Material
    const [myClasses, setMyClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [matTitle, setMatTitle] = useState('');
    const [matDesc, setMatDesc] = useState('');
    const [matLink, setMatLink] = useState(''); // Novo campo de link
    const [matType, setMatType] = useState('pdf'); // Mantido por compatibilidade
    const [matLoading, setMatLoading] = useState(false);
    const [linkError, setLinkError] = useState(''); // Erro de validação de link

    // States: Analytics/Relatórios
    const [analytics, setAnalytics] = useState({ totalStudents: 0, totalSubmissions: 0, topMaterials: [] });
    const [loadingAnalytics, setLoadingAnalytics] = useState(false);

    // Mensagens de Sucesso
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        // Busca as turmas que o admin criou
        const fetchClasses = async () => {
            const { data, error } = await supabase
                .from('classes')
                .select('id, title')
                .order('title');

            if (!error && data) {
                setMyClasses(data);
                if (data.length > 0) setSelectedClass(data[0].id);
            }
        };
        fetchClasses();
    }, []);

    useEffect(() => {
        const fetchAnalytics = async () => {
            setLoadingAnalytics(true);
            try {
                // Alunos totais do professor
            const { count: totalStudents } = await supabase.from('class_members')
                .select('id', { count: 'exact' })
                .in('class_id', myClasses.map(c => c.id));

            // Total de Entregas recebidas
            const { data: subsData } = await supabase.from('class_submissions')
                .select('id, class_activities!inner(class_id)')
                .in('class_activities.class_id', myClasses.map(c => c.id));

            // Views para achar o TOP material
            const { data: viewsData } = await supabase.from('material_views')
                .select('activity_id, class_activities!inner(title, class_id)')
                .in('class_activities.class_id', myClasses.map(c => c.id));

            const viewCounts = {};
            if (viewsData) {
                viewsData.forEach(v => {
                    const id = v.activity_id;
                    if (!viewCounts[id]) viewCounts[id] = { title: v.class_activities.title, views: 0 };
                    viewCounts[id].views += 1;
                });
            }

            const topMaterials = Object.values(viewCounts).sort((a, b) => b.views - a.views).slice(0, 5);

                setAnalytics({
                    totalStudents: totalStudents || 0,
                    totalSubmissions: subsData ? subsData.length : 0,
                    topMaterials
                });

            } catch (error) {
                console.error("Erro analytics", error);
            } finally {
                setLoadingAnalytics(false);
            }
        };

        if (activeTab === 'reports' && myClasses.length > 0) {
             fetchAnalytics();
        }
    }, [activeTab, myClasses]);

    const showSuccess = (msg) => {
        setSuccessMessage(msg);
        setTimeout(() => setSuccessMessage(''), 3000);
    };

    const handleCreateClass = async (e) => {
        e.preventDefault();
        setClassLoading(true);

        try {
            const { data: userData } = await supabase.auth.getUser();
            const { error } = await supabase.from('classes').insert([
                {
                    title: classTitle,
                    description: classDesc,
                    category: classCategory,
                    thumbnail_url: classImage,
                    created_by: userData.user.id
                }
            ]);

            if (error) throw error;

            showSuccess('Turma criada com sucesso!');
            setClassTitle('');
            setClassDesc('');
            setClassCategory('');
            setClassImage('');

        } catch (error) {
            console.error("Erro ao criar turma:", error.message);
            alert("Erro ao criar turma: " + error.message);
        } finally {
            setClassLoading(false);
        }
    };

    const validateLink = (url) => {
        if (!url) return null; // Link é opcional no schema, mas se tiver, valida.

        const lowerUrl = url.toLowerCase();

        if (lowerUrl.includes('drive.google.com')) return 'drive';
        if (lowerUrl.includes('youtube.com/watch') || lowerUrl.includes('youtu.be/') || lowerUrl.includes('youtube.com/shorts/')) return 'video';
        if (lowerUrl.includes('onedrive.live.com') || lowerUrl.includes('sharepoint.com') || lowerUrl.includes('canva.com')) return 'office';

        return 'invalid';
    };

    const handlePostMaterial = async (e) => {
        e.preventDefault();
        setLinkError('');
        setMatLoading(true);

        try {
            // Valida o link antes de enviar
            let finalFileType = matType; // fallback
            let finalLink = matLink.trim() !== '' ? matLink : null;

            if (finalLink) {
                const detectedType = validateLink(finalLink);
                if (detectedType === 'invalid') {
                    setLinkError("Link inválido. Use links do Google Drive, YouTube, Microsoft Office 365 ou Canva.");
                    setMatLoading(false);
                    return;
                }
                finalFileType = detectedType; // "drive", "video" ou "office"
            }

            const { data: userData } = await supabase.auth.getUser();

            // Salva a atividade no banco
            const { error: dbError } = await supabase.from('class_activities').insert([
                {
                    class_id: selectedClass,
                    title: matTitle,
                    description: matDesc,
                    file_type: finalFileType,
                    drive_link: finalLink, // reaproveitamos a coluna drive_link para salvar qualquer url
                    created_by: userData.user.id
                }
            ]);

            if (dbError) throw dbError;

            showSuccess('Material postado com sucesso no Mural!');
            setMatTitle('');
            setMatDesc('');
            setMatLink('');

        } catch (error) {
            console.error("Erro ao postar material:", error.message);
            alert("Erro ao postar material: " + error.message);
        } finally {
            setMatLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto py-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Painel do Professor</h1>

            {successMessage && (
                <div className="mb-6 bg-green-50 text-green-700 p-4 rounded-md flex items-center border border-green-200">
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    {successMessage}
                </div>
            )}

            {/* Tabs */}
            <div className="flex border-b border-gray-200 mb-8">
                <button
                    className={`pb-4 px-4 text-sm font-medium transition-colors relative ${
                        activeTab === 'class' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
                    }`}
                    onClick={() => setActiveTab('class')}
                >
                    Criar Nova Turma
                    {activeTab === 'class' && (
                        <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-md"></span>
                    )}
                </button>
                <button
                    className={`pb-4 px-4 text-sm font-medium transition-colors relative ${
                        activeTab === 'material' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
                    }`}
                    onClick={() => setActiveTab('material')}
                >
                    Postar Material
                    {activeTab === 'material' && (
                        <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-md"></span>
                    )}
                </button>
                <button
                    className={`pb-4 px-4 text-sm font-medium transition-colors relative ${
                        activeTab === 'reports' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
                    }`}
                    onClick={() => setActiveTab('reports')}
                >
                    Relatórios
                    {activeTab === 'reports' && (
                        <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-md"></span>
                    )}
                </button>
            </div>

            {/* Form: Criar Turma */}
            {activeTab === 'class' && (
                <div className="bg-white p-6 sm:p-8 rounded-lg border border-gray-200 shadow-sm">
                    <form onSubmit={handleCreateClass} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Título da Turma *</label>
                            <input
                                type="text"
                                required
                                value={classTitle}
                                onChange={(e) => setClassTitle(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Ex: Matemática Avançada"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                            <textarea
                                rows="3"
                                value={classDesc}
                                onChange={(e) => setClassDesc(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Uma breve descrição sobre a turma..."
                            />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                                <input
                                    type="text"
                                    value={classCategory}
                                    onChange={(e) => setClassCategory(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Ex: Exatas"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">URL da Imagem de Capa</label>
                                <input
                                    type="url"
                                    value={classImage}
                                    onChange={(e) => setClassImage(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="https://exemplo.com/imagem.jpg"
                                />
                            </div>
                        </div>

                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={classLoading}
                                className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center"
                            >
                                {classLoading ? 'Criando...' : (
                                    <>
                                        <Plus className="w-5 h-5 mr-2" />
                                        Criar Turma
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Form: Postar Material */}
            {activeTab === 'material' && (
                <div className="bg-white p-6 sm:p-8 rounded-lg border border-gray-200 shadow-sm">
                    {myClasses.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            Você precisa criar uma turma antes de postar materiais.
                        </div>
                    ) : (
                        <form onSubmit={handlePostMaterial} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Selecione a Turma *</label>
                                <select
                                    required
                                    value={selectedClass}
                                    onChange={(e) => setSelectedClass(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white"
                                >
                                    {myClasses.map(c => (
                                        <option key={c.id} value={c.id}>{c.title}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Título da Atividade/Material *</label>
                                <input
                                    type="text"
                                    required
                                    value={matTitle}
                                    onChange={(e) => setMatTitle(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Ex: Aula 01 - Introdução"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição / Instruções</label>
                                <textarea
                                    rows="3"
                                    value={matDesc}
                                    onChange={(e) => setMatDesc(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Mensagem para o mural..."
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Postagem</label>
                                    <select
                                        value={matType}
                                        onChange={(e) => {
                                            setMatType(e.target.value);
                                            if (e.target.value === 'announcement') setMatLink('');
                                        }}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white"
                                    >
                                        <option value="pdf">Material de Aula</option>
                                        <option value="assignment">Atividade/Tarefa (Recebe Entregas)</option>
                                        <option value="announcement">Aviso Geral (Sem Link)</option>
                                    </select>
                                </div>

                                {matType !== 'announcement' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Link do Material</label>
                                        <input
                                            type="url"
                                            value={matLink}
                                            onChange={(e) => setMatLink(e.target.value)}
                                            className={`w-full px-4 py-2 border ${linkError ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-blue-500 focus:border-blue-500`}
                                            placeholder="https://..."
                                        />
                                        {linkError ? (
                                            <p className="mt-1 text-xs text-red-600 font-medium">
                                                {linkError}
                                            </p>
                                        ) : (
                                            <p className="mt-1 text-xs text-gray-500">
                                                Cole um link do Google Drive, YouTube, Microsoft Office 365 ou Canva.
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={matLoading}
                                    className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center"
                                >
                                    {matLoading ? 'Enviando...' : (
                                        <>
                                            <Upload className="w-5 h-5 mr-2" />
                                            Postar no Mural
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            )}

            {/* Form: Relatórios */}
            {activeTab === 'reports' && (
                <div className="space-y-6">
                    {loadingAnalytics ? (
                        <div className="text-center py-10 text-gray-500">Carregando dados...</div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm flex flex-col items-center justify-center">
                                    <p className="text-gray-500 text-sm font-medium uppercase tracking-wide">Total de Alunos Matriculados</p>
                                    <h3 className="text-4xl font-bold text-blue-600 mt-2">{analytics.totalStudents}</h3>
                                </div>
                                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm flex flex-col items-center justify-center">
                                    <p className="text-gray-500 text-sm font-medium uppercase tracking-wide">Tarefas Entregues</p>
                                    <h3 className="text-4xl font-bold text-green-600 mt-2">{analytics.totalSubmissions}</h3>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                                <h3 className="text-lg font-medium text-gray-800 mb-4">Materiais Mais Acessados</h3>
                                {analytics.topMaterials.length === 0 ? (
                                    <p className="text-sm text-gray-500 italic">Nenhum dado de visualização registrado ainda.</p>
                                ) : (
                                    <ul className="divide-y divide-gray-100">
                                        {analytics.topMaterials.map((item, idx) => (
                                            <li key={idx} className="py-3 flex justify-between">
                                                <span className="text-gray-800">{item.title}</span>
                                                <span className="font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full text-xs">{item.views} visualizações</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default Admin;