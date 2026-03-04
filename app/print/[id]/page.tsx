"use client";

import React, { useEffect, useState } from 'react';
import { getExamById } from '../../actions/examActions';

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
    part1Questions?: { question: string; answer: string; tip: string }[];
}

interface ExamPart {
    part: number;
    title: string;
    instructions: string;
    content: string;
}

export default function PrintExamPage({ params }: { params: Promise<{ id: string }> }) {
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
                    setError('Exam not found.');
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

                // Once loaded, trigger print automatically on next tick
                setTimeout(() => {
                    window.print();
                }, 1000);

            } catch (err) {
                setError('An error occurred while loading this exam.');
            } finally {
                setLoading(false);
            }
        };

        fetchExam();
    }, [resolvedParams.id]);

    if (loading) return <div className="p-10 font-sans text-center">Preparing Document for Print...</div>;
    if (error) return <div className="p-10 font-sans text-center text-red-600">{error}</div>;

    const cambridgeLevelName = () => {
        switch (dbRecord.level) {
            case 'A2': return 'A2 Key (KET)';
            case 'B1': return 'B1 Preliminary (PET)';
            case 'B2': return 'B2 First (FCE)';
            case 'C1': return 'C1 Advanced (CAE)';
            case 'C2': return 'C2 Proficiency (CPE)';
            default: return `CEFR ${dbRecord.level}`;
        }
    };

    return (
        <div className="bg-white text-black min-h-screen font-arial print:bg-white print:m-0" style={{ fontFamily: 'Arial, sans-serif' }}>

            {/* Non-print controls (Hidden when actually printing) */}
            <div className="print:hidden p-4 bg-slate-100 border-b border-slate-300 flex justify-between items-center mb-8">
                <p className="text-sm font-bold text-slate-800">Print Preview Generation: Please use the print dialog layout set to A4.</p>
                <button onClick={() => window.print()} className="px-4 py-2 bg-blue-600 text-white rounded font-bold shadow hover:bg-blue-700">
                    Print Now / Save as PDF
                </button>
            </div>

            <div className="max-w-[210mm] mx-auto p-[15mm] print:p-0 bg-white shadow-xl print:shadow-none min-h-[297mm]">

                {/* EXAM COVER PAGE HEADER (Cambridge Style) */}
                <div className="border-2 border-black p-6 mb-8 text-sm">
                    <div className="grid grid-cols-2 gap-x-8 gap-y-6 font-bold uppercase mb-6 text-sm">
                        <div className="col-span-2 flex items-end gap-2">
                            <span className="shrink-0">CANDIDATE NAME:</span>
                            <span className="flex-1 border-b-2 border-dashed border-black pb-1"></span>
                        </div>
                        <div className="col-span-1 flex items-end gap-2">
                            <span className="shrink-0">CENTRE NUMBER:</span>
                            <span className="flex-1 border-b-2 border-dashed border-black pb-1"></span>
                        </div>
                        <div className="col-span-1 flex items-end gap-2">
                            <span className="shrink-0">CANDIDATE NUMBER:</span>
                            <span className="flex-1 border-b-2 border-dashed border-black pb-1"></span>
                        </div>
                    </div>

                    <div className="font-bold text-center border-t-2 border-black pt-4">
                        <h1 className="text-2xl font-black tracking-widest uppercase mb-1">
                            CEFR ENGLISH EXAM
                        </h1>
                        <h2 className="text-xl font-bold mb-4">{cambridgeLevelName()}</h2>
                        <h3 className="text-lg uppercase">
                            {dbRecord.type === 'Reading' ? 'Reading and Use of English' : dbRecord.type}
                        </h3>
                        {dbRecord.topic && <p className="mt-2 text-md font-normal italic">Topic: {dbRecord.topic}</p>}
                    </div>

                    <div className="mt-8 font-bold text-center border-b-2 border-black pb-4">
                        <p>Time <span className="font-normal italic">(approx)</span>: {
                            dbRecord.type === 'Reading' ? '1 hour 15 minutes' :
                                dbRecord.type === 'Writing' ? '1 hour 20 minutes' :
                                    dbRecord.type === 'Listening' ? '40 minutes' : '15 minutes'
                        }</p>
                    </div>

                    <div className="mt-6 mb-2 space-y-3 font-bold">
                        <p className="uppercase text-lg">Instructions to candidates</p>
                        <p className="font-normal">Do not open this question paper until you are told to do so.</p>
                        <p className="font-normal">Write your name, centre number and candidate number on your answer sheet if they are not already there.</p>
                        <p className="font-normal">Read the instructions for each part of the paper carefully.</p>
                        <p className="font-normal">Answer all the questions.</p>
                        <p className="font-normal">Read the instructions on the answer sheet. Write on the answer sheet. Use a pencil.</p>
                        <p className="font-normal">You must complete the answer sheet within the time limit.</p>
                        <p className="font-normal">At the end of the test, hand in both this question paper and your answer sheet.</p>
                    </div>
                </div>

                {/* EXAM CONTENTS */}
                <div className="space-y-12 pb-20">
                    {examParts.map((part, index) => {
                        const partQuestions = examQuestions.filter(q => q.part === part.part);
                        const isFirst = index === 0;

                        return (
                            <div key={part.part} className={`print:break-before-auto ${!isFirst ? 'print:mt-12 mt-12' : ''}`}>
                                <h3 className="font-bold text-lg mb-2 uppercase">Part {part.part}</h3>

                                {part.instructions && (
                                    <p className="mb-6 font-bold italic text-justify leading-relaxed">
                                        {part.instructions}
                                    </p>
                                )}

                                {part.content && (
                                    <div className="mb-8 border-y-2 border-black py-4 mb-6">
                                        <p className="font-sans whitespace-pre-wrap text-justify leading-relaxed">
                                            {part.content}
                                        </p>
                                    </div>
                                )}

                                {partQuestions.length > 0 && (
                                    <div className="space-y-6">
                                        {partQuestions.map((q, qIndex) => (
                                            <div key={q.id} className="text-base break-inside-avoid shadow-none">
                                                <div className="flex gap-4">
                                                    <span className="font-bold min-w-[2rem]">{examQuestions.findIndex(eq => eq.id === q.id) + 1}.</span>
                                                    <div className="w-full">
                                                        <p className="mb-3 whitespace-pre-wrap">{q.question}</p>

                                                        {q.options && q.options.length > 0 && (
                                                            <div className="grid grid-cols-2 gap-x-8 gap-y-2 mt-2 ml-4">
                                                                {q.options.map((opt, oIdx) => (
                                                                    <div key={oIdx} className="flex gap-2 items-start">
                                                                        <span className="font-bold uppercase min-w-[1.5rem]">{String.fromCharCode(65 + oIdx)}</span>
                                                                        <span>{opt}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {/* EXPLICIT WRITE-IN AREA FOR PRINT */}
                                                        {q.options && q.options.length > 0 ? (
                                                            <div className="mt-4 flex items-center gap-3">
                                                                <span className="font-bold text-xs uppercase text-slate-500">Write letter here:</span>
                                                                <div className="w-10 h-10 border-2 border-slate-400 bg-slate-50"></div>
                                                            </div>
                                                        ) : (
                                                            dbRecord.type !== 'Speaking' && (
                                                                <div className="mt-6 flex items-end gap-3 w-full">
                                                                    <span className="font-bold text-xs uppercase text-slate-500 pb-1 shrink-0">Write answer here:</span>
                                                                    <div className="flex-1 border-b-2 border-slate-400 h-6"></div>
                                                                </div>
                                                            )
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="text-center font-bold uppercase mt-12 mb-8 hidden print:block border-t border-black pt-4">
                    — end of test —
                </div>

                {/* ANSWER KEY PAGE */}
                <div className="print:break-before-page pt-12 print:pt-4 pb-20">
                    <h2 className="text-2xl font-black uppercase border-b-2 border-black pb-2 mb-8 text-slate-800">
                        Answer Key & Rationale
                    </h2>

                    <div className="space-y-4">
                        {examParts.map((part) => {
                            const partQuestions = examQuestions.filter(q => q.part === part.part);

                            // Check if this part has any questions that have an answer or explanation
                            const hasAnswers = partQuestions.some(q => q.correctOption || q.explanation || (q.possibleAnswers && q.possibleAnswers.length > 0));
                            if (!hasAnswers) return null;

                            return (
                                <div key={`answer-key-part-${part.part}`} className="break-inside-avoid">
                                    <h3 className="font-bold text-base mb-2 uppercase bg-slate-100 p-1 rounded">Part {part.part}</h3>
                                    <div className="grid grid-cols-1 gap-y-2">
                                        {partQuestions.map((q, qIndex) => {
                                            // Determine letter for M/C options
                                            let correctLetter = '';
                                            if (q.options && q.options.length > 0 && q.correctOption) {
                                                const optIndex = q.options.indexOf(q.correctOption);
                                                if (optIndex !== -1) {
                                                    correctLetter = String.fromCharCode(65 + optIndex);
                                                }
                                            }

                                            return (
                                                <div key={`answer-${q.id}`} className="flex gap-4 text-xs border-b border-slate-100 pb-2 last:border-0">
                                                    <span className="font-bold min-w-[2rem] text-slate-500">{examQuestions.findIndex(eq => eq.id === q.id) + 1}.</span>
                                                    <div className="flex-1">
                                                        {/* Exact Answer if exists */}
                                                        {q.correctOption && (
                                                            <div className="font-bold mb-1 text-slate-900">
                                                                <span className="text-gray-500 mr-2 uppercase text-[10px]">Answer:</span>
                                                                {correctLetter ? <span className="text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 mr-2">{correctLetter}</span> : null}
                                                                {q.correctOption}
                                                            </div>
                                                        )}

                                                        {/* Possible Answers (for Speaking / Writing) */}
                                                        {(!q.correctOption && q.possibleAnswers && q.possibleAnswers.length > 0) && (
                                                            <div className="mb-1">
                                                                <span className="text-gray-500 mr-2 uppercase text-[10px] font-bold">Suggested Answers:</span>
                                                                <ul className="list-disc pl-4 mt-0.5 space-y-0.5">
                                                                    {q.possibleAnswers.map((pa, paIdx) => (
                                                                        <li key={paIdx} className="text-slate-800 italic">{pa}</li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        )}

                                                        {/* Rationale / Explanation */}
                                                        {q.explanation && (
                                                            <div className="text-slate-600 leading-snug bg-slate-50 p-1.5 rounded-r border-l-2 border-blue-300">
                                                                <span className="font-bold text-slate-700 uppercase text-[10px] block mb-0.5">Rationale:</span>
                                                                {q.explanation}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

            </div>
        </div>
    );
}
