// popup.js (Firefox WebExtension)
'use strict';

browser.runtime.onMessage.addListener(handlePopupMessages);

function handlePopupMessages(request) {
    if (request.action === 'searchEnded') {
        const button = document.getElementById('button');
        enableButton(button);
    }
}

// opens searches
function openSearches() {
    void browser.runtime.sendMessage({ action: 'popup' });
}

function stopSearches() {
    void browser.runtime.sendMessage({ action: 'stop' });
}

function setupDonateImage(donateImg, donateText) {
    if (donateImg && donateText) {
        donateText.addEventListener('mouseover', () => {
            donateImg.style.visibility = 'visible';
        });
    }
}

async function setupSearchButton(button) {
    if (!button) return;

    const result = await browser.storage.sync.get('isSearching');
    if (result.isSearching) {
        disableButton(button);
    }

    button.addEventListener('click', async () => {
        if (button.classList.contains('btn-fail')) {
            enableButton(button);
            stopSearches();
        } else {
            disableButton(button);
            openSearches();
        }
    });
}

async function setupRewardsLink(rewardsLink) {
    if (!rewardsLink) return;

    const result = await browser.storage.local.get('referralClicked');
    if (result.referralClicked) {
        rewardsLink.href = 'https://rewards.bing.com/';
    } else {
        rewardsLink.addEventListener('click', async () => {
            await browser.storage.local.set({ referralClicked: true });
        });
    }
}

// DOMContentLoaded
document.addEventListener('DOMContentLoaded', async () => {
    // Use browser.browserAction for MV2 APIs
    await browser.browserAction.setBadgeText({ text: '' });

    const button = document.getElementById('button');
    const donateText = document.getElementById('donateText');
    const donateImg = document.getElementById('donateImg');
    const rewardsLink = document.getElementById('rewardsLink');

    setupDonateImage(donateImg, donateText);
    // await setupRewardsLink(rewardsLink);
    await setupSearchButton(button);

    await setCheckboxState('autoCheckbox', 'active');
    await setCheckboxState('autoDaily', 'autoDaily');
    await setInputState('timeout', 'timeout');
    await setInputState('searches', 'searches');
    await setInputState('closeTime', 'closeTime');

    await setSearchState();
});

function disableButton(button) {
    button.classList.replace('btn-success', 'btn-fail');
    button.textContent = 'Stop searches';
}

function enableButton(button) {
    button.textContent = 'Get rewards';
    button.classList.replace('btn-fail', 'btn-success');
}

async function setSearchState() {
    const wordsButton = document.getElementById('wordsBtn');
    const stringsButton = document.getElementById('stringsBtn');
    const result = await browser.storage.sync.get('useWords');
    const useWords = result.useWords;

    (useWords ? wordsButton : stringsButton).classList.add('active');

    wordsButton.addEventListener('click', async () => {
        wordsButton.classList.add('active');
        stringsButton.classList.remove('active');
        await browser.storage.sync.set({ useWords: true });
    });

    stringsButton.addEventListener('click', async () => {
        stringsButton.classList.add('active');
        wordsButton.classList.remove('active');
        await browser.storage.sync.set({ useWords: false });
    });
}

async function setInputState(elementId, storageKey) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const result = await browser.storage.sync.get(storageKey);
    if (result[storageKey] !== undefined) {
        element.value = result[storageKey];
    }
    element.addEventListener('change', async () => {
        await browser.storage.sync.set({ [storageKey]: parseFloat(element.value) });
    });
}

async function setCheckboxState(elementId, storageKey) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const result = await browser.storage.sync.get(storageKey);
    if (result[storageKey] !== undefined) {
        element.checked = result[storageKey];
    }
    element.addEventListener('click', async () => {
        await browser.storage.sync.set({ [storageKey]: element.checked });
    });
}
