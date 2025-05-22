
//opens 10 tabs with bing searches
function popup(): void {
  chrome.runtime.sendMessage({action: "popup"});
}
let active: boolean = true;
let level: number = 1;
let timeout: number = 7;

function setupDonateImage(donateImg: HTMLElement | null, donateText: HTMLElement | null) {
    if (donateImg && donateText) {
        donateText.addEventListener('mouseover', function () {
            donateImg.style.visibility = 'visible';
        });
    }
}

function setupDonateButton(button: HTMLButtonElement) {
    if (button) {
        button.addEventListener("click", function () {
            disableButton(button);
            popup();

        });
    }
}

//wait for popup to load before adding event listeners
document.addEventListener('DOMContentLoaded',
  async function () {
      let autoBool: HTMLInputElement = document.getElementById("autoCheckbox") as HTMLInputElement;
      let timeoutInput: HTMLInputElement = document.getElementById("timeout") as HTMLInputElement;
      const button: HTMLButtonElement = document.getElementById("button") as HTMLButtonElement;
      const selectLevel: HTMLSelectElement = document.getElementById("selectLevel") as HTMLSelectElement;
      const donateText: HTMLElement | null = document.getElementById('donateText');
      const donateImg: HTMLElement | null = document.getElementById('donateImg');
      setupDonateImage(donateImg, donateText);
      setupDonateButton(button);


      //check if user has already clicked the checkbox

      await setCheckboxState("autoCheckbox", "active");
      await setInputState("timeout", "timeout");


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
              chrome.storage.sync.set({"active": active});
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
              chrome.storage.sync.set({"timeout": timeoutInput.value});
              timeout = parseInt(timeoutInput.value);
          });
      }
      if (selectLevel) {
          chrome.storage.sync.get("level", function (result) {
              if (result.level) {
                  level = parseInt(result.level);
                  selectLevel.value = result.level;
              }
          });
          selectLevel.addEventListener("change", function () {
              chrome.storage.sync.set({"level": selectLevel.value});
              level = parseInt(selectLevel.value);
          });
      }

      await setSearchState();

  });

//disable button for a certain amount of time
function disableButton(button: HTMLButtonElement) {
  button.disabled = true;
  button.classList.replace("btn-success", "btn-fail");
  setTimeout(function () {
      button.disabled = false;
      button.classList.replace("btn-fail", "btn-success");
  }, 1000 + (level * 10 * timeout * 1000));
}

//check if user has already opened tabs today
function checkLastOpenedPopup(): void{
  chrome.runtime.sendMessage({action: "check"});
}

async function setSearchState(): Promise<void> {
    const wordsButton = document.getElementById("wordsBtn") as HTMLElement;
    const stringsButton = document.getElementById("stringsBtn") as HTMLElement;
    const { useWords } = await chrome.storage.sync.get("useWords");

    (useWords ? wordsButton: stringsButton).classList.add("active");

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

async function setInputState(elementId: string, storageKey: string): Promise<void> {
    const element = document.getElementById(elementId) as HTMLInputElement;
    if (!element) return;
    const result = await chrome.storage.sync.get(storageKey);
    if (result[storageKey] !== undefined) {
        element.value = result[storageKey];
    }
    element.addEventListener("change", async function (): Promise<void> {
        await chrome.storage.sync.set({[storageKey]: parseFloat(element.value)});
    });
}

async function setCheckboxState(elementId: string, storageKey: string): Promise<void> {
    const element = document.getElementById(elementId) as HTMLInputElement;
    if (!element) return;
    const result = await chrome.storage.sync.get(storageKey);
    if (result[storageKey] !== undefined) {
        element.checked = result[storageKey];
    }
    element.addEventListener("click", async function (): Promise<void> {
        await chrome.storage.sync.set({[storageKey]: element.checked});
    });
}
