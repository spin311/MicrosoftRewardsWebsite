import { ISSUES_URL } from '@/entrypoints/utils/reviewPrompt';

interface ReviewPromptCardProps {
    onRate: () => void;
    onDismiss: () => void;
}

// One honest ask: no "are you happy?" gate and nothing offered for a rating.
export default function ReviewPromptCard({ onRate, onDismiss }: ReviewPromptCardProps) {
    return (
        <div className="review-card" role="region" aria-label="Rate this extension">
            <p className="review-card-title">Enjoying Microsoft Automatic Rewards?</p>
            <p className="review-card-body">A quick rating helps other people find it.</p>
            <div className="review-card-actions">
                <button type="button" className="btn btn-success review-card-button" onClick={onRate}>Rate it</button>
                <button type="button" className="review-card-secondary" onClick={onDismiss}>Not now</button>
            </div>
            <a href={ISSUES_URL} className="normal-link review-card-report" target="_blank" rel="noopener noreferrer">
                Something not working? Report it
            </a>
        </div>
    );
}
