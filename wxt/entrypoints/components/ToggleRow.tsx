import InfoTip from './InfoTip';

interface ToggleRowProps {
    id: string;
    label: string;
    info: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}

// One on/off setting: label and info on the left, a switch on the right. The
// switch is a native checkbox (role="switch"), so the label, keyboard and screen
// readers all work without extra wiring.
function ToggleRow({ id, label, info, checked, onChange }: ToggleRowProps) {
    return (
        <div className="row">
            <span className="row-label">
                <label htmlFor={id}>{label}</label>
                <InfoTip text={info} />
            </span>
            <input
                type="checkbox"
                role="switch"
                className="switch"
                id={id}
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
            />
        </div>
    );
}

export default ToggleRow;
