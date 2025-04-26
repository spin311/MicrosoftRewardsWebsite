// content-script.js

// Listen for messages from your background or popup scripts
browser.runtime.onMessage.addListener(handleContentMessage);

const targetSelector = '#daily-sets > mee-card-group:nth-child(7) > div';

async function waitForElement(selector) {
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
    console.log("handling request", request);
    if (request.action === "openDaily") {
        openDailySets();
    }
}

async function openDailySets() {
    const targetNode = await waitForElement(targetSelector);
    console.log("targetNode", targetNode);
    if (!targetNode) return;

    const targetLinks = targetNode.getElementsByClassName("ds-card-sec ng-scope");
    console.log("targetLinks", targetLinks);
    for (const link of targetLinks) {
        link.click();
        await contentDelay(1000 + contentGetRandomNumber(0, 1000));
    }

    alertBackground("closeBingTabs");
}

function alertBackground(message) {
    // sendMessage returns a Promise in Firefox
    browser.runtime.sendMessage({ action: message })
        .catch(err => console.error("Failed to send message:", err));
}

function shouldOpenDaily(autoDaily, lastDaily) {
    if (!autoDaily) return false;
    const today = new Date().toLocaleDateString();
    if (lastDaily !== today) {
        // storage.sync.set returns a Promise
        browser.storage.sync.set({ lastDaily: today })
            .catch(err => console.error("Storage error:", err));
    }
    return lastDaily !== today;
}

function contentDelay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function contentGetRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}
