import { getActive } from "./background";

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




document.addEventListener('DOMContentLoaded',
  function () {
    let autoBool = document.getElementById("autoCheckbox") as HTMLInputElement;
    const button = document.getElementById("button");
    if (button) {
      button.addEventListener("click", function () {

        popup();
      });
    }
    if (autoBool) {
      // chrome.storage.sync.get("active", function (result) {
      //   if (result.active === true) {
      //     active = true;
      //   }
      // });
      autoBool.checked = getActive();
      autoBool.addEventListener("click", function () {
        active = autoBool.checked;
        chrome.storage.sync.set({ "active": active });
        //maybe comment this part out
        if (active) {
          checkLastOpened();
        }

      });
        //maybe comment this part out
      if (active) {
        checkLastOpened();
      }
    }
  });



export function checkLastOpened(): void {
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




function waitAndClose(id: number): void {
  console.log("waitAndClose");
  setTimeout(function () {
    chrome.tabs.remove(id);
  }, 1000);
}
