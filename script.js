$(document).ready(async function () {
    const storedApiKey = localStorage.getItem("apiKey") ?? "";
    // if it's an empty string, set it just in case
    if (storedApiKey === "") {
        localStorage.setItem("apiKey", "");
    }
    // display the stored string
    $('#apiKeyInput').val(storedApiKey);
    // button
    document.getElementById("setApiKeyButton").addEventListener("click", async function () {
        const apiKey = document.getElementById("apiKeyInput").value;
        if (apiKey || apiKey === "") {
            localStorage.setItem("apiKey", apiKey);
        }
        // fill the table
        $('#calc_bets').empty();
        await calculateBets();
    });
    // theme
    const storedMode = localStorage.getItem("darkMode");
    if (storedMode === "enabled") {
        $('#theme-link').attr('href', 'dark.css');
    } else if (storedMode === "disabled") {
        $('#theme-link').attr('href', 'light.css');
    } else {
        // browser preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            $('#theme-link').attr('href', 'dark.css');
            localStorage.setItem("darkMode", "enabled");
        } else {
            $('#theme-link').attr('href', 'light.css');
            localStorage.setItem("darkMode", "disabled");
        }
    }
    // toggle icon
    if (localStorage.getItem("darkMode") === "enabled") {
        document.getElementById('themeIcon').classList.add("fa-moon-o");
    } else {
        document.getElementById('themeIcon').classList.add("fa-sun-o");
    }
    $('#darkModeToggle').click(function () {
        const currentTheme = $('#theme-link').attr('href');
        if (currentTheme === 'light.css') {
            $('#theme-link').attr('href', 'dark.css');
            localStorage.setItem("darkMode", "enabled");
            themeIcon.classList.remove('fa-moon-o');
            themeIcon.classList.add('fa-sun-o');
        } else {
            $('#theme-link').attr('href', 'light.css');
            localStorage.setItem("darkMode", "disabled");
            themeIcon.classList.remove('fa-sun-o');
            themeIcon.classList.add('fa-moon-o');
        }
    });
    // fill the table
    await calculateBets();
});

async function performMarketScrape(requestUrl, market) {
    try {
        const response = await fetch(requestUrl);
        const data = await response.json();

        for (let i = 0; i < data.length; i++) {
            const contenders = [data[i].home_team, data[i].away_team, "Draw"];
            let outcomes = Array(3).fill(0.0);
            let bookmakers = Array(3).fill(null);
            for (let j = 0; j < data[i].bookmakers.length; j++) {
                if (j === 0) {
                    for (let len = 0; len < bookmakers.length; len++) {
                        bookmakers[len] = data[i].bookmakers[j].key;
                    }
                }
                for (let k = 0; k < data[i].bookmakers[j].markets.length; k++) {
                    for (let l = 0; l < data[i].bookmakers[j].markets[k].outcomes.length; l++) {
                        if (data[i].bookmakers[j].markets[k].outcomes[l].price > outcomes[l]) {
                            outcomes[l] = data[i].bookmakers[j].markets[k].outcomes[l].price;
                            bookmakers[l] = data[i].bookmakers[j].key;
                        }
                    }
                }
            }
            if (outcomes[2] === 0.0) {
                outcomes.pop();
                bookmakers.pop();
            }
            performArbitrageAnalysis(outcomes, bookmakers, market, contenders);
        }
    } catch (error) {
        console.error('Error fetching market data:', error);
    }
}

async function testConnection(key) {
    try {
        const response = await fetch(`https://api.the-odds-api.com/v4/sports/?apiKey=${key}`);
        if (response.status == 401) {
            return false;
        }
        return true;
    }
    catch (error) {
        console.error(`Failed to fetch using the following key: ${key}`, error);
        return false;
    }
}

function performArbitrageAnalysis(outcomes, bookmakers, market, contenders) {
    if (!outcomes.includes(0)) {
        const sum = outcomes.reduce((acc, odd) => acc + (1 / odd), 0);
        if (sum < 1.0) {
            let row = "<tr>";
            row += `<td>${contenders[1]} @ ${contenders[0]}</td>`;
            row += `<td>${market}</td>`;
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
                betslipContent += `${bookmakers[i]}: ${outcomes[i]} / ${decimalToAmerican(outcomes[i])}<br>`;
            }
            row += `<td>${betslipContent}</td>`;
            let stakeA, stakeB, stakeC;
            let stakeContent = "";
            if (outcomes.length === 3) {
                stakeA = Math.round((100 / outcomes[0]) / sum * 100) / 100;
                stakeB = Math.round((100 / outcomes[1]) / sum * 100) / 100;
                stakeC = 100 - (stakeA + stakeB);
                stakeContent = `${stakeA}%<br>${stakeB}%<br>${stakeC}%`;
            } else {
                stakeA = Math.round((100 / sum) / outcomes[0] * 100) / 100;
                stakeB = 100 - stakeA;
                stakeContent = `${stakeA}%<br>${stakeB}%`;
            }

            row += `<td>${stakeContent}</td>`;
            const profit = (100 / sum - 100).toFixed(2);
            row += `<td>$${profit}</td>`;
            row += "</tr>";
            $('#calc_bets').append(row);
        }
    }
}

function decimalToAmerican(decimalOdd) {
    if (decimalOdd >= 2.0) {
        return `+${Math.round((decimalOdd - 1) * 100)}`;
    } else {
        return `-${Math.round(100 / (decimalOdd - 1))}`;
    }
}

async function calculateBets() {
    const apiKey = localStorage.getItem("apiKey").trimEnd();
    if (apiKey == "") {
        $('#calc_bets').append("<tr><td colspan='5' style='text-align: center;'>please enter a key to find arbitrage opportunities</td></tr>");
        return;
    }
    const validConnection = await testConnection(apiKey);
    if (!validConnection) {
        $('#calc_bets').append("<tr><td colspan='5' style='text-align: center;'>invalid key, try again</td></tr>");
        return;
    }
    await performMarketScrape(
        `https://api.the-odds-api.com/v4/sports/upcoming/odds/?apiKey=${apiKey}&regions=us&markets=h2h&bookmakers=betonlineag,betmgm,betrivers,betus,bovada,draftkings,fanduel,lowvig,mybookieag`,
        "money"
    );
    await performMarketScrape(
        `https://api.the-odds-api.com/v4/sports/upcoming/odds/?apiKey=${apiKey}&regions=us&markets=spreads&bookmakers=betonlineag,betmgm,betrivers,betus,bovada,draftkings,fanduel,lowvig,mybookieag`,
        "spread"
    );
    await performMarketScrape(
        `https://api.the-odds-api.com/v4/sports/upcoming/odds/?apiKey=${apiKey}&regions=us&markets=totals&bookmakers=betonlineag,betmgm,betrivers,betus,bovada,draftkings,fanduel,lowvig,mybookieag`,
        "total"
    );
    if ($('#calc_bets').is(':empty')) {
        $('#calc_bets').append("<tr><td colspan='5' style='text-align: center;'>there are currently no arbitrage opportunities</td></tr>");
    }
}