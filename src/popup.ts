
//opens 10 tabs with bing searches
function popup(): void {
  chrome.runtime.sendMessage({action: "popup"});
}
let active = false;



//wait for popup to load before adding event listeners
document.addEventListener('DOMContentLoaded',
  function () {
    let autoBool = document.getElementById("autoCheckbox") as HTMLInputElement;
    const button = document.getElementById("button") as HTMLButtonElement;
    if (button) {
      button.addEventListener("click", function () {
        disableButton(button);
        popup();

      });
    }
    //check if user has already clicked the checkbox
    if (autoBool) {
      chrome.storage.sync.get("active", function (result) {
        if (result.active === true) {
          active = true;
          autoBool.checked = active;

        }
      });
      autoBool.addEventListener("click", function () {
        active = autoBool.checked;
        chrome.storage.sync.set({ "active": active });
        if (active) {
          checkLastOpenedPopup();
        }

      });

    }
  });



function disableButton(button: HTMLButtonElement): void {
  button.disabled = true;
  button.classList.replace("btn-primary","btn-secondary");
  setTimeout(function(){
    button.disabled = false;
    button.classList.replace("btn-secondary","btn-primary");
  },3000);


}

function checkLastOpenedPopup(): void{
  chrome.runtime.sendMessage({action: "check"});
}
