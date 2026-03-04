"use client";

import React, { useEffect, useState } from 'react';
import { getExamById } from '../../actions/examActions';
import { BookOpen, CheckCircle2, XCircle, BarChart2, Calendar, LayoutDashboard, Share2, Lightbulb, Download } from 'lucide-react';
import Link from 'next/link';

interface Question {
    id: number;
    part: number;
    topic: string;
    question: string;
    options: string[];
    correctOption: string;
    explanation: string;
    imagePrompts?: string[];
    possibleAnswers?: string[];
    tips?: string;
}

interface ExamPart {
    part: number;
    title: string;
    instructions: string;
    content: string;
}

export default function SharedExamPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = React.use(params);
    const [dbRecord, setDbRecord] = useState<any>(null);
    const [examData, setExamData] = useState<any>(null);
    const [examParts, setExamParts] = useState<ExamPart[]>([]);
    const [examQuestions, setExamQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Reused parsing logic for robustness
    const parseExamData = (activeExamData: string) => {
        try {
            const rawData = typeof activeExamData === 'string' ? JSON.parse(activeExamData) : activeExamData;
            let data: any;
            let processedData = rawData;

            if (processedData && typeof processedData === 'object' && processedData.content) {
                processedData = typeof processedData.content === 'string' ? JSON.parse(processedData.content) : processedData.content;
            }

            const knownArrayKeys = ['parts', 'exam', 'tasks', 'writingTasks', 'questions', 'sections'];
            if (processedData && typeof processedData === 'object' && !Array.isArray(processedData)) {
                const keys = Object.keys(processedData);
                if (keys.length === 1 && !knownArrayKeys.includes(keys[0])) {
                    const key = keys[0];
                    if (typeof processedData[key] === 'object') {
                        processedData = processedData[key];
                    }
                } else if (keys.length === 2 && keys.includes('examTitle')) {
                    const otherKey = keys.find(k => k !== 'examTitle');
                    if (otherKey && typeof processedData[otherKey] === 'object') {
                        processedData = processedData[otherKey];
                    }
                }
            }

            if (Array.isArray(processedData)) {
                data = processedData;
            } else if (processedData?.parts && Array.isArray(processedData.parts)) {
                data = processedData.parts;
            } else if (processedData?.exam && Array.isArray(processedData.exam)) {
                data = processedData.exam;
            } else if (processedData?.tasks && Array.isArray(processedData.tasks)) {
                data = processedData.tasks;
            } else if (processedData?.sections && Array.isArray(processedData.sections)) {
                data = processedData.sections;
            } else if (processedData?.writingTasks && Array.isArray(processedData.writingTasks)) {
                data = processedData.writingTasks;
            } else if (processedData?.title && (processedData?.content || processedData?.text || processedData?.instructions || processedData?.prompt)) {
                data = [processedData];
            } else {
                const values = processedData && typeof processedData === 'object' ? Object.values(processedData) : [];
                const flattenedValues = values.flat();
                const looksLikeParts = flattenedValues.length > 0 && flattenedValues.every((v: any) => v && typeof v === 'object' && (v.title || v.questions || v.content || v.text));
                if (looksLikeParts) {
                    data = flattenedValues;
                } else {
                    for (const key of Object.keys(processedData || {})) {
                        if (Array.isArray(processedData[key]) && processedData[key].length > 0 && typeof processedData[key][0] === 'object') {
                            data = processedData[key];
                            break;
                        }
                    }
                    if (!data) data = processedData;
                }
            }

            const partsArray = Array.isArray(data) ? data : [data];
            const allParts: ExamPart[] = [];
            const allQuestions: Question[] = [];
            let questionIdCounter = 1;

            partsArray.forEach((item: any, index: number) => {
                let partData = item;
                if (partData && !partData.title && !partData.questions && typeof partData === 'object' && Object.keys(partData).length === 1) {
                    const key = Object.keys(partData)[0];
                    if (partData[key] && typeof partData[key] === 'object') partData = partData[key];
                }

                let rawContent = partData?.content || partData?.text || partData?.instructions || partData?.prompt || partData?.description || partData?.scenario || '';
                let partContent: string;

                if (typeof rawContent === 'string') {
                    partContent = rawContent;
                } else if (Array.isArray(rawContent)) {
                    partContent = rawContent.map((item: any) => {
                        if (typeof item === 'string') return item;
                        if (item?.speaker && item?.transcript) return `${item.speaker}: ${item.transcript}`;
                        if (item?.speaker && item?.text) return `${item.speaker}: ${item.text}`;
                        if (item?.text) return item.text;
                        return JSON.stringify(item);
                    }).join('\n');
                } else if (typeof rawContent === 'object' && rawContent !== null) {
                    if (rawContent.speaker && rawContent.transcript) {
                        partContent = `${rawContent.speaker}: ${rawContent.transcript}`;
                    } else {
                        const keys = Object.keys(rawContent);
                        const looksLabeled = keys.every(k => /^[A-Z]$/i.test(k) || /^(Writer|Text|Section)\s*[A-Z]$/i.test(k));
                        if (looksLabeled && keys.length > 0) {
                            partContent = keys.map(k => `${k}:\n${rawContent[k]}`).join('\n\n');
                        } else {
                            partContent = JSON.stringify(rawContent);
                        }
                    }
                } else {
                    partContent = String(rawContent || '');
                }

                let questionsArray: any[] = [];
                if (Array.isArray(partData?.questions)) {
                    questionsArray = partData.questions;
                } else if (partData?.questions && typeof partData.questions === 'object') {
                    questionsArray = [partData.questions];
                } else if (Array.isArray(partData?.task)) {
                    questionsArray = partData.task;
                } else if (partData?.task && typeof partData.task === 'object') {
                    questionsArray = [partData.task];
                } else if (partData?.question && typeof partData.question === 'string') {
                    questionsArray = [{ question: partData.question, options: partData.options || [], correctOption: partData.correctOption, explanation: partData.explanation }];
                }

                if (questionsArray.length === 0 && partData?.title && partContent) {
                    questionsArray = [{ question: partData.title, options: [] }];
                }

                const partNumber = index + 1;
                const cleanedTitle = (partData?.title || partData?.partTitle || partData?.name || `Part ${partNumber}`).replace(/^Part\s*\d+\s*[:.]?\s*/i, '').replace(/^Extract\s*\d+\s*[:.]?\s*/i, '').trim();

                if (partData && (cleanedTitle || partContent) && (partContent || questionsArray.length > 0)) {
                    allParts.push({
                        part: partNumber,
                        title: cleanedTitle,
                        instructions: partData.instructions || '',
                        content: partContent,
                    });

                    questionsArray.forEach((q: any) => {
                        allQuestions.push({
                            id: questionIdCounter++,
                            part: partNumber,
                            topic: cleanedTitle,
                            question: q.text || q.question || q.prompt || '',
                            options: Array.isArray(q.options) ? q.options.filter((o: any) => typeof o === 'string') : [],
                            correctOption: q.correctOption,
                            explanation: q.explanation,
                        });
                    });
                }
            });

            return { parts: allParts, questions: allQuestions };
        } catch (e) {
            console.error(e);
            return { parts: [], questions: [] };
        }
    };

    useEffect(() => {
        const fetchExam = async () => {
            try {
                const record = await getExamById(resolvedParams.id);
                if (!record) {
                    setError('Exam not found or the link is invalid.');
                    return;
                }

                setDbRecord(record);

                let parsedData = null;
                try {
                    parsedData = typeof record.data === 'string' ? JSON.parse(record.data) : record.data;
                } catch (e) {
                    setError('Failed to parse exam data.');
                    return;
                }

                setExamData(parsedData);

                const extracted = parseExamData(parsedData.content || parsedData);
                setExamParts(extracted.parts);
                setExamQuestions(extracted.questions);

            } catch (err) {
                setError('An error occurred while loading this exam.');
            } finally {
                setLoading(false);
            }
        };

        fetchExam();
    }, [resolvedParams.id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <BookOpen className="w-12 h-12 text-blue-600 animate-pulse" />
                    <p className="text-slate-500 font-medium">Loading Shared Exam...</p>
                </div>
            </div>
        );
    }

    if (error || !examData) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-red-100">
                    <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Exam Not Found</h2>
                    <p className="text-slate-600 mb-8">{error}</p>
                    <Link href="/" className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition">
                        Go to Homepage
                    </Link>
                </div>
            </div>
        );
    }

    const isFinished = examData.isFinished || false;
    const userAnswers = examData.answers || {};
    const userScores = examData.scores || {};

    // Calculate score logic
    let scoreText = '';
    let accuracyPercentage = 0;

    if (dbRecord.type === 'Writing' || dbRecord.type === 'Speaking') {
        const scoreValues = Object.values(userScores) as number[];
        if (scoreValues.length > 0) {
            const avg = scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length;
            scoreText = `${avg.toFixed(1)} / 10`;
            accuracyPercentage = (avg / 10) * 100;
        } else {
            scoreText = 'Not graded';
        }
    } else {
        // Reading / Listening
        const totalAnswered = Object.keys(userAnswers).length;
        const correctScore = typeof examData.score === 'number' ? examData.score : 0;

        if (totalAnswered > 0) {
            scoreText = `${correctScore} / ${totalAnswered} Correct`;
            accuracyPercentage = Math.round((correctScore / totalAnswered) * 100);
        } else {
            scoreText = '0 Attempted';
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 text-blue-600 font-bold hover:opacity-80 transition">
                        <BookOpen className="w-6 h-6" />
                        <span className="hidden sm:inline">CEFR Mock Exams</span>
                    </Link>
                    <div className="flex items-center gap-4">
                        <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold uppercase tracking-wider">
                            Read-Only View
                        </span>
                        <button
                            onClick={() => window.open(`/print/${dbRecord?.id}`, '_blank')}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-50 transition"
                        >
                            <Download className="w-4 h-4" />
                            Download PDF
                        </button>
                        <Link href="/" className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-800 transition hidden sm:flex">
                            Create Your Own
                        </Link>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-10">

                {/* Exam Metadata Card */}
                <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 mb-8 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>

                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded text-xs font-black tracking-widest uppercase">
                                    {dbRecord.level}
                                </span>
                                <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded text-xs font-bold uppercase">
                                    {dbRecord.type}
                                </span>
                            </div>
                            <h1 className="text-3xl font-extrabold text-slate-900 mb-2">
                                {dbRecord.topic || 'Custom Practice Exam'}
                            </h1>
                            <p className="text-slate-500 flex items-center gap-2 text-sm">
                                <Calendar className="w-4 h-4" />
                                Generated on {new Date(dbRecord.created_at || new Date()).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                            {examData.examFor && (
                                <p className="mt-2 text-sm text-slate-600 font-medium">
                                    Prepared for: <span className="text-slate-900 font-bold bg-slate-100 px-2 py-0.5 rounded">{examData.examFor}</span>
                                </p>
                            )}
                        </div>

                        {/* Score Display */}
                        {isFinished && (
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 min-w-[200px] flex flex-col items-center justify-center text-center">
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Final Result</h3>
                                <div className={`text-3xl font-black mb-1 ${accuracyPercentage >= 80 ? 'text-green-600' : accuracyPercentage >= 60 ? 'text-blue-600' : 'text-amber-600'}`}>
                                    {scoreText}
                                </div>
                                <div className="w-full bg-slate-200 h-2 rounded-full mt-2 overflow-hidden">
                                    <div
                                        className={`h-full ${accuracyPercentage >= 80 ? 'bg-green-500' : accuracyPercentage >= 60 ? 'bg-blue-500' : 'bg-amber-500'}`}
                                        style={{ width: `${accuracyPercentage}%` }}
                                    ></div>
                                </div>
                            </div>
                        )}
                        {!isFinished && (
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex items-center justify-center text-center">
                                <p className="text-slate-500 font-medium text-sm">This exam was saved as a draft<br />and is not fully completed.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Responses Layout */}
                <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <LayoutDashboard className="w-5 h-5 text-blue-500" /> Exam Content & Responses
                </h2>

                <div className="space-y-12">
                    {examParts.map((part) => {
                        const partQuestions = examQuestions.filter(q => q.part === part.part);

                        return (
                            <section key={part.part} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div>
                                        <h3 className="font-bold text-slate-800 text-lg">Part {part.part}: {part.title}</h3>
                                        {part.instructions && <p className="text-sm text-slate-500 mt-1">{part.instructions}</p>}
                                    </div>
                                </div>

                                <div className="p-6">
                                    {/* Reading / Context material */}
                                    {part.content && (
                                        <div className="bg-slate-50 rounded-xl p-6 border border-slate-100 mb-8 whitespace-pre-wrap font-serif text-slate-700 leading-relaxed shadow-inner overflow-x-auto">
                                            {part.content}
                                        </div>
                                    )}

                                    {/* Questions */}
                                    {partQuestions.length > 0 && (
                                        <div className="space-y-8">
                                            {partQuestions.map((question, qIdx) => {
                                                const userAnswer = userAnswers[question.id];
                                                const isCorrect = userAnswer === question.correctOption;
                                                const isAttempted = userAnswer !== undefined;

                                                return (
                                                    <div key={question.id} className="pt-6 border-t border-slate-100 first:pt-0 first:border-0">
                                                        <h4 className="font-bold text-slate-800 mb-4 whitespace-pre-wrap">
                                                            <span className="text-blue-500 mr-2">{qIdx + 1}.</span>
                                                            {question.question}
                                                        </h4>

                                                        {/* Options for Reading/Listening */}
                                                        {question.options && question.options.length > 0 && (
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                                                                {question.options.map((option, optIdx) => {
                                                                    const letter = String.fromCharCode(65 + optIdx);
                                                                    const isSelected = userAnswer === option;
                                                                    const isActuallyCorrect = question.correctOption === option;

                                                                    let bgClass = "bg-slate-50 border-slate-200 text-slate-600";
                                                                    if (isSelected && isActuallyCorrect) {
                                                                        bgClass = "bg-green-50 border-green-300 text-green-800 ring-1 ring-green-300";
                                                                    } else if (isSelected && !isActuallyCorrect) {
                                                                        bgClass = "bg-red-50 border-red-300 text-red-800 ring-1 ring-red-300 opacity-70";
                                                                    } else if (!isSelected && isActuallyCorrect && isFinished) {
                                                                        bgClass = "bg-green-50 border-green-300 text-green-800 border-dashed border-2 opacity-80";
                                                                    }

                                                                    return (
                                                                        <div key={optIdx} className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${bgClass}`}>
                                                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isSelected ? (isActuallyCorrect ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800') : 'bg-slate-200 text-slate-500'}`}>
                                                                                {letter}
                                                                            </div>
                                                                            <span className="flex-1 text-sm">{option}</span>
                                                                            {isSelected && isActuallyCorrect && <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />}
                                                                            {isSelected && !isActuallyCorrect && <XCircle className="w-5 h-5 text-red-500 shrink-0" />}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}

                                                        {/* Un-optioned open text like Writing/Speaking answers isn't fully supported in Read-Only natively unless we saved their transcript, 
                                but we can display the AI explanation right away. */}

                                                        {/* Rationale Display */}
                                                        {examData.isFinished && question.explanation && (
                                                            <div className="mt-4 p-4 rounded-xl bg-blue-50 border border-blue-100 flex gap-3">
                                                                <Lightbulb className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                                                                <div>
                                                                    <span className="text-xs font-bold text-blue-800 uppercase tracking-widest block mb-1">Rationale</span>
                                                                    <p className="text-sm text-blue-900 leading-relaxed">{question.explanation}</p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </section>
                        );
                    })}
                </div>
            </main>
        </div>
    );
}
