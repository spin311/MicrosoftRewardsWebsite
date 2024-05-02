
//opens 10 tabs with bing searches
function popup(): void {
  chrome.runtime.sendMessage({action: "popup"});
}
let active = true;

//wait for popup to load before adding event listeners
document.addEventListener('DOMContentLoaded',
  function () {
    let autoBool: HTMLInputElement = document.getElementById("autoCheckbox") as HTMLInputElement;
    let timeoutInput: HTMLInputElement = document.getElementById("timeout") as HTMLInputElement;
    const button: HTMLButtonElement = document.getElementById("button") as HTMLButtonElement;
    const selectLevel: HTMLSelectElement = document.getElementById("selectLevel") as HTMLSelectElement;
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
            if (result.timeout) timeoutInput.value = result.timeout;
        });
        timeoutInput.addEventListener("change", function () {
            chrome.storage.sync.set({ "timeout": timeoutInput.value });
        });
    }
    if(selectLevel) {
      chrome.storage.sync.get("level", function (result) {
        if (result.level) selectLevel.value = result.level;
      });
      selectLevel.addEventListener("change", function () {
        chrome.storage.sync.set({ "level": selectLevel.value });
      });
    }

  });

//disable button for 2 seconds
function disableButton(button: HTMLButtonElement) {
  button.disabled = true;
  button.classList.replace("btn-success", "btn-fail");
  setTimeout(function () {
      button.disabled = false;
      button.classList.replace("btn-fail", "btn-success");
  }, 2000);
}

//check if user has already opened tabs today
function checkLastOpenedPopup(): void{
  chrome.runtime.sendMessage({action: "check"});
}
