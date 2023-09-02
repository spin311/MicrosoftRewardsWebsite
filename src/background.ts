// import { checkLastOpened } from "./popup";


chrome.runtime.onStartup.addListener(function(){
    console.log("startup");
    chrome.storage.sync.get("active", function (result) {
      if (result.active === true) {
        chrome.runtime.sendMessage({active: true});
      }
    });
    });


// export function getActive(): boolean {
//   return active;
// }