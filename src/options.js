const ALL_SHIFTS = [
    "Phones", 
    "Bomgar", 
    "Tier 2", 
    "Trainee", 
    "Student Leader", 
    "Info Desk", 
    "Counter", 
    "Knowledge", 
    "Endpoint Team", 
    "TAMU-Health-Support", 
    "Project", 
    "Trainer"
]

const MAXIMUM_ADVANCED_MINUTES = 5

function GetSelectedOptionsFromFormSelect(select) 
{
    let selectedOptions = [];
    const options = select && select.options;

    for (const option of options) {
        if (option.selected) {
            selectedOptions.push(option.value || option.text);
        }
    }

    return selectedOptions;
}

function AddSaveButtonHandler(buttonID)
{
    const save_config_button = document.getElementById(buttonID);
    save_config_button.addEventListener("click", SaveButtonHandler);
}

async function SaveButtonHandler()
{
    const selected_shifts = GetSelectedOptionsFromFormSelect(document.getElementById("shifts"))

    if (selected_shifts.length == 0)
    {
        window.alert("Please select at least one type of shift");
        return;
    } 

    SaveSelects(selected_shifts);
    SaveCheckboxes();
}

async function SaveSelects(shifts)
{
    let shifts_to_save = [];
    shifts.forEach(function(shift_idx) {
        shifts_to_save.push(ALL_SHIFTS[shift_idx])
    });

    const advanced_minutes = GetSelectedOptionsFromFormSelect(
        document.getElementById("before_minutes"))[0];

    chrome.storage.sync.set({
        shifts_to_show: shifts_to_save,
        before_minutes: advanced_minutes
    });
}

async function SaveCheckboxes()
{
    chrome.storage.sync.set({
        send_empty_notification: document.getElementById("send_empty_notifications").checked,
        ss_remove_rows: document.getElementById("ss_remove_rows").checked,
        ss_ignore_filter: document.getElementById("ss_ignore_filter").checked
    });
}

function OnPageLoad()
{
    chrome.storage.sync.get({
        schedulesource_url: "schedulesource.net/Enterprise/TeamWork5/Emp/Sch/#All",
        interval_minutes: 15,
        range_minutes: 7,
        send_empty_notification: false,
        before_minutes: 0,
        padding_minutes: 0,
        shifts_to_show: ["Phones", "Bomgar", "Tier 2"],
        ss_remove_rows: true,
        ss_ignore_filter: false
    }, 
    function(configuration) 
    {
        FillFormSelects(configuration);
        PreCheckCheckboxes(configuration)
    });
}

function FillFormSelects(configuration) 
{
    FillShiftsSelect(configuration);
    FillAdvancedMinutesSelect(configuration);
}

function FillShiftsSelect(configuration) {
    let shifts = document.getElementById("shifts")

    ALL_SHIFTS.forEach(function(value, index){
        if (configuration.shifts_to_show.includes(value)){
            shifts.innerHTML += `<option value=${index} selected>${value}</option>`
        } else {
            shifts.innerHTML += `<option value=${index}>${value}</option>`
        }

    });
}

function FillAdvancedMinutesSelect(configuration) {
    let advanced_minutes = document.getElementById("before_minutes")
    for (let i = 0; i <= MAXIMUM_ADVANCED_MINUTES; i++){
        if (i == configuration.before_minutes){
            advanced_minutes.innerHTML += `<option value=${i} selected>${i}</option>`
        } else {
            advanced_minutes.innerHTML += `<option value=${i}>${i}</option>`
        }
    }
}

function PreCheckCheckboxes(configuration)
{
    document.getElementById("send_empty_notifications").checked = configuration.send_empty_notification;
    document.getElementById("ss_remove_rows").checked = configuration.ss_remove_rows;
    document.getElementById("ss_ignore_filter").checked = configuration.ss_ignore_filter;
}

AddSaveButtonHandler("save_config")
OnPageLoad();