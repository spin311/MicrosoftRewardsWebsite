import PromptCard from './PromptCard';

interface SponsorMilestoneCardProps {
    completedRuns: number;
    onSponsor: () => void;
    onDismiss: () => void;
}

export default function SponsorMilestoneCard({ completedRuns, onSponsor, onDismiss }: SponsorMilestoneCardProps) {
    return (
        <PromptCard
            label="Support this extension"
            title={`${completedRuns} search runs done for you`}
            body="Sponsoring keeps it working when Bing changes."
            onDismiss={onDismiss}
        >
            <button type="button" className="prompt-card-primary" onClick={onSponsor}>Sponsor on GitHub</button>
        </PromptCard>
    );
}
