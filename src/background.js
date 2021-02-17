// Install an onInstalled listener to set default storage values
chrome.runtime.onInstalled.addListener(function(details) {
    // Check the install event type [3]
    if (details.reason == "install"){
        console.log("chrome.runtime.onInstalled installation detected")
        
        // Initalize values in sync storage
        chrome.storage.sync.set({
            version: 1.0, 
            status: false,

            // Configuration variables
            schedulesource_url: "schedulesource.net/Enterprise/TeamWork5/Emp/Sch/#All",
            interval_minutes: 15,  // Length of the interval (15 for deployment)
            range_minutes: 7,  // 0 <= range_minutes < interval_minutes/2, margin around time to check to activate, mostly used during testing, will be deprecated with better logic in the future
            // Deprecated: check_on_15: true,  // Determines if the extension should check on 15,45 minute intervals, only here incase send_empty_notification is enabled
            send_empty_notification: true,  // If true, notifications of "No shift changes occuring" will be sent
            before_minutes: 0,  // Minutes before 00, 15, 30, 45 the alarm will trigger
            padding_minutes: 5,  // Upon activating the extension, number of minutes past 00, 15, 30, 45 where it will still trigger
            shifts_to_show: ["Phones", "Bomgar", "Tier 2"],  // Array of strings, shift types to show     
            ss_remove_rows: true,
            ss_ignore_filter: false
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


// TODO There is a strange mix of sync.get()s in here, tabid is stored in data not configuration_dict, this should be fixed
// Add a handler to catch the chrome.alarm events
chrome.alarms.onAlarm.addListener(function(alarm) {
    // Check that it's the run alarm or the run_once alarm
    if (alarm.name != 'run' && alarm.name != 'run_once'){
        console.log(`Unknown alarm '${alarm.name}' detected`)
        return
    }

// Load configuration variables from storage (welcome to the highest level of callback hell (I didn't tab this because there are two many tabs as is))
chrome.storage.sync.get({
    schedulesource_url: "schedulesource.net/Enterprise/TeamWork5/Emp/Sch/#All",  // This is here as a failsafe in the event the URL changes in the future and needs to be configured manually
    interval_minutes : 15,
    range_minutes: 7,  // 0 <= range_minutes < interval_minutes/2, margin around time to check to activate, mostly used during testing, will be deprecated with better logic in the future
    // check_on_15: true,  // Determines if the extension should check on 15,45 minute intervals, only here incase send_empty_notification is enabled
    send_empty_notification: false,  // If true, notifications of "No shift changes occuring" will be sent
    shifts_to_show: [],
    ss_remove_rows: true,
    ss_ignore_filter: false

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

            } else if (!tab.url.endsWith(configuration_dict.schedulesource_url)){
                console.log(`Error in background.js in tabs.get: !tab.url.endsWith(configuration_dict.schedulesource_url): ${tab.url}`);
                chrome.tabs.executeScript(undefined, {code: `window.alert("The tab containing schedule source could not be found, Schedule Source Assistant is now disabled")`})
                
                // Set the status to disabled and invalidate the tabid
                chrome.storage.sync.set({tabId: -1, status: false})

            } else {
                //! Make sure this isn't commented out before creating a release
                // [12] Utilizing the built in refresh button, refresh the schedule to ensure the data is up to date
                chrome.tabs.executeScript(data.tabId, {file: "scripts/ss_refresh.js"})
                let refresh_delay = 5000;  // 5000ms is reasonable, but also long enough

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
                // if (!configuration_dict.check_on_15 && ((time_to_check % 15) == 0) && ((time_to_check % 60) != 30)){
                //     console.log("Aborting due to check_on_15")
                //     return;
                // }
                

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

                    // Grab the current user out of rows
                    let user = rows[8].trim()

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
                    console.log(`Rows before error zone:`)
                    console.log(rows)
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

                    // Set the colors to be used in color_schedule.js
                    let colors = {
                        starting: "rgba(255, 196, 0, 0.3)",
                        active: "rgba(0, 255, 30, 0.3)",
                        ending: "rgba(255, 0, 13, 0.3)",
                        user_shift: "rgba(255, 255, 0, 0.5)",
                        else: undefined
                    }
                    color_schedule_config = []

                    // Find the technicians getting on
                    let technicians_starting = [];
                    let technicians_ending = [];
                    rows.forEach(function(row, index){
                        if (row[6] == time_to_check && row[3] != "---EMPTY---"){
                            //technicians_starting.push(`${row[3]} - ${row[2]}`)
                            if (configuration_dict.shifts_to_show.includes(row[2])){
                                technicians_starting.push(row)

                                // Add a color
                                if (row[3] == user){
                                    color_schedule_config.push(colors.user_shift)
                                } else {
                                    color_schedule_config.push(colors.starting)
                                }

                                // Check if ignore filter is set
                            } else if (configuration_dict.ss_ignore_filter){
                                // Add a color
                                if (row[3] == user){
                                    color_schedule_config.push(colors.user_shift)
                                } else {
                                    color_schedule_config.push(colors.starting)
                                }
                            } else {
                                color_schedule_config.push(colors.else)
                            }
                        
                        // Check for ending shift
                        } else if (row[7] == time_to_check && row[3] != "---EMPTY---"){
                            //technicians_ending.push(`${row[3]} - ${row[2]}`)
                            if (configuration_dict.shifts_to_show.includes(row[2])){
                                technicians_ending.push(row)

                                // Add a color
                                if (row[3] == user){
                                    color_schedule_config.push(colors.user_shift)
                                } else {
                                    color_schedule_config.push(colors.ending)
                                }

                                // Check if ignore filter is set
                            } else if (configuration_dict.ss_ignore_filter){
                                // Add a color
                                if (row[3] == user){
                                    color_schedule_config.push(colors.user_shift)
                                } else {
                                    color_schedule_config.push(colors.ending)
                                }
                            } else {
                                color_schedule_config.push(colors.else)
                            }
                        
                        // Check for active shift which abides by the chosen filter conditions
                        // console.log(configuration_dict.ss_ignore_filter)
                        // console.log(configuration_dict.shifts_to_show.includes(row[2]))
                        } else if ((row[6] < time_to_check && row[7] > time_to_check) && (configuration_dict.ss_ignore_filter || configuration_dict.shifts_to_show.includes(row[2]))){
                            if (row[3] == user){
                                color_schedule_config.push(colors.user_shift)
                            } else {
                                color_schedule_config.push(colors.active)
                            }

                        // Else shift is not active and complies with filter conditions
                        } else {
                            color_schedule_config.push(colors.else)
                        }
                    });

                    // [13] Execute the coloring script
                    let config = {
                        colors: color_schedule_config,
                        ss_remove_rows: configuration_dict.ss_remove_rows
                    };
                    chrome.tabs.executeScript(data.tabId, {
                        code: 'var config = ' + JSON.stringify(config)
                    }, function() {
                        chrome.tabs.executeScript(tab.id, {file: 'scripts/color_schedule.js'});
                    });

                    console.log(technicians_starting)
                    console.log(technicians_ending)
                    console.log(color_schedule_config)
                    console.log(rows)

                    // Calculate the hour in terms of AM & PM for notification titles
                    let hour_AMPM;
                    let AMPM;
                    if (Math.floor(time_to_check / 60) > 12){
                        hour_AMPM = Math.floor(time_to_check / 60) - 12
                        if (time_to_check / 60 >= 24){
                            AMPM = "AM"
                        } else {
                            AMPM = "PM"
                        }
                    } else if (Math.floor(time_to_check / 60) == 12){
                        hour_AMPM = 12
                        AMPM = "PM"
                    } else {
                        hour_AMPM = Math.floor(time_to_check / 60)
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
                            
                            // Clear the previous notification and send a new one
                            chrome.notifications.clear('ScheduleSourceNotification', function(){
                                chrome.notifications.create('ScheduleSourceNotification', notification, function(notif_id){
                                    
                                    // Store the notification ID in local storage
                                    chrome.storage.sync.set({notification_id: notif_id})
                                });
                            });
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

                        // TODO Add in line length check to make sure overflow warning won't get pushed off
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
                        } else if (technicians_starting.length + technicians_ending.length > 4){
                            notif_Items.splice(3, 0, {
                                title: `${0} more starting`,
                                message: `${technicians_ending.length - (3 - technicians_starting.length)} more ending`
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
                        // Clear the previous notification and send a new one
                        chrome.notifications.clear('ScheduleSourceNotification', function(){
                            chrome.notifications.create('ScheduleSourceNotification', notification, function(notif_id){
                                
                                // Store the notification ID in local storage
                                chrome.storage.sync.set({notification_id: notif_id})
                            });
                        });
                    }

                });
                // Delay following page refresh (utilizing a refresh instead of a reload drastically reduces the amount of time needed here)
                }, refresh_delay);
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


// On click handler for notifications to open the schedule source tab and focus the window
chrome.notifications.onClicked.addListener(function(notification_id){
    console.log("Notification clicked")

    // Get the tabid and windowid from storage
    chrome.storage.sync.get({
        tabId: -1,
        windowId: -1
    }, function(configuration_dict){

        // If the tabid and windowid are both valid, focus the window and select the tab
        if (configuration_dict.tabId != -1 && configuration_dict.windowId != -1){
            chrome.tabs.update(configuration_dict.tabId, {selected: true})
            chrome.windows.update(configuration_dict.windowId, {focused: true})
        } else {
            console.log("Invalid tabid or windowid, can not focus and select")
        }
    });

    // Clear the notification (since this doesn't happen automatically on MacOS)
    chrome.notifications.clear(notification_id)
});


// TODO Add check for limited media dispaly schedule source
// TODO Account for cases where a technician is getting off & getting on (maybe just say transitioning techs?)
// TODO Verify schedule source date is correct
// TODO Mac notifications are only displaying a single line after recent changes, could this have something to do with notification IDs all being the same?