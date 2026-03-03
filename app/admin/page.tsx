"use client";

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { checkIsAdmin, getAdminStats, resetDeviceLimit } from '../actions/adminActions';
import Link from 'next/link';
import { ShieldCheck, Loader2, RefreshCw, Unlock, AlertCircle, Users, Crown, FileText, Activity, Star } from 'lucide-react';

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

    const handleResetDevice = async () => {
        const deviceId = localStorage.getItem('cpe_device_id');
        if (!deviceId || !session?.user?.email) {
            alert('No device ID found or user not logged in.');
            return;
        }

        if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return; // Prevent testing in pure static

        if (confirm('This will reset the generation limit count for this specific computer. Are you sure?')) {
            try {
                setLoading(true);
                await resetDeviceLimit(session.user.email, deviceId);
                alert('Your computer has been successfully unblocked! You can test free accounts again.');
                await loadStats();
            } catch (err: any) {
                alert(err.message || 'Failed to unblock device.');
                setLoading(false);
            }
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
                        <ShieldCheck className="w-6 h-6 text-white" strokeWidth={2} />
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
                            <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2.5} />
                        ) : (
                            <RefreshCw className="w-4 h-4" strokeWidth={2.5} />
                        )}
                        Refresh Data
                    </button>
                    <button
                        onClick={handleResetDevice}
                        disabled={loading}
                        className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-md text-sm font-bold flex items-center gap-2 shadow-sm transition"
                        title="Resets the limit counter for this specific computer"
                    >
                        <Unlock className="w-4 h-4" strokeWidth={2.5} />
                        Unblock My Computer
                    </button>
                    <Link href="/dashboard" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-sm font-bold shadow-sm transition">
                        Exit to Dashboard
                    </Link>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8">
                {error && (
                    <div className="mb-8 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-3">
                        <AlertCircle className="w-6 h-6 shrink-0" strokeWidth={2} />
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
                            <Users className="w-7 h-7" strokeWidth={2} />
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
                            <Crown className="w-7 h-7" strokeWidth={2} />
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
                            <FileText className="w-7 h-7" strokeWidth={2} />
                        </div>
                    </div>
                </div>

                {/* Detailed Data Tables */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* User Activity Tracker */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-[600px]">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl shrink-0">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <Users className="w-5 h-5 text-blue-600" strokeWidth={2.5} />
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
                                            <td className="px-6 py-4 font-medium text-slate-800">
                                                <div className="flex items-center gap-2">
                                                    {user.user_email}
                                                    {user.isPremium && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-700 border border-amber-200 shadow-sm" title="Premium Subscriber">
                                                            <Crown className="w-3 h-3" strokeWidth={2.5} /> PRO
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
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
                                <Activity className="w-5 h-5 text-indigo-600" strokeWidth={2.5} />
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
                                                        {exam.is_favorite && <Star className="w-4 h-4 text-yellow-500 fill-current" />}
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
