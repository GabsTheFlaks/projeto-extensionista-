import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Upload, CheckCircle2 } from 'lucide-react';

const Admin = () => {
    // Tab de navegação no painel (Criar Turma vs Postar Material)
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

    // Mensagens de Sucesso
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        // Busca as turmas que o admin criou ou todas as turmas
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
    }, [activeTab]);

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

const handlePostMaterial = async (e) => {
  e.preventDefault();
  if (!matFile) return alert("Selecione um arquivo!");

  try {
    setMatLoading(true);
    console.log("1. Solicitando link de upload para o Supabase...");

    // Passo 1: Pede a URL de upload à Edge Function (só metadados, sem o arquivo)
    // O JWT do usuário é enviado automaticamente pelo supabase.functions.invoke

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://localhost:54321';
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

    const response = await fetch(`${supabaseUrl}/functions/v1/drive-upload`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${anonKey}`,
            'X-User-Token': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            title: matFile.name,
            mimeType: matFile.type || "application/octet-stream",
            size: matFile.size,
        })
    });

    let data;
    try {
        data = await response.json();
    } catch {
        data = { error: "Erro ao ler a resposta do servidor." };
    }

    if (!response.ok) throw new Error(`Erro na autorização: ${data.error || response.statusText}`);
    if (!data?.uploadUrl) throw new Error("A URL de upload não foi gerada.");

    console.log("2. Link recebido! Enviando arquivo direto para o Google...");

    // Passo 2: Envia o arquivo DIRETAMENTE para o Google Drive (não passa pela Edge Function)
    const uploadRes = await fetch(data.uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": matFile.type || "application/octet-stream",
        "Content-Length": String(matFile.size),
      },
      body: matFile,
    });

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      console.error("Resposta do Google Drive:", err);
      throw new Error("O Google Drive recusou o arquivo durante o envio.");
    }

    // Captura o fileId e o link gerados pelo Google Drive
    const uploadData = await uploadRes.json();
    const fileId = uploadData.id;
    const driveLink = uploadData.webViewLink;

    console.log("3. Upload concluído!", { fileId, driveLink });

    // ─── Continue aqui salvando no Supabase se necessário ───
    const { data: userData } = await supabase.auth.getUser();
    const { error: dbError } = await supabase.from('class_activities').insert([
        {
            class_id: selectedClass,
            title: matTitle,
            description: matDesc,
            file_type: matType,
            drive_link: driveLink,
            created_by: userData.user.id
        }
    ]);

    if (dbError) throw dbError;

    showSuccess("Material enviado com sucesso para o Drive!");
    setMatTitle('');
    setMatDesc('');
    setMatFile(null);

  } catch (err) {
    console.error("Erro ao postar material:", err);
    alert(`Erro ao postar material: ${err.message}`);
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
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Arquivo</label>
                                    <select
                                        value={matType}
                                        onChange={(e) => setMatType(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white"
                                    >
                                        <option value="pdf">PDF</option>
                                        <option value="video">Vídeo</option>
                                        <option value="doc">Documento de Texto</option>
                                        <option value="xls">Planilha</option>
                                        <option value="pptx">Apresentação</option>
                                    </select>
                                </div>

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
                                            Cole um link do Google Drive, YouTube, Microsoft Office 365 ou Canva. Links de outros serviços não são aceitos.
                                        </p>
                                    )}
                                </div>
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
        </div>
    );
};

export default Admin;
