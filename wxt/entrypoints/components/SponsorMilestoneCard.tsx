import { t, tPlural } from '@/entrypoints/utils/i18n';
import HeartIcon from './HeartIcon';
import PromptCard from './PromptCard';

interface SponsorMilestoneCardProps {
    completedRuns: number;
    onSponsor: () => void;
    onDismiss: () => void;
}

// Stands in for the run count in the translated title, so the count can be set
// in bold wherever the translation puts it. Private-use: never in real text.
const COUNT_SLOT = '\uE000';

function MilestoneTitle({ completedRuns }: { completedRuns: number }) {
    const [before, after = ''] = tPlural('sponsorCardTitle', completedRuns, [COUNT_SLOT]).split(COUNT_SLOT);
    return <>{before}<strong className="prompt-card-count">{completedRuns}</strong>{after}</>;
}

export default function SponsorMilestoneCard({ completedRuns, onSponsor, onDismiss }: SponsorMilestoneCardProps) {
    return (
        <PromptCard
            label={t('sponsorCardLabel')}
            title={<MilestoneTitle completedRuns={completedRuns} />}
            body={t('sponsorCardBody')}
            onDismiss={onDismiss}
            isSponsor
            action={
                <button type="button" className="prompt-card-button prompt-card-button--sponsor" onClick={onSponsor}
                        title={t('sponsorCardButtonTooltip')}>
                    <HeartIcon size={13} />
                    {t('sponsorCardButton')}
                </button>
            }
        />
    );
}
