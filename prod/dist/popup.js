//opens 10 tabs with bing searches
function popup() {
    chrome.runtime.sendMessage({ action: "popup" });
}

function setupDonateImage(donateImg, donateText) {
    if (donateImg && donateText) {
        donateText.addEventListener('mouseover', function () {
            donateImg.style.visibility = 'visible';
        });
    }
}

function setupDonateButton(button) {
    if (button) {
        button.addEventListener("click", function () {
            disableButton(button);
            popup();
        });
    }
}

let active = true;
let searchesNu = 10;
let timeout = 7;
//wait for popup to load before adding event listeners
document.addEventListener('DOMContentLoaded', async function () {
    const button = document.getElementById("button");
    const donateText = document.getElementById('donateText');
    const donateImg = document.getElementById('donateImg');

    setupDonateImage(donateImg, donateText);
    setupDonateButton(button);

    await setCheckboxState("autoCheckbox", "active");
    await setInputState("timeout", "timeout");
    await setInputState("searches", "searches");
    await setInputState("closeTime", "closeTime");

    await setSearchState();
});
//disable button for time it takes to complete searches
function disableButton(button) {
    button.disabled = true;
    button.classList.replace("btn-success", "btn-fail");
    button.innerHTML = "Loading rewards...";
    setTimeout(function () {
        button.disabled = false;
        button.innerHTML = "Get rewards";
        button.classList.replace("btn-fail", "btn-success");
    }, 1000 + ((searchesNu  - 1)* timeout * 1000));
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