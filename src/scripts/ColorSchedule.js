function ColorSchedule()
{
    const colors = config.colors;
    const shifts = document.getElementsByTagName("TR");

    let shiftColor;
    for (let i = 3; i < shifts.length; i++){
        shiftColor = colors[i - 3];

        if (shiftColor != undefined){
            shifts[i].style.backgroundColor = shiftColor;
        } else if (config.ss_remove_rows) {
            shifts[i].innerHTML = ""
        }
    }
}

ColorSchedule();