"use client";

import { useEffect, useState } from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';

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
            content: '🚀 This is where the magic happens! Select your target CEFR level, choose a skill (Reading, Writing, Listening, or Speaking), and optionally add a theme to generate a tailored mock exam.',
            disableBeacon: true,
            placement: 'bottom',
        },
        {
            target: '#saved-exams-section',
            content: '📚 All your hard work is saved here. You can revisit past attempts, check your scores, and even share your results with a public link.',
            placement: 'right',
        },
        {
            target: '#progress-tracking-section',
            content: '📈 Visualize your growth! Track your accuracy across different skills and stay motivated with your weekly goals.',
            placement: 'left',
        },
        {
            target: '#user-settings-section',
            content: (
                <div className="text-center">
                    <p className="mb-3">🌓 Switch between Dark and Classic modes, manage your subscription, or restart this tour anytime by clicking the Help icon.</p>
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
