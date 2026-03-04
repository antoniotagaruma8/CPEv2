import { Metadata } from 'next';
import { getExamById } from '../../actions/examActions';

type Props = {
    params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    let title = 'CEFR Mock Exam';
    let description = 'Check out this Cambridge-style English mock exam!';

    try {
        const record = await getExamById(id);
        if (record) {
            title = `${record.level} ${record.type} Exam${record.topic ? ` - ${record.topic}` : ''}`;
            description = `Try this AI-generated ${record.level} mock exam on CPEv2.`;
        }
    } catch (error) {
        console.error("Error fetching metadata:", error);
    }

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            type: 'website',
            siteName: 'CPEv2 Mock Exams',
            url: `https://cpev2.vercel.app/shared/${id}`,
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
        }
    };
}

export default function SharedExamLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
