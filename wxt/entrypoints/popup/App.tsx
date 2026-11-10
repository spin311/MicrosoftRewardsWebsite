import './App.css';
import { useEffect, useState } from 'react';
import { useStorage } from '@/entrypoints/hooks/useStorage';
import { useSearchProgress } from '@/entrypoints/hooks/useSearchProgress';
import { StorageValues } from '@/entrypoints/enums/storageValues';
import { DEFAULTS, LEVEL_SEARCHES } from '@/entrypoints/utils/settings';
import { clearBadge } from '@/entrypoints/utils/browserAction';
import { RECOMMENDED_MIN_TIMEOUT_SECONDS } from '@/entrypoints/utils/search';
import NumberInput from '@/entrypoints/components/NumberInput';
import AccountLevelSelect from '@/entrypoints/components/AccountLevelSelect';
import ManualClaimButton from '@/entrypoints/components/ManualClaimButton';
import SearchProgressBar from '@/entrypoints/components/SearchProgressBar';
import ToggleRow from '@/entrypoints/components/ToggleRow';
import ReviewPromptCard from '@/entrypoints/components/ReviewPromptCard';
import SponsorMilestoneCard from '@/entrypoints/components/SponsorMilestoneCard';
import { usePromptCard } from '@/entrypoints/hooks/usePromptCard';
import { getCrossPromoLink } from '@/entrypoints/utils/crossPromo';
import { choosePopupSlots } from '@/entrypoints/utils/popupSlots';

// metadata_source shows up in GitHub Sponsors exports, so sponsorships that start
// in this popup can be told apart from the README and website ones.
const SPONSOR_URL = 'https://github.com/sponsors/spin311?metadata_source=MicrosoftRewardsWebsite-popup';
const REFERRAL_URL = 'https://rewards.bing.com/welcome?rh=yHey9rv4Kyk&ref=rafsrchae';

const CROSS_PROMO_LINK = getCrossPromoLink(import.meta.env.FIREFOX);

function App() {
    const [active, setActive] = useStorage<boolean>('active', DEFAULTS.active, StorageValues.SYNC);
    const [autoDaily, setAutoDaily] = useStorage<boolean>('autoDaily', DEFAULTS.autoDaily, StorageValues.SYNC);
    const [searches, setSearches] = useStorage<number>('searches', DEFAULTS.searches, StorageValues.SYNC);
    const [timeout, setTimeoutValue] = useStorage<number>('timeout', DEFAULTS.timeout, StorageValues.SYNC);
    const [closeTime, setCloseTime] = useStorage<number>('closeTime', DEFAULTS.closeTime, StorageValues.SYNC);
    const [accountLevel, setAccountLevel] = useStorage<string>('accountLevel', DEFAULTS.accountLevel, StorageValues.SYNC);
    const [openFirstResult, setOpenFirstResult] = useStorage<boolean>('openFirstResult', DEFAULTS.openFirstResult, StorageValues.SYNC);
    const [claimPoints, setClaimPoints] = useStorage<boolean>('claimPoints', DEFAULTS.claimPoints, StorageValues.SYNC);
    const { isLoaded, isSearching, completed, total } = useSearchProgress();
    const prompt = usePromptCard();

    // The "New" badge from an update is dismissed once the popup is opened — but
    // the badge doubles as the live search counter, so wait for the run state and
    // leave a running count alone.
    useEffect(() => {
        if (isLoaded && !isSearching) clearBadge();
    }, [isLoaded, isSearching]);

    // Latched, so a run that finishes while the popup is open keeps its panel.
    const [wasSearchingThisPopup, setWasSearchingThisPopup] = useState(false);
    useEffect(() => {
        if (isSearching) setWasSearchingThisPopup(true);
    }, [isSearching]);

    const slots = choosePopupSlots({
        isRunStateLoaded: isLoaded,
        isSearching,
        wasSearchingThisPopup,
        completedSearches: completed,
        isPromptLoaded: prompt.isLoaded,
        dueCard: prompt.card,
    });

    // Gaps this short are honoured, but they are below what Microsoft reliably
    // credits — so the field warns rather than silently overriding the choice.
    const isTimeoutRisky = Number.isFinite(timeout) && timeout < RECOMMENDED_MIN_TIMEOUT_SECONDS;

    // Picking a level sets a sensible search count; the number field stays
    // editable so the user can still override it.
    function handleLevelChange(level: string): void {
        setAccountLevel(level);
        setSearches(LEVEL_SEARCHES[level] ?? DEFAULTS.searches);
    }

    return (
        <>
            <header className="top-bar">
                <img src="/imgs/logo.png" alt="" className="top-bar-logo" />
                <h1 className="top-bar-title">Search automatic rewards</h1>
                <a
                    href={SPONSOR_URL}
                    className="sponsor-button"
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Enjoying the extension? Sponsor from $5/month and get your name featured in the README."
                >
                    <svg className="sponsor-heart" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                        <path d="M8 14.25.345 6.595a4.25 4.25 0 0 1 6.01-6.01L8 2.23 9.645.585a4.25 4.25 0 0 1 6.01 6.01Z" />
                    </svg>
                    Sponsor
                </a>
            </header>

            <main className="content">
                <ManualClaimButton isSearching={isSearching} />
                {slots.showRunPanel && (
                    <SearchProgressBar completed={completed} total={total} isSearching={isSearching} />
                )}

                <section className="card" aria-labelledby="tasks-title">
                    <h2 className="card-title" id="tasks-title">Daily tasks</h2>
                    <ToggleRow id="autoCheckbox" label="Search automatically" checked={active} onChange={setActive}
                               info="Opens your Bing searches automatically the first time the browser opens each day." />
                    <ToggleRow id="autoDaily" label="Daily set" checked={autoDaily} onChange={setAutoDaily}
                               info="Opens the Rewards dashboard and clicks today's daily set for extra points." />
                    <ToggleRow id="claimPoints" label="Claim points" checked={claimPoints} onChange={setClaimPoints}
                               info="Opens the Rewards dashboard and presses Ready to claim, so earned points land in your balance. The tab briefly takes focus." />
                </section>

                <section className="card" aria-labelledby="settings-title">
                    <h2 className="card-title" id="settings-title">Search settings</h2>
                    <AccountLevelSelect value={accountLevel} onChange={handleLevelChange} />
                    <NumberInput id="searches" label="Searches per run" value={searches} min={1} max={999} onChange={setSearches}
                                 info="How many Bing searches each run opens, one tab at a time." />
                    <NumberInput id="timeout" label="Seconds between searches" value={timeout} min={0} max={9999} onChange={setTimeoutValue} />
                    {isTimeoutRisky && (
                        <p className="field-warning" role="status">
                            Under {RECOMMENDED_MIN_TIMEOUT_SECONDS}s Microsoft often stops crediting searches.
                            {' '}{DEFAULTS.timeout}s or more is recommended.
                        </p>
                    )}
                    <NumberInput id="closeTime" label="Close each tab after (s)" value={closeTime} min={0} max={300} onChange={setCloseTime} />
                    <ToggleRow id="openFirstResult" label="Open first result" checked={openFirstResult} onChange={setOpenFirstResult}
                               info="In each search tab, opens the first result after a short random delay." />
                </section>

                {/* One ask at a time: a due prompt card takes the promo tiles' place, which also keeps the
                    popup within Chrome's 600px (see choosePopupSlots). The header Sponsor button always stays. */}
                {slots.lower === 'loading' ? null : slots.lower === 'review' ? (
                    <ReviewPromptCard onRate={() => void prompt.rate()} onDismiss={prompt.dismiss} />
                ) : slots.lower === 'sponsor' ? (
                    <SponsorMilestoneCard completedRuns={prompt.completedRuns} onSponsor={() => void prompt.sponsor()} onDismiss={prompt.dismiss} />
                ) : (
                <nav className="promo-tiles" aria-label="More from the developer">
                    <a href={REFERRAL_URL} className="promo-tile" target="_blank" rel="noopener noreferrer">
                        <span className="promo-icon" aria-hidden="true">🎁</span>
                        <span className="promo-text">
                            <strong>Join Rewards</strong>
                            <span>Earn with Bing</span>
                        </span>
                    </a>
                    <a href={CROSS_PROMO_LINK.href} className="promo-tile" title={CROSS_PROMO_LINK.label} target="_blank" rel="noopener noreferrer">
                        <img src="/imgs/free-games.png" alt="" className="promo-icon" />
                        <span className="promo-text">
                            <strong>Free games</strong>
                            <span>Steam &amp; Epic</span>
                        </span>
                    </a>
                </nav>
                )}
            </main>

            <footer className="footer">
                <a href="https://svitspindler.com/microsoft-automatic-rewards" target="_blank" rel="noopener noreferrer">Help</a>
                <a href="https://svitspindler.com/contact" target="_blank" rel="noopener noreferrer">Contact</a>
                <a href="https://github.com/spin311/MicrosoftRewardsWebsite" target="_blank" rel="noopener noreferrer">GitHub</a>
                <a href="https://svitspindler.com/donate" target="_blank" rel="noopener noreferrer">Donate</a>
            </footer>
        </>
    );
}

export default App;
