"use client";

import { useEffect, useState } from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';

import { Rocket, Library, TrendingUp, SunMoon } from 'lucide-react';

export default function OnboardingTour() {
    const [run, setRun] = useState(false);

    useEffect(() => {
        const hasCompletedTour = localStorage.getItem('hasCompletedTour');
        if (!hasCompletedTour) {
            const timer = setTimeout(() => {
                setRun(true);
            }, 1000);
            return () => clearTimeout(timer);
        }

        const startTourCb = () => setRun(true);
        window.addEventListener('startOnboardingTour', startTourCb);
        return () => window.removeEventListener('startOnboardingTour', startTourCb);
    }, []);

    const steps: Step[] = [
        {
            target: '#generator-section',
            content: (
                <div>
                    <span className="flex items-center gap-2 mb-1.5 font-bold text-blue-600"><Rocket className="w-5 h-5" /> Start Practicing!</span>
                    You can instantly take one of our Pre-loaded Exams by selecting a skill, or scroll down to generate a Custom Exam tailored to your chosen CEFR level and topic.
                </div>
            ),
            disableBeacon: true,
            placement: 'bottom',
        },
        {
            target: '#saved-exams-section',
            content: (
                <div>
                    <span className="flex items-center gap-2 mb-1.5 font-bold text-indigo-600"><Library className="w-5 h-5" /> Your Library</span>
                    All your generated exams are stored securely here. You can revisit past attempts, download them as printable PDFs, or share a clean interface with your students via public link.
                </div>
            ),
            placement: 'right',
        },
        {
            target: '#progress-tracking-section',
            content: (
                <div>
                    <span className="flex items-center gap-2 mb-1.5 font-bold text-green-600"><TrendingUp className="w-5 h-5" /> Visualize your growth!</span>
                    Track your accuracy across all four core skills (Reading, Writing, Listening, Speaking) and stay motivated to hit your goals.
                </div>
            ),
            placement: 'left',
        },
        {
            target: '#user-settings-section',
            content: (
                <div className="text-center">
                    <p className="mb-3 flex flex-col items-center justify-center gap-2">
                        <SunMoon className="w-6 h-6 text-slate-600" />
                        <span>Here you can switch to Dark Mode, manage your subscription, or access the exclusive Teacher Panel. Click the Help icon to restart this tour anytime!</span>
                    </p>
                    <hr className="my-2 opacity-20" />
                    <p className="font-bold text-blue-600">Want more details?</p>
                    <a
                        href="/how-to-use"
                        className="inline-block mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors"
                    >
                        View Full Guide →
                    </a>
                </div>
            ),
            placement: 'bottom-end'
        },
    ];

    const handleJoyrideCallback = (data: CallBackProps) => {
        const { status } = data;
        const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

        if (finishedStatuses.includes(status)) {
            setRun(false);
            localStorage.setItem('hasCompletedTour', 'true');
        }
    };

    return (
        <Joyride
            callback={handleJoyrideCallback}
            continuous
            hideCloseButton
            run={run}
            scrollToFirstStep
            showProgress
            showSkipButton
            steps={steps}
            styles={{
                options: {
                    primaryColor: '#2563EB', // blue-600
                    zIndex: 10000,
                },
            }}
        />
    );
}
