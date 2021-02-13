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
    let interval_minutes = 15  // Length of the interval (15 for deployment)
    
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
                setTimeout(() => {
                // [7]
                let code = `document.body.innerText;`;
                // http://infoheap.com/chrome-extension-tutorial-access-dom/
                chrome.tabs.executeScript(data.tabId, { code }, function (result) {
                    // TODO Error detection for bad data from SS
                    // result has the return value from `code` which should be an array of length one
                    result = result[0]

                    // Split the string based on the new line charactersin the table
                    let rows = result.split(/\n/)

                    // TODO Find the location the schedule starts instead of hardcoding it
                    // Remove excess rows from rows
                    rows.splice(0,39)
                    
                    // Split each row based on tabs
                    rows.forEach(function(row, index) {
                        rows[index] = row.split(/\t/);
                    });

                    /* Row[idx] breakdown
                       idx=1 = date
                       idx=2 = shift type
                       idx=3 = name
                       idx=6 = start time
                       idx=7 = end time
                       idx=9 = length in hours (can be used as a checksum)
                    */

                    // Convert start and end times to relative minutes into the day, ex. 8am = 480
                    for (i = 0; i < rows.length; i++){
                        // Loop through start and end times
                        for (j = 6; j < 8; j++){
                            // Get the hour and minute out of the string, time = [hour, minute]
                            let time = rows[i][j].split(":")
                            let pm = time[1].endsWith("PM");
                            time[1] = time[1].split(" ")[0]

                            // Conert to minutes into the day
                            rows[i][j] = parseInt(time[0]) * 60 + parseInt(time[1])

                            // Check am/pm (accounting for edge cases)
                            if ((pm && time[0] != 12) || (!pm && time[0] == 12)){
                                rows[i][j] = rows[i][j] + 720
                            }
                        }
                    }
                    //* Hardcoded configuration values
                    let range_minutes = 7;

                    // Find the current shift change
                    let now = new Date;
                    let minutes = now.getMinutes();
                    let time_to_check

                    if ((minutes % interval_minutes) == 0){
                        // We're on an interval
                        time_to_check = minutes + now.getHours() * 60

                    } else if (minutes <= range_minutes){
                        // We just passed the beginning of an hour
                        time_to_check = now.getHours() * 60

                    } else if (minutes >= 60 - range_minutes) {
                        // We're coming up on an hour
                        time_to_check = (now.getHours() + 1) * 60

                    } else {
                        // TODO Fix the edge cases when the extension shouldn't be running by resetting the alarm
                        // TODO This could possibly be better done with a loop
                        // Must be 15, 30, or 45
                        if ((minutes >= 15 - range_minutes) && (minutes <= 15 + range_minutes)){
                            time_to_check = (now.getHours()) * 60 + 15
                        } else if ((minutes >= 30 - range_minutes) && (minutes <= 30 + range_minutes)){
                            time_to_check = (now.getHours()) * 60 + 30
                        } else if ((minutes >= 45 - range_minutes) && (minutes <= 45 + range_minutes)){
                            time_to_check = (now.getHours()) * 60 + 45
                        } else {
                            console.error("Invalid or unknown time interval")
                        }
                    }

                    console.log(`Shift change minutes: ${time_to_check}`)


                    // TODO It would be more efficient to do this earlier when we're already looping through technicians
                    // Find the technicians getting on
                    let technicians_starting = [];
                    let technicians_ending = [];
                    rows.forEach(function(row, index){
                        // Check for starting shift
                        if (row[6] == time_to_check){
                            technicians_starting.push(`${row[3]} - ${row[2]}`)
                        
                        // Check for ending shift
                        } else if (row[7] == time_to_check){
                            technicians_ending.push(`${row[3]} - ${row[2]}`)
                        }
                    });

                    console.log(technicians_starting)
                    console.log(technicians_ending)
                    console.log(rows)

                    // Notifications
                    let notif = {
                        type: 'basic',
                        title: 'notification test',
                        message: "big test",
                        iconUrl: undefined
                    }
                      chrome.notifications.create('limitNotif', notif)

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
// TODO Add check for limited media dispaly schedule source
// TODO Account for cases where a technician is getting off & getting on (maybe just say transitioning techs?)