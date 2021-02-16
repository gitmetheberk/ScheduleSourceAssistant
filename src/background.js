// Install an onInstalled listener to set default storage values
chrome.runtime.onInstalled.addListener(function(details) {
    // Check the install event type [3]
    if (details.reason == "install"){
        console.log("chrome.runtime.onInstalled installation detected")
        
        // Initalize values in sync storage
        chrome.storage.sync.set({
            version: 0.1, 
            status: false,

            // Configuration variables
            schedulesource_url: "https://www.schedulesource.net/Enterprise/TeamWork5/Emp/Sch/#All",
            interval_minutes: 15,  // Length of the interval (15 for deployment)
            range_minutes: 7,  // 0 <= range_minutes < interval_minutes/2, margin around time to check to activate, mostly used during testing, will be deprecated with better logic in the future
            check_on_15: true,  // Determines if the extension should check on 15,45 minute intervals, only here incase send_empty_notification is enabled
            send_empty_notification: true,  // If true, notifications of "No shift changes occuring" will be sent
            before_minutes: 0,  // Minutes before 00, 15, 30, 45 the alarm will trigger
            padding_minutes: 5,  // Upon activating the extension, number of minutes past 00, 15, 30, 45 where it will still trigger
            shifts_to_show: ["Phones", "Bomgar", "Tier 2"]  // Array of strings, shift types to show     
        })


    } else if (details.reason == "update"){
        console.log("chrome.runtime.onInstalled update detected")
        
        // Default the status to false following an update
        chrome.storage.sync.set({
            status: false
        })

        // TODO Add method to determine if any new sync variables need to be created and then create them


    } else {
        console.error(["Invalid onInstalled reason", details.reason])
    }
  });


// [8] - Hanlder to enable popup.html when the icon is activated (weird this doesn't happen automatically, right?)
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.message === "activate_icon") {
        chrome.pageAction.show(sender.tab.id);
    } //console.log("Message received")
});


// Add a handler to catch the chrome.alarm events
chrome.alarms.onAlarm.addListener(function(alarm) {
    // Check that it's the run alarm or the run_once alarm
    if (alarm.name != 'run' && alarm.name != 'run_once'){
        console.log(`Unknown alarm '${alarm.name}' detected`)
        return
    }

// Load configuration variables from storage (welcome to the highest level of callback hell (I didn't tab this because there are two many tabs as is))
chrome.storage.sync.get({
    schedulesource_url: "https://www.schedulesource.net/Enterprise/TeamWork5/Emp/Sch/#All",  // This is here as a failsafe in the event the URL changes in the future and needs to be configured manually
    interval_minutes : 15,
    range_minutes: 7,  // 0 <= range_minutes < interval_minutes/2, margin around time to check to activate, mostly used during testing, will be deprecated with better logic in the future
    check_on_15: true,  // Determines if the extension should check on 15,45 minute intervals, only here incase send_empty_notification is enabled
    send_empty_notification: false,  // If true, notifications of "No shift changes occuring" will be sent
    shifts_to_show: []
}, function(configuration_dict){
    if (configuration_dict.shifts_to_show.length == 0){
        console.error("shifts_to_show.length = 0, something has gone wrong")
        return;
    }
    
    // TODO It may make more sense to store this in local storage
    // Grab the schedule source tabId
    chrome.storage.sync.get({tabId: -1}, function(data){
        if (data.tabId == -1){
            console.log("tabId not set")
            return;
        }

        // Verify this tab exists and points to schedule source
        chrome.tabs.get(data.tabId, function(tab){
            // [11] Check to make sure the async function didn't throw an error, indicating the tab doesn't exist
            if (chrome.runtime.lastError) {
                console.log(`Error in background.js in tabs.get: ${chrome.runtime.lastError.message}`);
                chrome.tabs.executeScript(undefined, {code: `window.alert("The tab containing schedule source could not be found, Schedule Source Assistant is now disabled")`})

                // Set the status to disabled and invalidate the tabid
                chrome.storage.sync.set({tabId: -1, status: false})

            } else if (tab.url != configuration_dict.schedulesource_url){
                chrome.storage.sync.set({tabId: -1, status: false})
                chrome.tabs.executeScript(undefined, {code: `window.alert("The tab containing schedule source could not be found, Schedule Source Assistant is now disabled")`})
                
                // Set the status to disabled and invalidate the tabid
                chrome.storage.sync.set({tabId: -1, status: false})

            } else {
                // First, reload to the tab to make sure we're getting the most up to date schedule information
                //! Make sure this isn't commented out before creating a release
                chrome.tabs.reload(data.tabId);

                // Find the current shift change
                let now = new Date;
                let minutes = now.getMinutes();
                let time_to_check

                if ((minutes % configuration_dict.interval_minutes) == 0){
                    // We're on an interval
                    time_to_check = minutes + now.getHours() * 60

                } else if (minutes <= configuration_dict.range_minutes){
                    // We just passed the beginning of an hour
                    time_to_check = now.getHours() * 60

                } else if (minutes >= 60 - configuration_dict.range_minutes) {
                    // We're coming up on an hour
                    time_to_check = (now.getHours() + 1) * 60

                } else {
                    // TODO Fix the edge cases when the extension shouldn't be running by resetting the alarm
                    // Must be 15, 30, or 45
                    if ((minutes >= 15 - configuration_dict.range_minutes) && (minutes <= 15 + configuration_dict.range_minutes)){
                        time_to_check = (now.getHours()) * 60 + 15
                    } else if ((minutes >= 30 - configuration_dict.range_minutes) && (minutes <= 30 + configuration_dict.range_minutes)){
                        time_to_check = (now.getHours()) * 60 + 30
                    } else if ((minutes >= 45 - configuration_dict.range_minutes) && (minutes <= 45 + configuration_dict.range_minutes)){
                        time_to_check = (now.getHours()) * 60 + 45
                    } else {
                        console.error("Invalid or unknown time interval")
                    }
                }
                // Error correction for the edge case of midnight (I really hate AM/PM)
                if (now.getHours() == 0){
                    time_to_check += 60 * 24
                }

                console.log(`Shift change minutes: ${time_to_check}`)

                // Check for check_on_15 option (does not check on :15 or :45)
                if (!configuration_dict.check_on_15 && ((time_to_check % 15) == 0) && ((time_to_check % 60) != 30)){
                    console.log("Aborting due to check_on_15")
                    return;
                }
                

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

                    // Hardcoded splice, maybe find programatically? Not sure
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
                    for (let i = 0; i < rows.length; i++){
                        // Loop through start and end times
                        for (let j = 6; j < 8; j++){
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

                    // Find the technicians getting on
                    let technicians_starting = [];
                    let technicians_ending = [];
                    rows.forEach(function(row, index){
                        if (row[6] == time_to_check && row[3] != "---EMPTY---"){
                            //technicians_starting.push(`${row[3]} - ${row[2]}`)
                            if (configuration_dict.shifts_to_show.includes(row[2])){
                                technicians_starting.push(row)
                            }
                        
                        // Check for ending shift
                        } else if (row[7] == time_to_check && row[3] != "---EMPTY---"){
                            //technicians_ending.push(`${row[3]} - ${row[2]}`)
                            if (configuration_dict.shifts_to_show.includes(row[2])){
                                technicians_ending.push(row)
                            }
                        }
                    });

                    console.log(technicians_starting)
                    console.log(technicians_ending)
                    console.log(rows)

                    // Calculate the hour in terms of AM & PM for notification titles
                    let hour_AMPM;
                    let AMPM;
                    if (Math.floor(time_to_check / 60) > 12){
                        hour_AMPM = now.getHours() - 12
                        AMPM = "PM"
                    } else if (Math.floor(time_to_check / 60) == 12){
                        hour_AMPM = 12
                        AMPM = "PM"
                    } else if (time_to_check < 60){
                        hour_AMPM = 12
                        AMPM = "AM"
                    } else {
                        hour_AMPM = now.getHours()
                        AMPM = "AM"
                    }

                    // Notifications
                    if (technicians_starting.length == 0 && technicians_ending.length == 0){
                        console.log("No shift changes occuring")

                        // If no shifts are changing, send a basic notification
                        if (configuration_dict.send_empty_notification) {
                            let notification = {
                                type: 'basic',
                                title: `No shift changes occuring ${hour_AMPM}:${((time_to_check % 60) < 10) ? "0" : ""}${time_to_check % 60} ${AMPM}`,
                                message: ``,
                                iconUrl: "images/icon48.png",
                            }
                            chrome.notifications.create(undefined, notification)
                        }
                    } else {
                        // Determine title
                        let title;
                        if (technicians_starting.length != 0 && technicians_ending.length == 0){
                            title = `Shifts starting ${hour_AMPM}:${((time_to_check % 60) < 10) ? "0" : ""}${time_to_check % 60} ${AMPM}`
                        } else if (technicians_starting.length == 0 && technicians_ending.length != 0){
                            title = `Shifts ending ${hour_AMPM}:${((time_to_check % 60) < 10) ? "0" : ""}${time_to_check % 60} ${AMPM}`
                        } else {
                            title = `Shift change ${hour_AMPM}:${((time_to_check % 60) < 10) ? "0" : ""}${time_to_check % 60} ${AMPM}`
                        }

                        // Construct and send the notification (yes, I know the logic is redundant, but it's cleaner to have it in one place)
                        let notif_Items = [];
                        if (technicians_starting.length != 0){
                            // notif_Items.push({
                            //     title: `Technicians starting`,
                            //     message: ``
                            // })
                            technicians_starting.forEach(function(shift){
                                notif_Items.push({
                                    title: `${shift[3]}`,
                                    message: `${shift[2]}`
                                })
                            })
                        }
                        if (technicians_ending.length != 0){
                            // notif_Items.push({
                            //     title: `Technicians ending`,
                            //     message: ``
                            // })
                            technicians_ending.forEach(function(shift){
                                notif_Items.push({
                                    title: `${shift[3]}`,
                                    message: `Shift ending`
                                })
                            })
                        }

                        // Add in overflow warnings
                        if (technicians_starting.length >= 4){
                            notif_Items.splice(3, 0, {
                                title: `${technicians_starting.length - 3} more starting`,
                                message: `${technicians_ending.length} ending`
                            })
                        } else if (technicians_starting.length == 3 && technicians_ending.length > 1){
                            notif_Items.splice(3, 0, {
                                title: `${0} more starting`,
                                message: `${technicians_ending.length} ending`
                            })
                        } else if (technicians_ending.length > 4){
                            notif_Items.splice(3, 0, {
                                title: `${0} more starting`,
                                message: `${technicians_ending.length - 3} ending`
                            })
                        }

                        console.log(notif_Items)
                        
                        // Form the notification and send
                        let notification = {
                            type: 'list',
                            title: title,
                            message: "",
                            iconUrl: "images/icon48.png",
                            items: notif_Items
                        }           
                        chrome.notifications.create(undefined, notification)
                    }

                });
                // Delay following page reload in ms (5 seconds might not be long enough, upped to 7.5 seconds)
                }, 7500);
            }
        })
    });
});
});


// On start up, clear out the tabid and set the status to false
chrome.runtime.onStartup.addListener(function() {
    chrome.storage.sync.set({
        tabId: -1,
        status: false
    });
});


// TODO Add check for limited media dispaly schedule source
// TODO Account for cases where a technician is getting off & getting on (maybe just say transitioning techs?)
// TODO Verify schedule source date is correct