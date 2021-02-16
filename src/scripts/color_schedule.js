function color_schedule(){
    // Get the color data
    let colors = config.colors;

    // Grab all table rows (idx 3 through length-1 contain shifts)
    rows = document.getElementsByTagName("TR")

    // Loop through rows, coloring as needed
    let color
    for (let i = 3; i < rows.length; i++){
        // Grab the color for the current row
        color = colors[i - 3];

        // If the color is undefined and remove rows is enabled, remove the row, else set the color
        if (color != undefined){
            rows[i].style.backgroundColor = color;
        } else if (config.ss_remove_rows) {
            rows[i].innerHTML = ""
        }
    }
}

color_schedule();