import { t, type MessageKey } from '@/entrypoints/utils/i18n';
import InfoTip from './InfoTip';

interface AccountLevelSelectProps {
    value: string;
    onChange: (level: string) => void;
}

const LEVELS: { value: string; label: MessageKey }[] = [
    { value: 'member', label: 'accountLevelMember' },
    { value: 'silver', label: 'accountLevelSilver' },
    { value: 'gold', label: 'accountLevelGold' },
];

// The label links to the Rewards benefits page so users can check which level
// they're on. Picking a level sets a sensible default search count.
function AccountLevelSelect({ value, onChange }: AccountLevelSelectProps) {
    return (
        <div className="row">
            <span className="row-label">
                <label htmlFor="accountLevel">
                    <a className="level-link" href="https://rewards.bing.com/about?section=benefits" target="_blank" rel="noopener noreferrer">{t('accountLevelLabel')}</a>
                </label>
                <InfoTip text={t('accountLevelInfo')} />
            </span>
            <select id="accountLevel" className="control" value={value} onChange={(e) => onChange(e.target.value)}>
                {LEVELS.map((level) => (
                    <option key={level.value} value={level.value}>{t(level.label)}</option>
                ))}
            </select>
        </div>
    );
}

export default AccountLevelSelect;
