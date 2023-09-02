
//opens 10 tabs with bing searches
function popup(): void {
  let format: string = "https://www.bing.com/search?q=";
  let searches: string[] = ["weather", "sport", "news", "stocks", "movies", "music", "games", "maps", "travel", "restaurants", "nba", "world cup"];
  for (let i: number = 0; i < searches.length; i++) {
    let url: string = format + searches[i];
    chrome.tabs.create({
      url: url, active: false
    },
      function (tab: any) {
        let idCurr: number = tab.id;
        //wait for tab to load before closing
        chrome.tabs.onUpdated.addListener(function listener(tabId: number, changeInfo: chrome.tabs.TabChangeInfo) {
          if (tabId === idCurr && changeInfo.status === "complete") {
            chrome.tabs.onUpdated.removeListener(listener);
            waitAndClose(idCurr);
          }

        });

      });


  }

}
let active = false;



//wait for popup to load before adding event listeners
document.addEventListener('DOMContentLoaded',
  function () {
    let autoBool = document.getElementById("autoCheckbox") as HTMLInputElement;
    const button = document.getElementById("button");
    if (button) {
      button.addEventListener("click", function () {

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
          checkLastOpened();
        }

      });

    }
  });


//check if user has already opened tabs today
function checkLastOpened(): void {
  console.log("checking...");
  const today = new Date().toLocaleDateString();
  chrome.storage.sync.get("lastOpened", function (result) {
    if (result.lastOpened === today) {
      console.log("already opened today");
    }
    else {
      popup();
      chrome.storage.sync.set({ "lastOpened": today });
    }
  });
}

//listen for message from background.ts
chrome.runtime.onMessage.addListener(function(message){
  if(message.active === true){
    checkLastOpened();
  }

});



//wait 1 second before closing tab
function waitAndClose(id: number): void {
  console.log("waitAndClose");
  setTimeout(function () {
    chrome.tabs.remove(id);
  }, 1000);
}
