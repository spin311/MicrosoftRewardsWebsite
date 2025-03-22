chrome.runtime.onMessage.addListener(handlePopupMessages);

function handlePopupMessages(request) {
    if (request.action === "searchEnded") {
        const button = document.getElementById("button");
        enableButton( button);
    }
}


//opens 10 tabs with bing searches
function openSearches() {
    chrome.runtime.sendMessage({ action: "popup" });
}

function stopSearches() {
    chrome.runtime.sendMessage({action: "stop"});
}

function setupDonateImage(donateImg, donateText) {
    if (donateImg && donateText) {
        donateText.addEventListener('mouseover', function () {
            donateImg.style.visibility = 'visible';
        });
    }
}

async function setupSearchButton(button) {
    if (button) {
        const {isSearching} = await chrome.storage.sync.get("isSearching");
        if (isSearching) {
            disableButton(button);
        }
        button.addEventListener("click", async function () {
            if (button.classList.contains('btn-fail')) {
                enableButton(button);
                stopSearches();
            } else {
                disableButton(button);
                openSearches();
            }

        });
    }
}
//wait for popup to load before adding event listeners
document.addEventListener('DOMContentLoaded', async function () {
    const button = document.getElementById("button");
    const donateText = document.getElementById('donateText');
    const donateImg = document.getElementById('donateImg');

    setupDonateImage(donateImg, donateText);
    await setupSearchButton(button);

    await setCheckboxState("autoCheckbox", "active");
    await setCheckboxState("autoDaily", "autoDaily");
    await setInputState("timeout", "timeout");
    await setInputState("searches", "searches");
    await setInputState("closeTime", "closeTime");

    await setSearchState();
});
//disable button for time it takes to complete searches
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
    const { useWords } = await chrome.storage.sync.get("useWords");

    (useWords ? wordsButton  : stringsButton).classList.add("active");

    wordsButton.addEventListener("click", async () => {
        wordsButton.classList.add("active");
        stringsButton.classList.remove("active");
        await chrome.storage.sync.set({ useWords: true });
    });

    stringsButton.addEventListener("click", async () => {
        stringsButton.classList.add("active");
        wordsButton.classList.remove("active");
        await chrome.storage.sync.set({ useWords: false });
    });
}

async function setInputState(elementId, storageKey) {
    const element = document.getElementById(elementId);
    if (!element) return;
    const result = await chrome.storage.sync.get(storageKey);
    if (result[storageKey] !== undefined) {
        element.value = result[storageKey];
    }
    element.addEventListener("change", async function () {
        await chrome.storage.sync.set({[storageKey]: parseFloat(element.value)});
    });
}

async function setCheckboxState(elementId, storageKey) {
    const element = document.getElementById(elementId);
    if (!element) return;
    const result = await chrome.storage.sync.get(storageKey);
    if (result[storageKey] !== undefined) {
        element.checked = result[storageKey];
    }
    element.addEventListener("click", async function () {
        await chrome.storage.sync.set({[storageKey]: element.checked});
    });
}