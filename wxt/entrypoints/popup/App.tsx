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

function App() {
    const [active, setActive] = useStorage<boolean>('active', DEFAULTS.active, StorageValues.SYNC);
    const [autoDaily, setAutoDaily] = useStorage<boolean>('autoDaily', DEFAULTS.autoDaily, StorageValues.SYNC);
    const [searches, setSearches] = useStorage<number>('searches', DEFAULTS.searches, StorageValues.SYNC);
    const [timeout, setTimeoutValue] = useStorage<number>('timeout', DEFAULTS.timeout, StorageValues.SYNC);
    const [closeTime, setCloseTime] = useStorage<number>('closeTime', DEFAULTS.closeTime, StorageValues.SYNC);
    const [accountLevel, setAccountLevel] = useStorage<string>('accountLevel', DEFAULTS.accountLevel, StorageValues.SYNC);
    const [openFirstResult, setOpenFirstResult] = useStorage<boolean>('openFirstResult', DEFAULTS.openFirstResult, StorageValues.SYNC);
    const [claimPoints, setClaimPoints] = useStorage<boolean>('claimPoints', DEFAULTS.claimPoints, StorageValues.SYNC);
    const [donateHover, setDonateHover] = useState(false);
    const { isLoaded, isSearching, completed, total } = useSearchProgress();

    // The "New" badge from an update is dismissed once the popup is opened — but
    // the badge doubles as the live search counter, so wait for the run state and
    // leave a running count alone.
    useEffect(() => {
        if (isLoaded && !isSearching) clearBadge();
    }, [isLoaded, isSearching]);

    // Only shown for a run that is in flight or already finished this session:
    // a zero count means nothing has run, and showing 0/5 would read as stalled.
    const hasRunToShow = isLoaded && (isSearching || completed > 0);

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
            <h3 className="container-fluid text-center mt-2 heading">Search automatic rewards</h3>
            <div className="container-fluid text-center my-2">
                <a href="https://svitspindler.com/microsoft-automatic-rewards" className="float-start links" target="_blank">Help</a>
                <a href="https://svitspindler.com/microsoft-automatic-rewards/mobile/test-app" className="float-start links" target="_blank">Mobile</a>
                <a className="links" href="https://svitspindler.com/contact" target="_blank" id="contact">Contact Me</a>
            </div>

            <div className="text-center">
                <ManualClaimButton isSearching={isSearching} />
                {hasRunToShow && (
                    <SearchProgressBar completed={completed} total={total} isSearching={isSearching} />
                )}
                <div className="checkboxes">
                    <div className="input-with-info">
                        <input className="form-check-input" type="checkbox" id="autoCheckbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
                        <label htmlFor="autoCheckbox">Daily searches</label>
                        <span className="tooltip-icon info" data-tooltip="Opens bing tabs the first time browser opens every day">ℹ</span>
                    </div>
                    <div className="input-with-info">
                        <input className="form-check-input" type="checkbox" id="autoDaily" checked={autoDaily} onChange={(e) => setAutoDaily(e.target.checked)} />
                        <label htmlFor="autoDaily">Daily set</label>
                        <span className="tooltip-icon info" data-tooltip="Opens bing rewards tab and completes daily tasks for extra points">ℹ</span>
                    </div>
                    <div className="input-with-info">
                        <input className="form-check-input" type="checkbox" id="claimPoints" checked={claimPoints} onChange={(e) => setClaimPoints(e.target.checked)} />
                        <label htmlFor="claimPoints">Claim points</label>
                        <span className="tooltip-icon info" data-tooltip="Opens bing rewards tab and presses Ready to claim, so earned points land in your balance. The tab briefly takes focus.">ℹ</span>
                    </div>
                    <div className="input-with-info">
                        <input className="form-check-input" type="checkbox" id="openFirstResult" checked={openFirstResult} onChange={(e) => setOpenFirstResult(e.target.checked)} />
                        <label htmlFor="openFirstResult">Open first result in search tabs</label>
                        <span className="tooltip-icon info" data-tooltip="In each opened search tab, navigate to the first result after a short random delay">ℹ</span>
                    </div>
                </div>

                <div className="left-align small-title">
                    <div className="ml-2">Extension for free games:</div>
                    <ul className="earn-list">
                        <li>
                            <a href="https://chromewebstore.google.com/detail/free-game-claimer-for-ste/mndghaafpgiinfecbbbcppppiblmjepk" className="normal-link" target="_blank" style={{ display: 'flex', alignItems: 'center', width: '100%', height: '100%' }}>
                                <img src="/imgs/free-games.png" alt="free games" className="earn-logo" />
                                Free games claimer for Steam & Epic
                            </a>
                        </li>
                    </ul>
                </div>
                <div className="left-align ml-2 small-title">Mobile app to earn more points:</div>
                <div className="website-header">
                    <div className="qr-code-with-text">
                        <img src="/imgs/svgs/qr-code-app.svg" alt="QR code" className="qr-code" />
                        <span className="website-phone-text">Scan on phone</span>
                    </div>
                    <a href="https://play.google.com/store/apps/details?id=com.spin311.microsoft_automatic_rewards" className="website-phone normal-link no-underline try-mobile" target="_blank" rel="noopener noreferrer">
                        <img className="website-phone-image" src="/imgs/mar-phone.png" alt="Microsoft Automatic Rewards Phone App" />
                        <div className="normal-color">Download App</div>
                    </a>
                </div>

                <div className="inputs">
                    <div className="width-100">
                        <div className="input-with-info">
                            <AccountLevelSelect value={accountLevel} onChange={handleLevelChange} />
                            <span className="tooltip-icon info" data-tooltip="Your Rewards level sets a default number of searches (Member 5, Silver 10, Gold 20)">ℹ</span>
                        </div>
                    </div>
                    <div className="width-100">
                        <div className="input-with-info">
                            <NumberInput id="searches" label="Number of searches" value={searches} min={1} max={999} onChange={setSearches} />
                            <span className="tooltip-icon info" data-tooltip="Number of random tabs to open in bing">ℹ</span>
                        </div>
                    </div>
                    <div>
                        <NumberInput id="timeout" label="Time between searches (s)" value={timeout} min={0} max={9999} onChange={setTimeoutValue} />
                        {isTimeoutRisky && (
                            <p className="field-warning" role="status">
                                ⚠ Under {RECOMMENDED_MIN_TIMEOUT_SECONDS}s, Microsoft often stops crediting the
                                searches, and the browser can stretch a short gap anyway.
                                {' '}{DEFAULTS.timeout}s or more is recommended.
                            </p>
                        )}
                    </div>
                    <div>
                        <NumberInput id="closeTime" label="Time before closing tabs (s)" value={closeTime} min={0} max={300} onChange={setCloseTime} />
                    </div>
                </div>
            </div>

            <div className="container-fluid text-center footer-links">
                <span>
                    <a href="https://github.com/spin311/MicrosoftRewardsWebsite" className="float-start links" target="_blank">Github</a>
                    <img src="/imgs/github.png" alt="github-logo" />
                </span>
                <a className="links" href="https://rewards.bing.com/" target="_blank" id="rewardsLink">Rewards</a>
                <span className="float-end" style={{ display: 'flex', alignItems: 'center' }}>
                    <a href="https://svitspindler.com/donate" className="links" target="_blank" id="donateText" onMouseOver={() => setDonateHover(true)}>Donate</a>
                    <img src="/imgs/justAGirlSmol.png" alt="Cat" id="donateImg" style={{ visibility: donateHover ? 'visible' : 'hidden' }} />
                </span>
            </div>
        </>
    );
}

export default App;
