interface SponsorMilestoneCardProps {
    completedRuns: number;
    onSponsor: () => void;
    onDismiss: () => void;
}

export default function SponsorMilestoneCard({ completedRuns, onSponsor, onDismiss }: SponsorMilestoneCardProps) {
    return (
        <div className="review-card" role="region" aria-label="Support this extension">
            <p className="review-card-title">{completedRuns} search runs done for you</p>
            <p className="review-card-body">
                Microsoft Automatic Rewards is free and built in my spare time. If it's been useful, sponsoring on
                GitHub (monthly from $2, or one-time) keeps it working when Bing changes.
            </p>
            <div className="review-card-actions">
                <button type="button" className="btn btn-success review-card-button" onClick={onSponsor}>Sponsor on GitHub</button>
                <button type="button" className="review-card-secondary" onClick={onDismiss}>Not now</button>
            </div>
        </div>
    );
}
