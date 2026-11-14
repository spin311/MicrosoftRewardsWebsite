import { ISSUES_URL } from '@/entrypoints/utils/reviewPrompt';
import { t } from '@/entrypoints/utils/i18n';
import PromptCard from './PromptCard';

interface ReviewPromptCardProps {
    onRate: () => void;
    onDismiss: () => void;
}

// One honest ask: no "are you happy?" gate and nothing offered for a rating.
export default function ReviewPromptCard({ onRate, onDismiss }: ReviewPromptCardProps) {
    return (
        <PromptCard
            label={t('reviewCardLabel')}
            title={t('reviewCardTitle', t('extName'))}
            body={t('reviewCardBody')}
            onDismiss={onDismiss}
            action={<button type="button" className="prompt-card-button" onClick={onRate}>{t('rateButton')}</button>}
            link={
                <a href={ISSUES_URL} className="prompt-card-link" target="_blank" rel="noopener noreferrer">
                    {t('reportProblemLink')}
                </a>
            }
        />
    );
}
