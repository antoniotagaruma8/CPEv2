"use client";

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { checkIsAdmin, getAdminStats } from '../actions/adminActions';
import Link from 'next/link';

export default function AdminDashboard() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [isAdminAuth, setIsAdminAuth] = useState<boolean | null>(null);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Authentication Guard
    useEffect(() => {
        if (status === 'loading') return;

        if (status === 'unauthenticated' || !session?.user?.email) {
            router.push('/');
            return;
        }

        const verifyAdmin = async () => {
            const allowed = await checkIsAdmin(session.user?.email);
            setIsAdminAuth(allowed);
            if (!allowed) {
                router.push('/dashboard');
            }
        };

        verifyAdmin();
    }, [session, status, router]);

    const loadStats = async () => {
        if (!session?.user?.email) return;

        setLoading(true);
        setError('');
        try {
            const data = await getAdminStats(session.user.email);
            setStats(data);
        } catch (err: any) {
            setError(err.message || 'Failed to load stats');
        } finally {
            setLoading(false);
        }
    };

    // Fetch data only after we know they are allowed
    useEffect(() => {
        if (isAdminAuth && session?.user?.email) {
            loadStats();
        }
    }, [isAdminAuth, session]);

    if (status === 'loading' || isAdminAuth === null) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-slate-200 border-t-purple-600 rounded-full animate-spin"></div>
                    <p className="font-bold text-slate-500 uppercase tracking-widest text-sm">Verifying Access...</p>
                </div>
            </div>
        );
    }

    if (isAdminAuth === false) return null; // Router will redirect them.

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-20">
            {/* Admin Header */}
            <header className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center sticky top-0 z-20 shadow-lg">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-inner">
                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                    </div>
                    <div>
                        <h1 className="font-bold text-xl tracking-tight leading-none text-white">Admin Command Center</h1>
                        <p className="text-purple-300 text-xs font-medium uppercase tracking-wider mt-1">System Overview & Analytics</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={loadStats}
                        disabled={loading}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md text-sm font-bold flex items-center gap-2 border border-slate-700 transition"
                    >
                        {loading ? (
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path></svg>
                        ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        )}
                        Refresh Data
                    </button>
                    <Link href="/dashboard" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-sm font-bold shadow-sm transition">
                        Exit to Dashboard
                    </Link>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8">
                {error && (
                    <div className="mb-8 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-3">
                        <svg className="w-6 h-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span className="font-semibold">{error}</span>
                    </div>
                )}

                {/* Top Level KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center justify-between relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -z-0"></div>
                        <div className="relative z-10">
                            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">Total Users</p>
                            <p className="text-4xl font-black text-slate-900">{stats?.totalUsers || 0}</p>
                            <p className="text-xs text-blue-600 font-semibold mt-2">Active accounts generated mock exams</p>
                        </div>
                        <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center relative z-10 shadow-sm border border-blue-200">
                            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center justify-between relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 rounded-bl-full -z-0"></div>
                        <div className="relative z-10">
                            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">Premium Subscribers</p>
                            <p className="text-4xl font-black text-slate-900">{stats?.premiumUsers || 0}</p>
                            <p className="text-xs text-green-600 font-semibold mt-2">Paid users (Stripe active)</p>
                        </div>
                        <div className="w-14 h-14 bg-green-100 text-green-600 rounded-full flex items-center justify-center relative z-10 shadow-sm border border-green-200">
                            <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 20 20"><path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" /></svg>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center justify-between relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50 rounded-bl-full -z-0"></div>
                        <div className="relative z-10">
                            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">Exams Saved</p>
                            <p className="text-4xl font-black text-slate-900">{stats?.totalExamsGenerated || 0}</p>
                            <p className="text-xs text-purple-600 font-semibold mt-2">Total exams stored in DB</p>
                        </div>
                        <div className="w-14 h-14 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center relative z-10 shadow-sm border border-purple-200">
                            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        </div>
                    </div>
                </div>

                {/* Detailed Data Tables */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* User Activity Tracker */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-[600px]">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl shrink-0">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                User Generation Tracker
                            </h3>
                            <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded">Top 50</span>
                        </div>
                        <div className="overflow-y-auto custom-scrollbar flex-1 p-0">
                            <table className="w-full text-left text-sm text-slate-600">
                                <thead className="text-xs uppercase bg-slate-50 text-slate-500 sticky top-0 shadow-sm z-10">
                                    <tr>
                                        <th className="px-6 py-3 font-extrabold tracking-wider">Email</th>
                                        <th className="px-6 py-3 font-extrabold tracking-wider">Gens</th>
                                        <th className="px-6 py-3 font-extrabold tracking-wider hidden sm:table-cell">Last Active</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {stats?.recentUsers?.map((user: any, index: number) => (
                                        <tr key={index} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-slate-800">{user.user_email}</td>
                                            <td className="px-6 py-4">
                                                <span className={`font-bold px-2 py-1 rounded-md ${user.generation_count >= 100 ? 'bg-purple-100 text-purple-700' :
                                                        user.generation_count >= 10 ? 'bg-amber-100 text-amber-700' :
                                                            'bg-slate-100 text-slate-700'
                                                    }`}>
                                                    {user.generation_count}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 hidden sm:table-cell text-xs text-slate-500">
                                                {new Date(user.updated_at).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                    {(!stats?.recentUsers || stats.recentUsers.length === 0) && (
                                        <tr>
                                            <td colSpan={3} className="px-6 py-8 text-center text-slate-500 italic">No user activity recorded yet.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Exam Live Feed */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-[600px]">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl shrink-0">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                Recent Exam Feed
                            </h3>
                            <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-1 rounded">Last 20</span>
                        </div>
                        <div className="overflow-y-auto custom-scrollbar flex-1 p-0">
                            <table className="w-full text-left text-sm text-slate-600">
                                <thead className="text-xs uppercase bg-slate-50 text-slate-500 sticky top-0 shadow-sm z-10">
                                    <tr>
                                        <th className="px-6 py-3 font-extrabold tracking-wider">User</th>
                                        <th className="px-6 py-3 font-extrabold tracking-wider">Details</th>
                                        <th className="px-6 py-3 font-extrabold tracking-wider hidden sm:table-cell">Created</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {stats?.recentExams?.map((exam: any, index: number) => (
                                        <tr key={index} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-3">
                                                <div className="font-medium text-slate-800 max-w-[150px] truncate" title={exam.user_email}>
                                                    {exam.user_email?.split('@')[0]}
                                                </div>
                                            </td>
                                            <td className="px-6 py-3">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">{exam.level}</span>
                                                        <span className="text-xs font-semibold text-slate-700">{exam.type}</span>
                                                        {exam.is_favorite && <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>}
                                                    </div>
                                                    <div className="text-xs text-slate-500 truncate max-w-[200px]" title={exam.topic || 'No topic specified'}>
                                                        {exam.topic || 'Untitled'}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3 hidden sm:table-cell text-xs text-slate-500">
                                                {new Date(exam.created_at).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))}
                                    {(!stats?.recentExams || stats.recentExams.length === 0) && (
                                        <tr>
                                            <td colSpan={3} className="px-6 py-8 text-center text-slate-500 italic">No exams recorded yet.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>

            </main>
        </div>
    );
}
