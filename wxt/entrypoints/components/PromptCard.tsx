import type { ReactNode } from 'react';

interface PromptCardProps {
    // Names the region for screen readers' landmark lists.
    label: string;
    title: ReactNode;
    body: ReactNode;
    onDismiss: () => void;
    // The card's actions, primary first.
    children: ReactNode;
}

// Shared shell for the popup's one-time asks: title, one line of text, actions.
// The dismiss button sits top-right but comes last in the DOM, so screen readers
// and Tab reach the ask and its actions before "Not now".
export default function PromptCard({ label, title, body, onDismiss, children }: PromptCardProps) {
    return (
        <div className="prompt-card" role="region" aria-label={label}>
            <h2 className="prompt-card-title">{title}</h2>
            <p className="prompt-card-body">{body}</p>
            <div className="prompt-card-actions">{children}</div>
            <button type="button" className="prompt-card-dismiss" onClick={onDismiss} aria-label="Not now" title="Not now">
                <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
                    <path d="M3.5 3.5l9 9m0-9-9 9" />
                </svg>
            </button>
        </div>
    );
}
