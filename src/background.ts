import { checkLastOpened } from "./popup";


let active = false;
chrome.runtime.onStartup.addListener(function(){
    console.log("startup");
    chrome.storage.sync.get("active", function (result) {
      if (result.active === true) {
        active = true;
      }
    });
    });
chrome.runtime.onStartup.addListener(function(){
    console.log("startup");
    chrome.storage.sync.get("active", function (result) {
      if (result.active === true) {
        active = true;
      }
    });
    if (active) {
      checkLastOpened();
    }
  
  });

export function getActive(): boolean {
  return active;
}