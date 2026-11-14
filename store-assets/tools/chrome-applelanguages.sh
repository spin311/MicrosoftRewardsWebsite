#!/bin/bash
# Starts Chrome with the macOS argument -AppleLanguages "(<tag>)". On macOS that is
# how Chrome gets a UI language for one run (it ignores --lang there): its menus,
# chrome.i18n.getUILanguage() and the extension's catalogue then follow the tag.
# capture.mjs --locale runs this as Playwright's browser executable, because
# Playwright refuses arguments that aren't --switches.
#   STORE_CHROME_BINARY   the Chrome to start (capture.mjs passes Playwright's Chromium)
#   STORE_APPLE_LANGUAGE  the language tag, e.g. pt-BR
# Chrome also reads "(<tag>)" as a page to open, and headless Chrome allows only one
# start page, so Playwright's trailing about:blank is dropped.
args=("$@")
if [ "${#args[@]}" -gt 0 ] && [ "${args[${#args[@]}-1]}" = "about:blank" ]; then
    unset 'args[${#args[@]}-1]'
fi
exec "$STORE_CHROME_BINARY" "${args[@]}" -AppleLanguages "(${STORE_APPLE_LANGUAGE:?})"
