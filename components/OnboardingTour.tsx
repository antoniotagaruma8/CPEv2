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
            content: 'Here you can customize and generate your mock exam. Select the skill, level, and optional topics to get started.',
            disableBeacon: true,
            placement: 'bottom',
        },
        {
            target: '#saved-exams-section',
            content: 'Access all your previously generated and attempted exams right here. You can review feedback or resume tests anytime.',
            placement: 'left',
        },
        {
            target: '#progress-tracking-section',
            content: 'Track your overall accuracy, skills progress, and weekly goals to see your improvement over time.',
            placement: 'left',
        },
        {
            target: '#user-settings-section',
            content: 'Change your theme, manage account settings, and review the guide. Click the Help icon to restart this tour.',
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
