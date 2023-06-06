$(document).ready(function () {
    calculateBets(); // on page load, calculate bets
});

function calculateBets() {
    $('#calc_bets').load('bets.php');
}

$(document).ready(function () {
    var start = Date.now();
    function updateStopwatch() {
        var delta = Date.now() - start; // milliseconds elapsed since start
        var hours = Math.floor(delta / (1000 * 60 * 60));
        var minutes = Math.floor((delta / (1000 * 60)) % 60);
        var seconds = Math.floor((delta / 1000) % 60);
        if (minutes < 10) {
            minutes = "0" + minutes; // add leading zero if needed
        }
        if (seconds < 10) {
            seconds = "0" + seconds; // add leading zero if needed
        }
        document.getElementById("stopwatch").textContent = hours + ":" + minutes + ":" + seconds; // set text content of 'stopwatch' div
    }
    setInterval(updateStopwatch, 1000); // update every second
});

$(document).ready(function () {
    document.getElementById("refreshButton").addEventListener("click", function () {
        location.reload();
    });
});