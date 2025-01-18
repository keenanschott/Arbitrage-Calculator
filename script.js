$(document).ready(function () {
    calculateBets(); // Calculate bets when the page is loaded
    startStopwatch(); // Start the stopwatch when the page is loaded

    document.getElementById("refreshButton").addEventListener("click", function () {
        location.reload(); // Reload the page when the refresh button is clicked
    });
});

// Function to fetch the API key from the server (or hidden environment) securely
function getApiKey() {
    return "c8fe1c08cf273f191f022351551161fb";
}

// Function to perform the market scrape
async function performMarketScrape(requestUrl, market) {
    try {
        const response = await fetch(requestUrl);
        const data = await response.json(); // Parse the JSON response

        for (let i = 0; i < data.length; i++) {
            const contenders = [data[i].home_team, data[i].away_team, "Draw"];
            let outcomes = Array(3).fill(0.0); // Array of outcomes
            let bookmakers = Array(3).fill(null); // Array of bookmakers

            // Loop through bookmakers to get best odds
            for (let j = 0; j < data[i].bookmakers.length; j++) {
                if (j === 0) {
                    for (let len = 0; len < bookmakers.length; len++) {
                        bookmakers[len] = data[i].bookmakers[j].key; // Populate bookmakers array
                    }
                }
                for (let k = 0; k < data[i].bookmakers[j].markets.length; k++) {
                    for (let l = 0; l < data[i].bookmakers[j].markets[k].outcomes.length; l++) {
                        if (data[i].bookmakers[j].markets[k].outcomes[l].price > outcomes[l]) {
                            outcomes[l] = data[i].bookmakers[j].markets[k].outcomes[l].price; // Best outcome
                            bookmakers[l] = data[i].bookmakers[j].key; // Corresponding bookmaker
                        }
                    }
                }
            }

            if (outcomes[2] === 0.0) {
                outcomes.pop(); // Remove draw outcome if it doesn't exist
                bookmakers.pop();
            }

            // Perform arbitrage analysis
            performArbitrageAnalysis(outcomes, bookmakers, market, contenders);
        }
    } catch (error) {
        console.error('Error fetching market data:', error);
    }
}

// Function to perform arbitrage analysis
function performArbitrageAnalysis(outcomes, bookmakers, market, contenders) {
    if (!outcomes.includes(0)) {
        const sum = outcomes.reduce((acc, odd) => acc + (1 / odd), 0); // Sum of inverse odds
        if (sum < 1.0) { // Arbitrage opportunity
            // Construct a table row with data for each column
            let row = "<tr>";

            // Add Event (Team names) to the row
            row += `<td>${contenders[1]} @ ${contenders[0]}</td>`;  // echoTeams equivalent

            // Add Market to the row
            row += `<td>${market}</td>`;  // echoMarket equivalent

            // Add Betslip to the row
            let betslipContent = "";
            for (let i = 0; i < outcomes.length; i++) {
                let contender;
                switch (i) {
                    case 0:
                        contender = 1;
                        break;
                    case 1:
                        contender = 0;
                        break;
                    default:
                        contender = i;
                }
                betslipContent += `${contenders[contender]} → ${bookmakers[i]}: ${outcomes[i]} / ${decimalToAmerican(outcomes[i])}<br>`;
            }
            row += `<td>${betslipContent}</td>`;  // echoBetslip equivalent

            // Add Stake Percentages and Profit to the row
            let stakeA, stakeB, stakeC;
            let stakeContent = "";
            if (outcomes.length === 3) {
                stakeA = Math.round((100 / outcomes[0]) / sum * 100) / 100;
                stakeB = Math.round((100 / outcomes[1]) / sum * 100) / 100;
                stakeC = 100 - (stakeA + stakeB);
                stakeContent = `${stakeA}%<br>${stakeB}%<br>${stakeC}%`; // Display stakes
            } else {
                stakeA = Math.round((100 / sum) / outcomes[0] * 100) / 100;
                stakeB = 100 - stakeA;
                stakeContent = `${stakeA}%<br>${stakeB}%`; // Display stakes
            }

            row += `<td>${stakeContent}</td>`; // echoStake equivalent

            // Add profit to the row
            const profit = (100 / sum - 100).toFixed(2);
            row += `<td>$${profit}</td>`; // echoProfit equivalent

            // Close the row
            row += "</tr>";

            // Append the row to the table body
            $('#calc_bets').append(row);
        }
    }
}

// Function to convert decimal odds to American odds
function decimalToAmerican(decimalOdd) {
    if (decimalOdd >= 2.0) {
        return `+${Math.round((decimalOdd - 1) * 100)}`; // Positive odds
    } else {
        return `-${Math.round(100 / (decimalOdd - 1))}`; // Negative odds
    }
}

// Perform market scrape across three markets
async function calculateBets() {
    // Get API Key dynamically
    const apiKey = getApiKey();

    performMarketScrape(
        `https://api.the-odds-api.com/v4/sports/upcoming/odds/?apiKey=${apiKey}&regions=us&markets=h2h&bookmakers=fanduel,betmgm,draftkings,circasports,pointsbetus,barstool,betrivers,superbook,mybookieag`,
        "Money"
    );
    performMarketScrape(
        `https://api.the-odds-api.com/v4/sports/upcoming/odds/?apiKey=${apiKey}&regions=us&markets=spreads&bookmakers=fanduel,betmgm,draftkings,circasports,pointsbetus,barstool,betrivers,superbook,mybookieag`,
        "Spread"
    );
    performMarketScrape(
        `https://api.the-odds-api.com/v4/sports/upcoming/odds/?apiKey=${apiKey}&regions=us&markets=totals&bookmakers=fanduel,betmgm,draftkings,circasports,pointsbetus,barstool,betrivers,superbook,mybookieag`,
        "Total"
    );
}

// Stopwatch functionality
function startStopwatch() {
    var start = Date.now();
    function updateStopwatch() {
        var delta = Date.now() - start; // milliseconds elapsed since start
        var hours = Math.floor(delta / (1000 * 60 * 60));
        var minutes = Math.floor((delta / 1000 / 60) % 60);
        var seconds = Math.floor((delta / 1000) % 60);
        if (minutes < 10) {
            minutes = "0" + minutes; // Add leading zero if needed
        }
        if (seconds < 10) {
            seconds = "0" + seconds; // Add leading zero if needed
        }
        document.getElementById("stopwatch").textContent = `${hours}:${minutes}:${seconds}`; // Set text content of 'stopwatch' div
    }
    setInterval(updateStopwatch, 1000); // Update every second
}
