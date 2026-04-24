import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Folder, User, MoreVertical } from 'lucide-react';
import { useAuth } from '../context/useAuth';

const CourseCard = ({ course, isEnrolled, onEnroll, onUnenroll, onArchive, onDelete }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);

    // Fechar menu ao clicar fora
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Array de cores para o header (fallback se não houver thumbnail)
    const headerColors = [
        'bg-blue-600', 'bg-green-600', 'bg-purple-600', 'bg-red-600', 'bg-indigo-600', 'bg-teal-600'
    ];

    // Escolhe uma cor baseada no ID do curso para consistência
    const colorIndex = course.id ? course.id.charCodeAt(0) % headerColors.length : 0;
    const fallbackColor = headerColors[colorIndex];

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col h-72 group relative">

            {/* O card inteiro atua como um link se estiver matriculado, ou apenas a parte de cima caso contrário */}
            <Link
                to={isEnrolled ? `/class/${course.id}` : '#'}
                onClick={(e) => {
                    if (!isEnrolled) e.preventDefault();
                }}
                className={`flex-1 flex flex-col relative ${isEnrolled ? 'cursor-pointer' : 'cursor-default'}`}
            >
                {/* Header Superior (Imagem ou Cor) */}
                <div className={`h-28 relative ${!course.thumbnail_url ? fallbackColor : ''}`}>
                    {course.thumbnail_url && (
                        <div className="absolute inset-0">
                            <img
                                src={course.thumbnail_url}
                                alt={course.title}
                                className="w-full h-full object-cover"
                            />
                            {/* Overlay escuro leve para garantir contraste do texto */}
                            <div className="absolute inset-0 bg-black bg-opacity-30"></div>
                        </div>
                    )}

                    {/* Títulos sobrepostos */}
                    <div className="absolute top-0 left-0 p-4 w-full pr-20">
                        <h2 className="text-white text-xl font-medium truncate drop-shadow-md group-hover:underline">
                            {course.title}
                        </h2>
                        {course.category && (
                            <p className="text-white text-sm opacity-90 truncate mt-1">
                                {course.category}
                            </p>
                        )}
                        {course.profiles && (
                            <p className="text-white text-xs opacity-80 truncate mt-0.5 font-medium">
                                Prof. {course.profiles.firstname} {course.profiles.lastname}
                            </p>
                        )}
                    </div>
                </div>

                {/* Corpo do Card (Branco) */}
                <div className="flex-1 bg-white p-4 pt-8 relative">
                    <p className="text-sm text-gray-600 line-clamp-2">
                        {course.description || "Nenhuma descrição fornecida para esta turma."}
                    </p>
                </div>
            </Link>

            {/* Avatar Flutuante do Professor */}
            <div className="absolute top-20 right-4 w-16 h-16 bg-white rounded-full p-1 shadow-md border border-gray-100 z-10">
                <div className="w-full h-full bg-blue-100 rounded-full flex items-center justify-center text-blue-600 overflow-hidden" title={course.profiles ? `${course.profiles.firstname} ${course.profiles.lastname}` : 'Professor'}>
                    {course.profiles && course.profiles.firstname ? (
                        <span className="text-xl font-bold uppercase">{course.profiles.firstname.charAt(0)}</span>
                    ) : (
                        <User className="w-8 h-8" />
                    )}
                </div>
            </div>

            {/* Rodapé e Ações */}
            <div className="h-12 border-t border-gray-100 px-4 flex items-center justify-between bg-white relative z-20">
                <div className="flex items-center gap-3">
                    <div
                        onClick={() => {
                            if (!isEnrolled && user?.id !== course.created_by) return;
                            navigate(`/class/${course.id}`);
                        }}
                        className={`flex items-center text-gray-400 hover:text-gray-600 transition-colors tooltip ${isEnrolled || user?.id === course.created_by ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
                        title="Materiais da turma"
                    >
                        <Folder className="w-5 h-5" />
                    </div>
                    {/* Contador de alunos dinâmico repassado pelo parent se existir */}
                    {course.studentCount !== undefined && (
                        <span className="text-xs text-gray-500 font-medium" title="Alunos matriculados">
                            {course.studentCount} alunos
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {!isEnrolled && user?.id !== course.created_by && (
                        <button
                            onClick={() => onEnroll(course.id)}
                            className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors px-3 py-1 rounded-md hover:bg-blue-50"
                        >
                            Participar
                        </button>
                    )}

                    {/* Kebab Menu (3 pontos) */}
                    {(isEnrolled || user?.id === course.created_by) && (
                        <div className="relative" ref={menuRef}>
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setMenuOpen(!menuOpen);
                                }}
                                className="p-1 rounded-full hover:bg-gray-100 text-gray-500 focus:outline-none focus:bg-gray-200 transition-colors"
                            >
                                <MoreVertical className="w-5 h-5" />
                            </button>

                            {menuOpen && (
                                <div className="absolute right-0 bottom-8 mb-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50">
                                    <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                                        Mover
                                    </button>
                                    <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-100 pb-2 mb-1">
                                        Ocultar
                                    </button>

                                    {/* Opções de Aluno */}
                                    {isEnrolled && user?.id !== course.created_by && (
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                setMenuOpen(false);
                                                if (onUnenroll) onUnenroll(course);
                                            }}
                                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                        >
                                            Cancelar inscrição
                                        </button>
                                    )}

                                    {/* Opções Exclusivas de Professor */}
                                    {user?.id === course.created_by && (
                                        <>
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    setMenuOpen(false);
                                                    if (onArchive) onArchive(course);
                                                }}
                                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                            >
                                                Arquivar turma
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    setMenuOpen(false);
                                                    if (onDelete) onDelete(course);
                                                }}
                                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                            >
                                                Excluir turma
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CourseCard;