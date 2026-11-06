import InfoTip from './InfoTip';

interface AccountLevelSelectProps {
    value: string;
    onChange: (level: string) => void;
}

const LEVELS: { value: string; label: string }[] = [
    { value: 'member', label: 'Member' },
    { value: 'silver', label: 'Silver' },
    { value: 'gold', label: 'Gold' },
];

// The label links to the Rewards benefits page so users can check which level
// they're on. Picking a level sets a sensible default search count.
function AccountLevelSelect({ value, onChange }: AccountLevelSelectProps) {
    return (
        <div className="row">
            <span className="row-label">
                <label htmlFor="accountLevel">
                    <a className="level-link" href="https://rewards.bing.com/about?section=benefits" target="_blank" rel="noopener noreferrer">Account level</a>
                </label>
                <InfoTip text="Sets a default number of searches: Member 5, Silver 10, Gold 20. You can still change it below." />
            </span>
            <select id="accountLevel" className="control" value={value} onChange={(e) => onChange(e.target.value)}>
                {LEVELS.map((level) => (
                    <option key={level.value} value={level.value}>{level.label}</option>
                ))}
            </select>
        </div>
    );
}

export default AccountLevelSelect;
