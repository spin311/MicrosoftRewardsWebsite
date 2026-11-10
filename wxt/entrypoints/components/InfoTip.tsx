interface InfoTipProps {
    text: string;
}

// A small "i" that reveals `text` on hover or keyboard focus. It is a button so
// it can take focus — the old hover-only span was unreachable without a mouse —
// and the text doubles as its accessible name.
function InfoTip({ text }: InfoTipProps) {
    return (
        <button type="button" className="info-tip" aria-label={text} data-tooltip={text}>
            <span aria-hidden="true">i</span>
        </button>
    );
}

export default InfoTip;
