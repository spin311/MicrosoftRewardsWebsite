import InfoTip from './InfoTip';

interface NumberInputProps {
    id: string;
    label: string;
    value: number;
    min: number;
    max: number;
    onChange: (value: number) => void;
    info?: string;
}

function NumberInput({ id, label, value, min, max, onChange, info }: NumberInputProps) {
    return (
        <div className="row">
            <span className="row-label">
                <label htmlFor={id}>{label}</label>
                {info && <InfoTip text={info} />}
            </span>
            <input type="number" className="control" id={id} min={min} max={max}
                   value={Number.isFinite(value) ? value : ''}
                   onChange={(e) => onChange(parseFloat(e.target.value))} />
        </div>
    );
}

export default NumberInput;
