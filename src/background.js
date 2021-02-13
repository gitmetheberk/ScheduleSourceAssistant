// Install an onInstalled listener to set default storage values
chrome.runtime.onInstalled.addListener(function(details) {
    // Check the install event type [3]
    if (details.reason == "install"){
        console.log("chrome.runtime.onInstalled installation detected")
        
        // Initalize values in sync storage
        chrome.storage.sync.set({
            version: 0.1, 
            status: false
        })


    } else if (details.reason == "update"){
        console.log("chrome.runtime.onInstalled update detected")
        
        // Default the status to false following an update
        chrome.storage.sync.set({
            status: false
        })


    } else {
        console.error(["Invalid onInstalled reason", details.reason])
    }
  });

// Receive the message containing the HTML from schedule source
chrome.runtime.onMessage.addListener(function(request, sender) {
if (request.action == "getSource") {
    message.innerText = request.source;
}
console.log(message)
});

// Add a handler to catch the chrome.alarm events
chrome.alarms.onAlarm.addListener(function(alarm) {
    console.log("Service worker alarm, executing script")

    //* Temporary hardcoded configuration variables
    let schedulesource_url = "https://www.schedulesource.net/Enterprise/TeamWork5/Emp/Sch/#All"
    
    // Grab the schedule source tabId
    chrome.storage.sync.get({tabId: -1}, function(data){
        if (data.tabId == -1){
            console.log("tabId not set")
            return;
        }

        // Verify this tab exists and points to schedule source
        chrome.tabs.get(data.tabId, function(tab){
            if (tab.url != schedulesource_url){
                // TODO Implement error handling and user notification of the issue
                console.log("Schedule Source is not where it should be")
            } else {
                // First, reload to the tab to make sure we're getting the most up to date schedule information

                chrome.tabs.reload(data.tabId);
                console.log("reloading")

                // Provide a few seconds for page to load
                setInterval(() => {
                // [7]
                let code = `document.body.innerText;`;
                // http://infoheap.com/chrome-extension-tutorial-access-dom/
                chrome.tabs.executeScript(data.tabId, { code }, function (result) {
                // result has the return value from `code`
                    console.log(result)

                    // TODO Remove all HTML before <table and after </table>
                    // TODO Then, find that code to parse an html table into JSON (may need cleanup)
                    // TODO Convert times being read from table into relative epoch time
                    // TODO Calculate differences
                    // TODO Design notifications
                    // TODO V0.1 complete, begin user studies and alpha tests


                });
                }, 5000);
            }
        })
    });
});

// TODO Add a onStart handler to disable if the page is no longer open
// TODO Add an onClose handler for tabs to disable if the teamwork tab is closed
// TODO Icons for the manifest