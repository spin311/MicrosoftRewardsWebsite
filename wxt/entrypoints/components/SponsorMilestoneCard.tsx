import HeartIcon from './HeartIcon';
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
            title={<><strong className="prompt-card-count">{completedRuns}</strong> search runs done for you</>}
            body="Free and built in my spare time. Sponsoring keeps it working when Bing changes."
            onDismiss={onDismiss}
            isSponsor
            action={
                <button type="button" className="prompt-card-button prompt-card-button--sponsor" onClick={onSponsor}
                        title="On GitHub, monthly or one-time">
                    <HeartIcon size={13} />
                    Sponsor from $2
                </button>
            }
        />
    );
}
