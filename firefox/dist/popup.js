// popup.js

// Listen for messages from your background or content scripts
browser.runtime.onMessage.addListener(handlePopupMessages);

function handlePopupMessages(request) {
    if (request.action === "searchEnded") {
        const button = document.getElementById("button");
        enableButton(button);
    }
}

// Opens 10 tabs with Bing searches
function openSearches() {
    browser.runtime.sendMessage({ action: "popup" })
        .catch(err => console.error("Error sending popup message:", err));
}

function stopSearches() {
    browser.runtime.sendMessage({ action: "stop" })
        .catch(err => console.error("Error sending stop message:", err));
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
    try {
        const { isSearching } = await browser.storage.sync.get("isSearching");
        if (isSearching) {
            disableButton(button);
        }
    } catch (err) {
        console.error("Error reading isSearching from storage:", err);
    }

    button.addEventListener("click", async () => {
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
    try {
        const { referralClicked } = await browser.storage.local.get("referralClicked");
        if (referralClicked) {
            rewardsLink.href = "https://rewards.bing.com/";
        } else {
            rewardsLink.addEventListener("click", async () => {
                try {
                    await browser.storage.local.set({ referralClicked: true });
                } catch (err) {
                    console.error("Error setting referralClicked:", err);
                }
            });
        }
    } catch (err) {
        console.error("Error reading referralClicked from storage:", err);
    }
}

// Wait for popup to load before initializing
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await browser.action.setBadgeText({ text: "" });
    } catch (err) {
        console.error("Error clearing badge text:", err);
    }

    const button = document.getElementById("button");
    const donateText = document.getElementById('donateText');
    const donateImg = document.getElementById('donateImg');
    const rewardsLink = document.getElementById('rewardsLink');

    setupDonateImage(donateImg, donateText);
    await setupRewardsLink(rewardsLink);
    await setupSearchButton(button);

    await setCheckboxState("autoCheckbox", "active");
    await setCheckboxState("autoDaily", "autoDaily");
    await setInputState("timeout", "timeout");
    await setInputState("searches", "searches");
    await setInputState("closeTime", "closeTime");

    await setSearchState();
});

function disableButton(button) {
    button.classList.replace("btn-success", "btn-fail");
    button.innerHTML = "Stop searches";
}

function enableButton(button) {
    button.innerHTML = "Get rewards";
    button.classList.replace("btn-fail", "btn-success");
}

async function setSearchState() {
    const wordsButton = document.getElementById("wordsBtn");
    const stringsButton = document.getElementById("stringsBtn");
    try {
        const { useWords } = await browser.storage.sync.get("useWords");
        (useWords ? wordsButton : stringsButton).classList.add("active");
    } catch (err) {
        console.error("Error reading useWords from storage:", err);
    }

    wordsButton.addEventListener("click", async () => {
        wordsButton.classList.add("active");
        stringsButton.classList.remove("active");
        try {
            await browser.storage.sync.set({ useWords: true });
        } catch (err) {
            console.error("Error setting useWords:", err);
        }
    });

    stringsButton.addEventListener("click", async () => {
        stringsButton.classList.add("active");
        wordsButton.classList.remove("active");
        try {
            await browser.storage.sync.set({ useWords: false });
        } catch (err) {
            console.error("Error setting useWords:", err);
        }
    });
}

async function setInputState(elementId, storageKey) {
    const element = document.getElementById(elementId);
    if (!element) return;
    try {
        const result = await browser.storage.sync.get(storageKey);
        if (result[storageKey] !== undefined) {
            element.value = result[storageKey];
        }
    } catch (err) {
        console.error(`Error reading ${storageKey} from storage:`, err);
    }
    element.addEventListener("change", async () => {
        try {
            await browser.storage.sync.set({ [storageKey]: parseFloat(element.value) });
        } catch (err) {
            console.error(`Error setting ${storageKey}:`, err);
        }
    });
}

async function setCheckboxState(elementId, storageKey) {
    const element = document.getElementById(elementId);
    if (!element) return;
    try {
        const result = await browser.storage.sync.get(storageKey);
        if (result[storageKey] !== undefined) {
            element.checked = result[storageKey];
        }
    } catch (err) {
        console.error(`Error reading ${storageKey} from storage:`, err);
    }
    element.addEventListener("click", async () => {
        try {
            await browser.storage.sync.set({ [storageKey]: element.checked });
        } catch (err) {
            console.error(`Error setting ${storageKey}:`, err);
        }
    });
}
