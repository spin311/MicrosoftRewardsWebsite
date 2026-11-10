import { browser } from 'wxt/browser';

interface ManualClaimButtonProps {
    isSearching: boolean;
}

// "Get rewards" starts a run; while one is running it flips to "Stop searches".
// The background owns the run state, so this button is purely controlled: it
// sends the request and lets the state come back through storage — a local
// optimistic flip could disagree with a run that never actually started (a
// daily-set-only run makes no searches).
function ManualClaimButton({ isSearching }: ManualClaimButtonProps) {
    function handleClick() {
        browser.runtime.sendMessage({ action: isSearching ? 'stop' : 'popup' });
    }

    return (
        <button id="button" className={`primary-action${isSearching ? ' primary-action--stop' : ''}`} onClick={handleClick}>
            {isSearching ? 'Stop searches' : 'Get rewards'}
        </button>
    );
}

export default ManualClaimButton;
