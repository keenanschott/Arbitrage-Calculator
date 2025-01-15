// Wait for the DOM to be fully loaded
document.addEventListener("DOMContentLoaded", function () {
    calculateBets(); // on page load, calculate bets
});

function calculateBets(): void {
    // Using native fetch to load content instead of jQuery's .load
    fetch('bets.php')
        .then(response => response.text())
        .then(data => {
            const calcBetsElement = document.getElementById('calc_bets');
            if (calcBetsElement) {
                calcBetsElement.innerHTML = data;
            }
        })
        .catch(error => console.error('Error loading bets:', error));
}

// Wait for the DOM to be fully loaded before starting stopwatch
document.addEventListener("DOMContentLoaded", function () {
    const start: number = Date.now();

    function updateStopwatch(): void {
        const delta: number = Date.now() - start; // milliseconds elapsed since start
        let hours: number = Math.floor(delta / (1000 * 60 * 60));
        let minutes: number = Math.floor((delta / (1000 * 60)) % 60);
        let seconds: number = Math.floor((delta / 1000) % 60);

        // Add leading zero if needed
        if (minutes < 10) {
            minutes = Number("0" + minutes);
        }
        if (seconds < 10) {
            seconds = Number("0" + seconds);
        }

        // Update stopwatch text content
        const stopwatchElement: HTMLElement | null = document.getElementById("stopwatch");
        if (stopwatchElement) {
            stopwatchElement.textContent = `${hours}:${minutes}:${seconds}`;
        }
    }

    setInterval(updateStopwatch, 1000); // update every second
});

// Wait for the DOM to be fully loaded before adding event listener to refresh button
document.addEventListener("DOMContentLoaded", function () {
    const refreshButton: HTMLElement | null = document.getElementById("refreshButton");

    if (refreshButton) {
        refreshButton.addEventListener("click", () => {
            location.reload();
        });
    }
});
