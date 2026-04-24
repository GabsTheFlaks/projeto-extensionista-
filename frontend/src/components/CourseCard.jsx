import React from 'react';
import { Link } from 'react-router-dom';
import { Folder, User } from 'lucide-react';

const CourseCard = ({ course, isEnrolled, onEnroll }) => {
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
                <div className="flex items-center text-gray-400 hover:text-gray-600 cursor-pointer transition-colors tooltip" title="Arquivos da turma">
                    <Folder className="w-5 h-5" />
                </div>

                {!isEnrolled && (
                    <button
                        onClick={() => onEnroll(course.id)}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors px-3 py-1 rounded-md hover:bg-blue-50"
                    >
                        Participar
                    </button>
                )}
                {isEnrolled && (
                    <span className="text-xs text-green-600 font-medium px-2 py-1 bg-green-50 rounded-full">
                        Matriculado
                    </span>
                )}
            </div>
        </div>
    );
};

export default CourseCard;