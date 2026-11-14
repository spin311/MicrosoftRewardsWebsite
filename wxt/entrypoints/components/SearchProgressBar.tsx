import { toSearchProgress } from '@/entrypoints/utils/progress';
import { t, tPlural } from '@/entrypoints/utils/i18n';

interface SearchProgressBarProps {
    completed: number;
    total: number;
    isSearching: boolean;
}

// Shows how far today's search run has got ("3/5") plus a bar. The wording
// distinguishes a run in flight from one that finished and one the user stopped,
// so the same numbers can't be read as still-running.
function SearchProgressBar({ completed, total, isSearching }: SearchProgressBarProps) {
    const { completed: done, total: goal, percent } = toSearchProgress(completed, total);
    const isComplete = done >= goal;
    const state = isSearching ? 'running' : isComplete ? 'done' : 'idle';
    const label = t(isSearching ? 'progressRunning' : isComplete ? 'progressDone' : 'progressStopped');

    return (
        <div className="progress-card" role="status" aria-live="polite">
            <div className="progress-row">
                <span className="progress-title">
                    <span className={`progress-dot progress-dot--${state}`} aria-hidden="true" />
                    {label}
                </span>
                <span className="progress-count">
                    <strong>{done}</strong>/{goal}
                </span>
            </div>
            <div
                className="progress-track"
                role="progressbar"
                aria-valuenow={done}
                aria-valuemin={0}
                aria-valuemax={goal}
                aria-label={tPlural('progressBarLabel', goal, [String(done), String(goal)])}
            >
                <div className="progress-fill" style={{ width: `${percent}%` }} />
            </div>
        </div>
    );
}

export default SearchProgressBar;
