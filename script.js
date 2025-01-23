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
        document.getElementById('themeIcon').classList.add("fa-sun-o");
    } else {
        document.getElementById('themeIcon').classList.add("fa-moon-o");
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
        let rows = [];
        for (const match of data) {
            const contenders = [match.home_team, match.away_team, "DRAW"];
            let bestOutcomes = Array(3).fill(0.0);
            let bestBookmakers = Array(3).fill(null);
            let bestLinks = Array(3).fill(null);
            for (const bookmaker of match.bookmakers ?? []) {
                for (const marketEntry of bookmaker.markets ?? []) {
                    for (let i = 0; i < marketEntry.outcomes.length; i++) {
                        const outcome = marketEntry.outcomes[i];
                        if (outcome.price > bestOutcomes[i]) {
                            bestOutcomes[i] = outcome.price;
                            bestBookmakers[i] = bookmaker.key;
                            bestLinks[i] = (bookmaker.link ?? "").replace("{state}", "co");
                        }
                    }
                }
            }
            if (bestOutcomes[2] === 0.0) {
                bestOutcomes.pop();
                bestBookmakers.pop();
                bestLinks.pop();
            }
            const row = performArbitrageAnalysis(bestOutcomes, bestBookmakers, bestLinks, market, contenders);
            if (row) {
                rows.push(row);
            }
        }
        return rows;
    } catch (error) {
        console.error('Error fetching market data:', error);
        return [];
    }
}

async function testConnection(key) {
    try {
        const response = await fetch(`https://api.the-odds-api.com/v4/sports/?apiKey=${key}`);
        return response.status !== 401;
    }
    catch (error) {
        console.error(`Failed to fetch using the following key: ${key}`, error);
        return false;
    }
}

function performArbitrageAnalysis(outcomes, bookmakers, links, market, contenders) {
    if (outcomes.every(odd => odd > 0)) {
        const inverseSum = outcomes.reduce((acc, odd) => acc + (1 / odd), 0);
        if (inverseSum < 1.0) {
            let row = { html: "", profit: 0 };
            row.html += `<tr>`;
            row.html += `<td>${contenders[1]} @ ${contenders[0]}</td>`;
            row.html += `<td>${market}</td>`;
            let betslipContent = outcomes.map((outcome, i) => {
                const americanOdd = decimalToAmerican(outcome);
                const bookmakerLink = links[i] ? `<b><a href="${links[i]}" target="_blank" class="no-style">${bookmakers[i]}</a></b>` : bookmakers[i];
                const contender = (i === 0 ? contenders[1] : i === 1 ? contenders[0] : contenders[i]).replace(/[^A-Z0-9]/g, '');
                return `${contender}<br>${bookmakerLink}<br>${outcome} / ${americanOdd}`;
            }).join("<br><b>+</b><br>");
            row.html += `<td>${betslipContent}</td>`;
            const stakes = outcomes.map(odd => Math.round((100 / odd) / inverseSum * 100) / 100);
            const stakeContent = stakes.map(stake => `${stake}%`).join("<br>");
            row.html += `<td>${stakeContent}</td>`;
            row.profit = (100 / inverseSum - 100).toFixed(2);
            row.html += `<td>${row.profit}%</td>`;
            row.html += `</tr>`;
            return row;
        }
    }
    return null;
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
    if (apiKey === "") {
        $('#calc_bets').append("<tr><td colspan='5' style='text-align: center;'>please enter a key to find arbitrage opportunities</td></tr>");
        return;
    }
    const validConnection = await testConnection(apiKey);
    if (!validConnection) {
        $('#calc_bets').append("<tr><td colspan='5' style='text-align: center;'>invalid key, try again</td></tr>");
        return;
    }
    const urls = [
        `https://api.the-odds-api.com/v4/sports/upcoming/odds/?apiKey=${apiKey}&regions=us&markets=h2h&bookmakers=betonlineag,betmgm,betrivers,betus,bovada,draftkings,fanduel,lowvig,mybookieag&includeLinks=true`,
        `https://api.the-odds-api.com/v4/sports/upcoming/odds/?apiKey=${apiKey}&regions=us&markets=spreads&bookmakers=betonlineag,betmgm,betrivers,betus,bovada,draftkings,fanduel,lowvig,mybookieag&includeLinks=true`,
        `https://api.the-odds-api.com/v4/sports/upcoming/odds/?apiKey=${apiKey}&regions=us&markets=totals&bookmakers=betonlineag,betmgm,betrivers,betus,bovada,draftkings,fanduel,lowvig,mybookieag&includeLinks=true`,
    ];
    let allRows = [];
    for (const url of urls) {
        const rows = await performMarketScrape(url, url.includes("h2h") ? "moneyline" : url.includes("spreads") ? "spread" : "total");
        allRows = allRows.concat(rows);
    }
    if (allRows.length > 0) {
        allRows.sort((a, b) => parseFloat(b.profit) - parseFloat(a.profit));
        $('#calc_bets').append(allRows.map(row => row.html).join(""));
    } else {
        $('#calc_bets').append("<tr><td colspan='5' style='text-align: center;'>there are currently no arbitrage opportunities</td></tr>");
    }
}