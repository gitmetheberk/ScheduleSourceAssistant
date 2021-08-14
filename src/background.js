chrome.runtime.onInstalled.addListener(OnInstalled);
chrome.runtime.onMessage.addListener(OnMessage);
chrome.alarms.onAlarm.addListener(OnAlarm);
chrome.runtime.onStartup.addListener(OnStartup);
chrome.notifications.onClicked.addListener(OnNotificationClicked);

function OnInstalled(details)
{
    if (details.reason == "install")
    {
        console.log("chrome.runtime.onInstalled installation detected")
        
        // Initalize values in sync storage
        chrome.storage.sync.set({
            version: 1.2, 
            status: false,

            schedulesource_url: "schedulesource.net/Enterprise/TeamWork5/Emp/Sch/#All",
            interval_minutes: 15,  // Length of the interval (15 for deployment)
            range_minutes: 7,  // 0 <= range_minutes < interval_minutes/2, margin around time to check to activate, mostly used during testing, will be deprecated with better logic in the future
            // Deprecated: check_on_15: true,  // Determines if the extension should check on 15,45 minute intervals, only here incase send_empty_notification is enabled
            send_empty_notification: true,  // If true, notifications of "No shift changes occuring" will be sent
            before_minutes: 0,  // Minutes before 00, 15, 30, 45 the alarm will trigger
            padding_minutes: 5,  // Upon activating the extension, number of minutes past 00, 15, 30, 45 where it will still trigger
            shifts_to_show: ["Phones", "Bomgar", "Tier 2", "Student Leader"],  // Array of strings, shift types to show     
            ss_remove_rows: true,
            ss_ignore_filter: false
        })
    } 
    else if (details.reason == "update" || details.reason == "chrome_update")
    {
        console.log("chrome.runtime.onInstalled update detected")
        
        // Default the status to false following an update
        chrome.storage.sync.set({
            status: false
        })
    } 
    else 
    {
        console.log(["Invalid onInstalled reason", details.reason])
    }

    // Commented out in the CleanCode branch since we shouldn't be adding new features here
    // chrome.runtime.getPlatformInfo(function(info) {
    //     chrome.storage.sync.set({
    //         PlatformOs: info.PlatformOs
    //     })
    // })
}

function OnMessage(request, sender) 
{
    if (request.message === "activate_icon") {
        chrome.pageAction.show(sender.tab.id);
    }
}

function OnStartup() {
    chrome.storage.sync.set({
        tabId: -1,
        status: false
    });
}

function OnAlarm(alarm)
{
    if (alarm.name == 'run' || alarm.name == 'run_once'){
        RunExtension();
    }
    else 
    {
        console.log(`Unknown alarm '${alarm.name}' detected`);
    }
}

function OnNotificationClicked(notification_id)
{
    chrome.storage.sync.get({
        tabId: -1,
        windowId: -1
    }, function(configuration_dict)
    {

        if (configuration_dict.tabId != -1 && configuration_dict.windowId != -1)
        {
            chrome.tabs.update(configuration_dict.tabId, {selected: true})
            chrome.windows.update(configuration_dict.windowId, {focused: true})
        } 
        else 
        {
            console.warning("Invalid tabid or windowid, can not focus and select")
        }
    });

    chrome.notifications.clear(notification_id)
}

const REFRESH_DELAY = 5000;

function RunExtension()
{
    chrome.storage.sync.get({
        schedulesource_url: "schedulesource.net/Enterprise/TeamWork5/Emp/Sch/#All",  // This is here as a failsafe in the event the URL changes in the future and needs to be configured manually
        interval_minutes : 15,
        range_minutes: 7,  // 0 <= range_minutes < interval_minutes/2, margin around time to check to activate, mostly used during testing, will be deprecated with better logic in the future
        send_empty_notification: false,  // If true, notifications of "No shift changes occuring" will be sent
        shifts_to_show: [],
        ss_remove_rows: true,
        ss_ignore_filter: false

    }, function(configuration)
    {
        // Grab the schedule source tabId
        chrome.storage.sync.get({tabId: -1}, function(data){
            if (data.tabId == -1){
                console.error("tabId not set")
                return;
            }

            chrome.tabs.get(data.tabId, function(tab){
                RunExtensionWithData(configuration, data, tab)
            });
        });   
    });
}

function DisableExtension(){
    chrome.tabs.executeScript(undefined, {code: 
        `window.alert("The tab containing schedule source could not be found, 
        Schedule Source Assistant is now disabled")`})
    chrome.storage.sync.set({tabId: -1, status: false});
}

function ValidateTabAndLastError(configuration, tab) 
{
    if (chrome.runtime.lastError) 
    {
        console.error(`Error in background.js in tabs.get: ${chrome.runtime.lastError.message}`);
        DisableExtension();
        return false;
    } 
    else if (!tab.url.endsWith(configuration.schedulesource_url))
    {
        console.error(`Error in background.js in tabs.get: 
        !tab.url.endsWith(configuration_dict.schedulesource_url): ${tab.url}`);
        DisableExtension();
        return false;
    } 

    return true;
}

function RefreshSchedule(data){
    chrome.tabs.executeScript(data.tabId, {file: "scripts/RefreshSchedule.js"})
}

function GetShiftChange(configuration, time)
{
    let minutes = time.getMinutes();
    let shiftChange;

    if ((minutes % configuration.interval_minutes) == 0)
    {
        // We're on an interval
        shiftChange = minutes + time.getHours() * 60;
    } 
    else if (minutes <= configuration.range_minutes)
    {
        // We just passed the beginning of an hour
        shiftChange = time.getHours() * 60;
    } 
    else if (minutes >= 60 - configuration.range_minutes) 
    {
        // We're coming up on an hour
        shiftChange = (time.getHours() + 1) * 60;
    } 
    else 
    {
        // Must be 15, 30, or 45
        if ((minutes >= 15 - configuration.range_minutes) && (minutes <= 15 + configuration.range_minutes))
        {
            shiftChange = (time.getHours()) * 60 + 15;
        } 
        else if ((minutes >= 30 - configuration.range_minutes) && (minutes <= 30 + configuration.range_minutes))
        {
            shiftChange = (time.getHours()) * 60 + 30;
        } 
        else if ((minutes >= 45 - configuration.range_minutes) && (minutes <= 45 + configuration.range_minutes))
        {
            shiftChange = (time.getHours()) * 60 + 45;
        } 
        else {
            console.error("Invalid or unknown time interval");
        }
    }

    // Adjust if it's midnight
    if (time.getHours() == 0){
        shiftChange += 60 * 24;
    }

    return shiftChange;
}

function ConvertRowTimesToRelativeMinutes(rows)
{
    // Convert start and end times to relative minutes into the day, ex. 8am = 480
    for (const row of rows){
        // Loop through start and end times
        for (let j = 6; j < 8; j++){
            // Get the hour and minute out of the string, time = [hour, minute]
            let time = row[j].split(":")
            let pm = time[1].endsWith("PM");
            time[1] = time[1].split(" ")[0]

            // Conert to minutes into the day
            row[j] = parseInt(time[0]) * 60 + parseInt(time[1])

            // Check am/pm (accounting for edge cases)
            if ((pm && time[0] != 12) || (!pm && time[0] == 12)){
                row[j] = row[j] + 720
            }
        }
    }

    return rows;
}

function ProcessInnerText(innerText)
{
    let rows = innerText.split(/\n/)

    const user = rows[8].trim()

    // Remove excess rows from rows
    rows.splice(0,39)
    
    rows.forEach(function(row, index) {
        rows[index] = row.split(/\t/);
    });

    rows = ConvertRowTimesToRelativeMinutes(rows);

    return {
        shifts: rows,
        user
    };
}

// TODO Simplify me
function ProcessSchedule(configuration, shifts, shiftChange, user)
{
    const COLORS = {
        starting: "rgba(255, 196, 0, 0.3)",
        active: "rgba(0, 255, 30, 0.3)",
        ending: "rgba(255, 0, 13, 0.3)",
        user_shift: "rgba(255, 255, 0, 0.5)",
        else: undefined
    }

    /* shifts[idx] breakdown
        idx=1 = date
        idx=2 = shift type
        idx=3 = name
        idx=6 = start time
        idx=7 = end time
        idx=9 = length in hours (can be used as a checksum)
    */

    let schedule_colors = []
    let shifts_starting = [];
    let shifts_ending = [];
    for(const shift of shifts)
    {
        if (shift[6] == shiftChange && shift[3] != "---EMPTY---")
        {
            if (configuration.shifts_to_show.includes(shift[2]))
            {
                shifts_starting.push(shift)

                if (shift[3] == user)
                {
                    schedule_colors.push(COLORS.user_shift)
                } 
                else 
                {
                    schedule_colors.push(COLORS.starting)
                }

                // Check if ignore filter is set
            } 
            else if (configuration.ss_ignore_filter)
            {
                // Add a color
                if (shift[3] == user){
                    schedule_colors.push(COLORS.user_shift)
                } else {
                    schedule_colors.push(COLORS.starting)
                }
            } 
            else 
            {
                schedule_colors.push(COLORS.else)
            }
        
        // Check for ending shift
        } 
        else if (shift[7] == shiftChange && shift[3] != "---EMPTY---")
        {
            if (configuration.shifts_to_show.includes(shift[2]))
            {
                shifts_ending.push(shift)

                // Add a color
                if (shift[3] == user)
                {
                    schedule_colors.push(COLORS.user_shift)
                } 
                else 
                {
                    schedule_colors.push(COLORS.ending)
                }

                // Check if ignore filter is set
            } 
            else if (configuration.ss_ignore_filter)
            {
                // Add a color
                if (shift[3] == user){
                    schedule_colors.push(COLORS.user_shift)
                } else {
                    schedule_colors.push(COLORS.ending)
                }
            } 
            else 
            {
                schedule_colors.push(COLORS.else)
            }
        
        // Check for active shift which abides by the chosen filter conditions
        } 
        else if ((shift[6] < shiftChange && shift[7] > shiftChange) && (configuration.ss_ignore_filter || configuration.shifts_to_show.includes(shift[2])) && shift[3] != "---EMPTY---")
        {
            if (shift[3] == user)
            {
                schedule_colors.push(COLORS.user_shift)
            } 
            else if (shift[3] != "---EMPTY---") 
            {
                schedule_colors.push(COLORS.active)
            } 
            else 
            {
                schedule_colors.push(COLORS.else)
            }

        // Else shift is not active and complies with filter conditions
        } 
        else 
        {
            schedule_colors.push(COLORS.else)
        }
    }

    return {
        schedule_colors,
        shifts_starting,
        shifts_ending
    }
}

// TODO Do we really need data.tabId and tab.id?
function ColorSchedule(config, data, tab)
{
    chrome.tabs.executeScript(data.tabId, {
        code: 'var config = ' + JSON.stringify(config)
    }, function() {
        chrome.tabs.executeScript(tab.id, {file: 'scripts/ColorSchedule.js'});
    });
}

function GetHourWithMeridiem(shiftChange)
{
    let hour_AMPM;
    let AMPM;

    if (Math.floor(shiftChange / 60) > 12){
        hour_AMPM = Math.floor(shiftChange / 60) - 12
        if (shiftChange / 60 >= 24){
            AMPM = "AM"
        } else {
            AMPM = "PM"
        }
    } else if (Math.floor(shiftChange / 60) == 12){
        hour_AMPM = 12
        AMPM = "PM"
    } else {
        hour_AMPM = Math.floor(shiftChange / 60)
        AMPM = "AM"
    }

    return {
        hour_AMPM,
        AMPM
    }
}

function SendEmptyNotification(shiftChange, hour_AMPM, AMPM)
{
    const notification = {
        type: 'basic',
        title: `No shift changes occuring ${hour_AMPM}:${((shiftChange % 60) < 10) ? "0" : ""}${shiftChange % 60} ${AMPM}`,
        message: ``,
        iconUrl: "images/icon48.png",
    }

    SendNotification(notification);
}

function SendNotification(notification)
{
    chrome.notifications.clear('ScheduleSourceNotification', function(){
        chrome.notifications.create('ScheduleSourceNotification', notification, function(id){
            
            // Store the notification ID in local storage
            chrome.storage.sync.set({notification_id: id})
        });
    });
}

function SendNotificationWithShifts(shiftChange, hour_AMPM, AMPM, shifts_starting, shifts_ending)
{
    // Build title
    let title;
    if (shifts_starting.length != 0 && shifts_ending.length == 0){
        title = `Shifts starting ${hour_AMPM}:${((shiftChange % 60) < 10) ? "0" : ""}${shiftChange % 60} ${AMPM}`
    } else if (shifts_starting.length == 0 && shifts_ending.length != 0){
        title = `Shifts ending ${hour_AMPM}:${((shiftChange % 60) < 10) ? "0" : ""}${shiftChange % 60} ${AMPM}`
    } else {
        title = `Shift change ${hour_AMPM}:${((shiftChange % 60) < 10) ? "0" : ""}${shiftChange % 60} ${AMPM}`
    }

    // Build notification
    let notif_Items = [];
    if (shifts_starting.length != 0){
        shifts_starting.forEach(function(shift){
            notif_Items.push({
                title: `${shift[3]}`,
                message: `${shift[2]}`
            })
        })
    }
    if (shifts_ending.length != 0){
        shifts_ending.forEach(function(shift){
            notif_Items.push({
                title: `${shift[3]}`,
                message: `Shift ending`
            })
        })
    }

    // Add overflow messages
    if (shifts_starting.length >= 4){
        notif_Items.splice(3, 0, {
            title: `${shifts_starting.length - 3} more starting`,
            message: `${shifts_ending.length} ending`
        })
    } else if (shifts_starting.length == 3 && shifts_ending.length > 1){
        notif_Items.splice(3, 0, {
            title: `${0} more starting`,
            message: `${shifts_ending.length} ending`
        })
    } else if (shifts_ending.length > 4){
        notif_Items.splice(3, 0, {
            title: `${0} more starting`,
            message: `${shifts_ending.length - 3} ending`
        })
    } else if (shifts_starting.length + shifts_ending.length > 4){
        notif_Items.splice(3, 0, {
            title: `${0} more starting`,
            message: `${shifts_ending.length - (3 - shifts_starting.length)} more ending`
        })
    }

    const notification = {
        type: 'list',
        title: title,
        message: "",
        iconUrl: "images/icon48.png",
        items: notif_Items
    }           

    SendNotification(notification);
}

function RunExtensionWithData(configuration, data, tab) 
{
    if (!ValidateTabAndLastError(configuration, tab)){
        return;    
    }

    RefreshSchedule(data);
    const shiftChange = GetShiftChange(configuration, new Date);

    // Provide a few seconds for the page to load
    setTimeout(() => {
        chrome.tabs.executeScript(data.tabId, { code: `document.body.innerText;` }, function (innerText) {
            const 
            {
                shifts, 
                user
            } = ProcessInnerText(innerText[0]);

            const 
            {
                schedule_colors,
                shifts_starting,
                shifts_ending
            } = ProcessSchedule(configuration, shifts, shiftChange, user);

            const config = {
                colors: schedule_colors,
                ss_remove_rows: configuration.ss_remove_rows
            };
            ColorSchedule(config, data, tab);

            const 
            {
                hour_AMPM, 
                AMPM
            } = GetHourWithMeridiem(shiftChange);

            if (shifts_starting.length == 0 && 
                shifts_ending.length == 0)
            {
                if (configuration.send_empty_notification)
                {
                    SendEmptyNotification(shiftChange, hour_AMPM, AMPM);
                }
            } 
            else 
            {
                SendNotificationWithShifts(shiftChange, hour_AMPM, AMPM, shifts_starting, shifts_ending);
            }

        });
    }, REFRESH_DELAY);
}
