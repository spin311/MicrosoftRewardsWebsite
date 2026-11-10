import { useEffect, useId, useRef, useState } from 'react';

// The referrer shows up in Play Console's acquisition reports. The QR code
// encodes the plain listing URL instead, so it stays sparse enough to scan off
// a screen.
export const PHONE_APP_URL =
    'https://play.google.com/store/apps/details?id=com.spin311.microsoft_automatic_rewards&referrer=utm_source%3Dextension%26utm_medium%3Dpopup';

// The promo tile for the Android app. The popup has no room to keep a QR code on
// screen (a run's progress panel already takes it to ~580 of Chrome's 600px), so
// the tile opens one in a panel that floats above the tiles without changing the
// popup's height. Escape, a click outside or focus moving out closes it.
export default function PhoneAppTile() {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const tileRef = useRef<HTMLButtonElement>(null);
    const panelId = useId();

    useEffect(() => {
        if (!isOpen) return;
        const isInside = (target: EventTarget | null): boolean =>
            target instanceof Node && (wrapperRef.current?.contains(target) ?? false);
        function closeIfOutside(event: Event): void {
            if (!isInside(event.target)) setIsOpen(false);
        }
        function handleKeyDown(event: KeyboardEvent): void {
            if (event.key !== 'Escape') return;
            setIsOpen(false);
            // Back to the tile, unless focus is already somewhere else on purpose.
            const focused = document.activeElement;
            if (!focused || focused === document.body || isInside(focused)) tileRef.current?.focus();
        }
        // focusin, not blur: a click on the QR code moves focus to nothing, and that
        // must not close the panel.
        document.addEventListener('pointerdown', closeIfOutside);
        document.addEventListener('focusin', closeIfOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('pointerdown', closeIfOutside);
            document.removeEventListener('focusin', closeIfOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen]);

    return (
        <div className="phone-app" ref={wrapperRef}>
            <button
                ref={tileRef}
                type="button"
                className="promo-tile"
                title="Get the Android app"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setIsOpen((wasOpen) => !wasOpen)}
            >
                <span className="promo-icon" aria-hidden="true">📱</span>
                <span className="promo-text"><strong>Phone app</strong></span>
            </button>
            {/* Always rendered (hidden when closed) so aria-controls points at something. */}
            <div className="phone-app-panel" id={panelId} role="group" aria-label="Android app" hidden={!isOpen}>
                <img src="/imgs/svgs/qr-code-app.svg" alt="QR code for the app on Google Play" className="phone-app-qr" width={90} height={90} />
                <div className="phone-app-text">
                    <p className="prompt-card-title">Get the Android app</p>
                    <p className="prompt-card-body">Scan with your phone, or</p>
                    <a href={PHONE_APP_URL} className="prompt-card-primary phone-app-link" target="_blank" rel="noopener noreferrer">
                        Open Google Play
                    </a>
                </div>
            </div>
        </div>
    );
}
