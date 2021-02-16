// TODO Configuration options for padding_minutes, before_minutes

// List of all shift types (may change from time to time, too many as is)
let all_shifts = ["Phones", "Bomgar", "Tier 2", "Trainee", "Student Leader", "Info Desk", "Counter", "Knowledge", "Endpoint Team", "TAMU-Health-Support", "Project"]


// Add a handler for the save button
let save_config = document.getElementById("save_config");
save_config.addEventListener("click", async () =>{
    // Loop through the selected shift types
    let selected_shifts = getSelectValues(document.getElementById("shifts"))
    if (selected_shifts.length == 0){
        window.alert("Please select at least one type of shift")
        return;
    } else {
        let shifts_to_save = [];
        selected_shifts.forEach(function(shift_idx) {
            shifts_to_save.push(all_shifts[shift_idx])
        });
        // Save the configuration to storage.sync
        chrome.storage.sync.set({shifts_to_show: shifts_to_save})
    }

    // Update checkbox status
    chrome.storage.sync.set({
        send_empty_notification: document.getElementById("send_empty_notifications").checked,
        check_on_15: document.getElementById("check_on_15").checked,
        ss_remove_rows: document.getElementById("ss_remove_rows").checked,
        ss_ignore_filter: document.getElementById("ss_ignore_filter").checked
    });



});


// TODO Add comments to this function
// [9] https://stackoverflow.com/questions/11821261/how-to-get-all-selected-values-from-select-multiple-multiple
function getSelectValues(select) {
    var result = [];
    var options = select && select.options;
    var opt;
  
    for (var i=0, iLen=options.length; i<iLen; i++) {
      opt = options[i];
  
      if (opt.selected) {
        result.push(opt.value || opt.text);
      }
    }
    return result;
  }



// Run when the page first loads to populate existing information
function onLoad(){
// Get the current configuration settings
chrome.storage.sync.get({
    schedulesource_url: "https://www.schedulesource.net/Enterprise/TeamWork5/Emp/Sch/#All",
    interval_minutes: 15,
    range_minutes: 7,
    check_on_15: true,
    send_empty_notification: false,
    before_minutes: 0,
    padding_minutes: 0,
    shifts_to_show: ["Phones", "Bomgar", "Tier 2"],
    ss_remove_rows: true,
    ss_ignore_filter: false
}, function(configuration_dict) {

    // Populate the select with currently configured shift types
    let shifts = document.getElementById("shifts")

    all_shifts.forEach(function(value, index){
        // If the shift type is in shifts_to_shot, add it as a selected option, else just add it
        if (configuration_dict.shifts_to_show.includes(value)){
            shifts.innerHTML += `<option value=${index} selected>${value}</option>`
        } else {
            shifts.innerHTML += `<option value=${index}>${value}</option>`
        }

    });

    // TODO Use an array and a loop to make this more expandable
    // Pre-check checkboxes
    if (configuration_dict.send_empty_notification){
        document.getElementById("send_empty_notifications").checked = true;
    }
    if (configuration_dict.check_on_15){
        document.getElementById("check_on_15").checked = true;
    }
    if (configuration_dict.ss_remove_rows){
        document.getElementById("ss_remove_rows").checked = true;
    }
    if (configuration_dict.ss_ignore_filter){
        document.getElementById("ss_ignore_filter").checked = true;
    }


});
}


onLoad();





// Old HTML
/*
{ <div style="text-align:center">
<h3>Options pending, please blame the dev</h3>
<a href="mailto:becker@tamu.edu"><strong>Email me</strong></a>
</div> }
*/