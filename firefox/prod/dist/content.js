// content.js (Firefox WebExtension)
'use strict';

browser.runtime.onMessage.addListener(handleContentMessage);

const targetSelector = '#daily-sets > mee-card-group:nth-child(7) > div';

function waitForElement(selector) {
    return new Promise((resolve) => {
        const observer = new MutationObserver(() => {
            const target = document.querySelector(selector);
            if (target) {
                observer.disconnect();
                resolve(target);
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        const target = document.querySelector(selector);
        if (target) {
            observer.disconnect();
            resolve(target);
        }
    });
}

function handleContentMessage(request) {
    if (request.action === 'openDaily') {
        void openDailySets();
    }
}

async function openDailySets() {
    const targetNode = await waitForElement(targetSelector);
    if (!targetNode) return;
    const targetLinks = targetNode.getElementsByClassName('ds-card-sec ng-scope');
    for (const link of targetLinks) {
        link.click();
        await contentDelay(1000 + contentGetRandomNumber(0, 1000));
    }
}

function contentDelay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function contentGetRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}
