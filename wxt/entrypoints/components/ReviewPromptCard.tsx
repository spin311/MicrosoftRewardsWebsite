import { ISSUES_URL } from '@/entrypoints/utils/reviewPrompt';
import PromptCard from './PromptCard';

interface ReviewPromptCardProps {
    onRate: () => void;
    onDismiss: () => void;
}

// One honest ask: no "are you happy?" gate and nothing offered for a rating.
export default function ReviewPromptCard({ onRate, onDismiss }: ReviewPromptCardProps) {
    return (
        <PromptCard
            label="Rate this extension"
            title="Enjoying Search automatic rewards?"
            body="A quick rating helps other people find it."
            onDismiss={onDismiss}
            action={<button type="button" className="prompt-card-button" onClick={onRate}>Rate it</button>}
            link={
                <a href={ISSUES_URL} className="prompt-card-link" target="_blank" rel="noopener noreferrer">
                    Not working? Report it
                </a>
            }
        />
    );
}
