import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/useAuth';
import { Send, User } from 'lucide-react';

const ActivityComments = ({ activityId }) => {
    const { user } = useAuth();
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const fetchComments = async () => {
            try {
                const { data, error } = await supabase
                    .from('activity_comments')
                    .select(`
                        id,
                        content,
                        created_at,
                        profiles (firstname, lastname)
                    `)
                    .eq('activity_id', activityId)
                    .order('created_at', { ascending: true });

                if (error) throw error;
                setComments(data || []);
            } catch (err) {
                console.error("Erro ao carregar comentários:", err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchComments();

        // Configuração opcional: Realtime para comentários
        const channel = supabase.channel(`comments-${activityId}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'activity_comments', filter: `activity_id=eq.${activityId}` },
                () => {
                    // Recarregar comentários (ou inserir otimisticamente)
                    fetchComments();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [activityId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newComment.trim() || submitting) return;

        setSubmitting(true);
        try {
            const { error } = await supabase
                .from('activity_comments')
                .insert([
                    {
                        activity_id: activityId,
                        user_id: user.id,
                        content: newComment.trim()
                    }
                ]);

            if (error) throw error;
            setNewComment('');
        } catch (err) {
            console.error("Erro ao enviar comentário:", err.message);
            alert("Não foi possível enviar o comentário.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <div className="p-4 text-center text-sm text-gray-500">Carregando comentários...</div>;
    }

    return (
        <div className="bg-white p-4 sm:p-6">
            {/* Lista de Comentários */}
            <div className="space-y-4 mb-6">
                {comments.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">Nenhum comentário ainda. Seja o primeiro a comentar!</p>
                ) : (
                    comments.map(comment => (
                        <div key={comment.id} className="flex gap-3">
                            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                                <User className="w-4 h-4" />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-sm font-medium text-gray-900">
                                        {comment.profiles?.firstname} {comment.profiles?.lastname}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                        {new Date(comment.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">
                                    {comment.content}
                                </p>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Input de Novo Comentário */}
            <form onSubmit={handleSubmit} className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 hidden sm:flex">
                    <User className="w-4 h-4" />
                </div>
                <div className="flex-1 relative">
                    <input
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Adicionar comentário à turma..."
                        className="w-full pl-4 pr-12 py-2 border border-gray-300 rounded-full focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
                        disabled={submitting}
                    />
                    <button
                        type="submit"
                        disabled={!newComment.trim() || submitting}
                        className="absolute right-2 top-1.5 p-1 rounded-full text-blue-600 hover:bg-blue-50 disabled:text-gray-400 disabled:hover:bg-transparent transition-colors"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ActivityComments;