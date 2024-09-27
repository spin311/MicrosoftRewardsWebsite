//opens 10 tabs with bing searches
function popup() {
    chrome.runtime.sendMessage({ action: "popup" });
}

let active = true;
let searchesNu = 10;
let timeout = 7;
//wait for popup to load before adding event listeners
document.addEventListener('DOMContentLoaded', function () {
    const autoBool = document.getElementById("autoCheckbox");
    const timeoutInput = document.getElementById("timeout");
    const button = document.getElementById("button");
    const searches = document.getElementById("searches");
    const donateText = document.getElementById('donateText');
    const donateImg = document.getElementById('donateImg');
    const closeTime = document.getElementById('closeTime');
    if (donateImg && donateText) {
        donateText.addEventListener('mouseover', function () {
            donateImg.style.visibility = 'visible';
        });
    }
    if (button) {
        button.addEventListener("click", function () {
            disableButton(button);
            popup();
        });
    }
    //check if user has already clicked the checkbox
    if (autoBool) {
        chrome.storage.sync.get("active", function (result) {
            if (result.active) {
                active = true;
                autoBool.checked = active;
            }
        });
        //listen for checkbox click
        autoBool.addEventListener("click", function () {
            active = autoBool.checked;
            chrome.storage.sync.set({ "active": active });
            if (active) {
                checkLastOpenedPopup();
            }
        });
    }
    if (timeoutInput) {
        chrome.storage.sync.get("timeout", function (result) {
            if (result.timeout) {
                timeout = parseInt(result.timeout);
                timeoutInput.value = result.timeout;
            }
        });
        timeoutInput.addEventListener("change", function () {
            chrome.storage.sync.set({ "timeout": timeoutInput.value });
            timeout = parseInt(timeoutInput.value);
        });
    }
    if (searches) {
        chrome.storage.sync.get("searches", function (result) {
            if (result.searches) {
                searchesNu = parseInt(result.searches);
                searches.value = result.searches;
            }
        });
        searches.addEventListener("change", function () {
            chrome.storage.sync.set({ "searches": searches.value });
            searchesNu = parseInt(searches.value);
        });
    }
    if (closeTime) {
        chrome.storage.sync.get("closeTime", function (result) {
            if (result.closeTime) {
                closeTime.value = result.closeTime;
            }
        });
        closeTime.addEventListener("change", function () {
            chrome.storage.sync.set({ "closeTime": closeTime.value });
        });
    }
});
//disable button for 2 seconds
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
//check if user has already opened tabs today
function checkLastOpenedPopup() {
    chrome.runtime.sendMessage({ action: "check" });
}
