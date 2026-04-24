import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/useAuth';
import { Camera, Save, CheckCircle2 } from 'lucide-react';

const Settings = () => {
    const { user } = useAuth();

    const [firstname, setFirstname] = useState(user?.firstname || '');
    const [lastname, setLastname] = useState(user?.lastname || '');
    const [bio, setBio] = useState(user?.bio || '');
    const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');

    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState(null);

    // Sincronizar o estado local de forma segura na montagem e mudança de user (State Derivation Pattern)
    const [prevUser, setPrevUser] = useState(user);
    if (user && user !== prevUser) {
        setPrevUser(user);
        setFirstname(user.firstname || '');
        setLastname(user.lastname || '');
        setBio(user.bio || '');
        setAvatarUrl(user.avatar_url || '');
    }

    const handleUploadAvatar = async (event) => {
        try {
            setUploading(true);
            setMessage(null);

            if (!event.target.files || event.target.files.length === 0) {
                throw new Error('Selecione uma imagem para fazer upload.');
            }

            const file = event.target.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}-${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            // Tratativa para erro: Criação proativa de bucket caso não exista e falhe o preflight.
            let { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) {
                // Caso falhe por bucket not found, tentamos a criação (para garantir em setups novos/limpos)
                if (uploadError.message.includes('bucket') || uploadError.statusCode === '404' || uploadError.message.includes('not found')) {
                    const { error: bucketError } = await supabase.storage.createBucket('avatars', { public: true });
                    if (bucketError && !bucketError.message.includes('already exists')) {
                        throw new Error(`Erro ao configurar servidor de imagens: ${bucketError.message}. Configure o bucket no painel.`);
                    }
                    // Tenta subir novamente após criar o bucket
                    const { error: retryError } = await supabase.storage.from('avatars').upload(filePath, file);
                    if (retryError) throw retryError;
                } else {
                     throw uploadError;
                }
            }

            // Obter URL pública
            const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
            const publicUrl = data.publicUrl;

            // Salvar no perfil
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', user.id);

            if (updateError) throw updateError;

            setAvatarUrl(publicUrl);

            // Força a recarga para atualizar o layout header (que ouve a sessão ou refresh).
            // O usoAuth não é state global complexo, um refresh forçado resolve a exibição no Navbar
            window.location.reload();

        } catch (error) {
            alert(error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            const updates = {
                firstname,
                lastname,
                bio,
            };

            const { error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', user.id);

            if (error) throw error;

            setMessage('Perfil atualizado com sucesso!');
            setTimeout(() => setMessage(null), 3000);

        } catch (error) {
            console.error('Erro ao atualizar perfil:', error);
            alert('Falha ao atualizar o perfil.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto py-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Configurações de Perfil</h1>

            {message && (
                <div className="mb-6 bg-green-50 text-green-700 p-4 rounded-md flex items-center border border-green-200">
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    {message}
                </div>
            )}

            <div className="bg-white p-6 sm:p-8 rounded-lg border border-gray-200 shadow-sm mb-8">
                <h2 className="text-xl font-semibold text-gray-800 mb-6">Foto de Perfil</h2>

                <div className="flex items-center gap-6">
                    <div className="relative">
                        <div className="w-24 h-24 rounded-full bg-gray-200 border-2 border-gray-100 overflow-hidden flex items-center justify-center shadow-inner">
                            {avatarUrl ? (
                                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-3xl font-medium text-gray-500 uppercase">
                                    {firstname ? firstname.charAt(0) : '?'}
                                </span>
                            )}
                        </div>
                        <label
                            className={`absolute bottom-0 right-0 p-1.5 rounded-full bg-blue-600 text-white shadow-md cursor-pointer hover:bg-blue-700 transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
                        >
                            <Camera className="w-4 h-4" />
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleUploadAvatar}
                                disabled={uploading}
                            />
                        </label>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-700">Alterar Imagem</p>
                        <p className="text-xs text-gray-500 mt-1">Recomendado: 256x256px (JPG ou PNG).</p>
                        {uploading && <p className="text-xs text-blue-600 mt-2 font-medium">Enviando...</p>}
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-lg border border-gray-200 shadow-sm">
                <h2 className="text-xl font-semibold text-gray-800 mb-6">Informações Pessoais</h2>

                <form onSubmit={handleSaveProfile} className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                            <input
                                type="text"
                                required
                                value={firstname}
                                onChange={(e) => setFirstname(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Sobrenome</label>
                            <input
                                type="text"
                                value={lastname}
                                onChange={(e) => setLastname(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Informações Úteis / Biografia</label>
                        <textarea
                            rows="4"
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Conte um pouco sobre você (seus horários de atendimento, especialidades...)"
                        />
                    </div>

                    <div className="pt-4 border-t border-gray-100 flex justify-end">
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors flex items-center disabled:opacity-70"
                        >
                            {loading ? 'Salvando...' : (
                                <>
                                    <Save className="w-4 h-4 mr-2" />
                                    Salvar Alterações
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Settings;