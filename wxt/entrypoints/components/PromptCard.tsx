import type { ReactNode } from 'react';
import HeartIcon from './HeartIcon';

interface PromptCardProps {
    // Names the region for screen readers' landmark lists.
    label: string;
    title: ReactNode;
    body: ReactNode;
    onDismiss: () => void;
    // The ask itself, rendered before "Not now".
    action: ReactNode;
    // An optional quiet link after "Not now".
    link?: ReactNode;
    // The sponsor ask gets the header Sponsor button's pink, as a thank-you rather
    // than another settings box.
    isSponsor?: boolean;
}

// Shared shell for the popup's one-time asks, matching Prolific Studies Notifier's:
// title, one line of text, then the ask and a "Not now" of equal weight side by side.
export default function PromptCard({ label, title, body, onDismiss, action, link, isSponsor = false }: PromptCardProps) {
    return (
        <div className={isSponsor ? 'prompt-card prompt-card--sponsor' : 'prompt-card'} role="region" aria-label={label}>
            {isSponsor && (
                <span className="prompt-card-badge" aria-hidden="true">
                    <HeartIcon size={16} />
                </span>
            )}
            <h2 className="prompt-card-title">{title}</h2>
            <p className="prompt-card-body">{body}</p>
            <div className="prompt-card-actions">
                {action}
                <button type="button" className="prompt-card-button prompt-card-button--quiet" onClick={onDismiss}>Not now</button>
                {link}
            </div>
        </div>
    );
}
