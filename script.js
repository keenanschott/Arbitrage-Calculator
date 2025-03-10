/**
 * arbitragecalculatorus.com
 * 
 * This script provides functionality to calculate and display arbitrage opportunities.
 * 
 * This function performs the following tasks:
 * - Retrieves the API key from localStorage and sets it in the input field.
 * - Retrieves the theme preferences from localStorage and sets the theme based on the stored value.
 * - Adds functionality to the API key button to store the new key and recalculate bets.
 * - Adds functionality to the dark mode toggle button to switch between light and dark themes.
 * - Calls the `calculateBets` function to calculate and display arbitrage opportunities.
 */
$(document).ready(async function () {
    // API key initialization; check stored key or set to empty string
    if (!localStorage.hasOwnProperty("API")) {
        localStorage.setItem("API", "");
    }
    const storedKey = localStorage.getItem("API");
    $('#APIKeyInput').val(storedKey);
    // add functionality to the API key button
    $('#setAPIKeyButton').click(async function () {
        const key = $('#APIKeyInput').val();
        // store the new key and recalculate bets
        localStorage.setItem("API", key);
        $('#calcBets').empty();
        await calculateBets();
    });
    // theme initialization; check stored theme or set based on system preferences
    if (!localStorage.hasOwnProperty("darkMode")) {
        localStorage.setItem("darkMode", (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? "enabled" : "disabled");
    }
    const storedMode = localStorage.getItem("darkMode");
    const themeLink = $('#theme-link');
    const themeIcon = $('#themeIcon');
    const favicon = $('#favicon');
    // set the theme based on the stored value
    if (storedMode === "enabled") {
        themeLink.attr('href', './css/dark.css');
        themeIcon.addClass('fa-sun');
        favicon.attr('href', './assets/darkicon.ico');
    } else if (storedMode === "disabled") {
        themeLink.attr('href', './css/light.css');
        themeIcon.addClass('fa-moon');
        favicon.attr('href', './assets/lighticon.ico');
    }
    // add functionality to the dark mode toggle button
    $('#darkModeToggle').click(function () {
        const isLightMode = themeLink.attr('href') === './css/light.css';
        if (isLightMode) {
            themeLink.attr('href', './css/dark.css');
            localStorage.setItem("darkMode", "enabled");
            themeIcon.removeClass('fa-moon').addClass('fa-sun');
            favicon.attr('href', './assets/darkicon.ico');
        } else {
            themeLink.attr('href', './css/light.css');
            localStorage.setItem("darkMode", "disabled");
            themeIcon.removeClass('fa-sun').addClass('fa-moon');
            favicon.attr('href', './assets/lighticon.ico');
        }
    });
    // calculate bets once the document is ready
    await calculateBets();
});

/**
 * Calculates and displays arbitrage opportunities based on the available betting odds.
 * 
 * This function fetches betting odds from multiple sports bookmakers and checks for arbitrage opportunities 
 * in three different market types: head-to-head (moneyline), the spread, and totals. It uses the provided API key 
 * stored in localStorage to access the odds API and handles potential errors such as invalid keys or missing data.
 * 
 * @returns {Promise<void>} - A promise that resolves once the arbitrage opportunities have been fetched 
 * and displayed or an error message is shown.
 */
async function calculateBets() {
    // retrieve API key from localStorage and trim any trailing spaces
    const key = localStorage.getItem("API").trimEnd();
    if (key === "") {
        $('#calcBets').append("<tr><td colspan='5' style='text-align: center;'>please enter a key to find arbitrage opportunities</td></tr>");
        return;
    }
    // test the connection using the API key
    const validConnection = await testConnection(key);
    if (!validConnection) {
        $('#calcBets').append("<tr><td colspan='5' style='text-align: center;'>invalid key, try again</td></tr>");
        return;
    }
    // check if the user has enough requests remaining
    const requestsRemain = await testRequests(key);
    if (!requestsRemain) {
        $('#calcBets').append("<tr><td colspan='5' style='text-align: center;'>you have exceeded the request limit</td></tr>");
        return;
    }
    // initialize an empty array to store the arbitrage opportunities
    let allRows = [];
    allRows = allRows.concat(await moneyline(`https://api.the-odds-api.com/v4/sports/upcoming/odds/?apiKey=${key}&regions=us&markets=h2h&bookmakers=betonlineag,betmgm,betrivers,betus,bovada,draftkings,fanduel,lowvig,mybookieag&includeLinks=true`));
    allRows = allRows.concat(await spread(`https://api.the-odds-api.com/v4/sports/upcoming/odds/?apiKey=${key}&regions=us&markets=spreads&bookmakers=betonlineag,betmgm,betrivers,betus,bovada,draftkings,fanduel,lowvig,mybookieag&includeLinks=true`));
    allRows = allRows.concat(await total(`https://api.the-odds-api.com/v4/sports/upcoming/odds/?apiKey=${key}&regions=us&markets=totals&bookmakers=betonlineag,betmgm,betrivers,betus,bovada,draftkings,fanduel,lowvig,mybookieag&includeLinks=true`));
    // check if there are any opportunities found
    if (allRows.length > 0) {
        // sort the opportunities by profit in descending order
        allRows.sort((a, b) => parseFloat(b.profit) - parseFloat(a.profit));
        // display the opportunities in the table
        $('#calcBets').append(allRows.map(row => row.html).join(""));
    } else {
        // if no opportunities are found, show a message indicating no arbitrage opportunities
        $('#calcBets').append("<tr><td colspan='5' style='text-align: center;'>there are currently no arbitrage opportunities</td></tr>");
    }
}

/**
 * Tests the validity of an API key by making a request to the odds API.
 * 
 * @param {string} key - The API key to test.
 * @returns {Promise<boolean>} - A promise that resolves to `true` if the API key is valid, `false` otherwise.
 */
async function testConnection(key) {
    try {
        const response = await fetch(`https://api.the-odds-api.com/v4/sports/?apiKey=${key}`);
        console.log(response);
        response.headers.forEach((value, key) => console.log(`${key}: ${value}`));
        response.headers['x-requests-remaining'] <= 0;
        return response.status !== 401;
    }
    catch (error) {
        console.error(`Failed to fetch using the following key: ${key}`, error);
        return false;
    }
}

/**
 * Tests the number of remaining requests for an API key.
 * 
 * @param {string} key - The API key to test.
 * @returns {Promise<boolean>} - A promise that resolves to `true` if the user has requests remaining, `false` otherwise.
 */
async function testRequests(key) {
    try {
        const response = await fetch(`https://api.the-odds-api.com/v4/sports/?apiKey=${key}`);
        const requestsRemaining = response.headers.get('x-requests-remaining');
        return requestsRemaining >= 3;
    }
    catch (error) {
        console.error(`Failed to fetch using the following key: ${key}`, error);
        return false;
    }
}

/**
 * Finds arbitrage opportunities in moneyline markets.
 * 
 * @param {string} requestURL - The totals URL to fetch market data from.
 * @returns {Promise<string[]>} - A promise resolving to an array of formatted HTML rows.
 */
async function moneyline(requestURL) {
    try {
        // fetch the data from the API
        const response = await fetch(requestURL);
        const data = await response.json();
        const opportunities = [];
        for (const match of data) {
            // initialize the contenders with default values
            let contenders = [
                { price: 0, name: match.away_team, bookmaker: "", link: "" },
                { price: 0, name: match.home_team, bookmaker: "", link: "" },
                { price: 0, name: "Draw", bookmaker: "", link: "" }
            ];
            for (const bookmaker of match.bookmakers ?? []) {
                const outcomes = bookmaker.markets[0]?.outcomes ?? [];
                // iterate over the outcomes to find the best price for each contender
                outcomes.forEach(outcome => {
                    if (outcome?.price > 0) {
                        const index = outcome.name === match.away_team
                            ? 0
                            : outcome.name === match.home_team
                                ? 1
                                : outcome.name === "Draw"
                                    ? 2
                                    : -1;
                        // update the contender if the price is higher than the current best price
                        if (index >= 0 && outcome.price > contenders[index].price) {
                            Object.assign(contenders[index], {
                                price: outcome.price,
                                bookmaker: bookmaker.title,
                                link: bookmaker.link ?? ""
                            });
                        }
                    }
                });
            }
            // filter out contenders with a price of 0 (invalid outcomes)
            contenders = contenders.filter(contender => contender.price > 0);
            let arbitrage = 0;
            contenders.forEach(contender => arbitrage += 1 / contender.price);
            // check for arbitrage opportunities
            if (contenders.length >= 2 && arbitrage < 1) {
                opportunities.push({
                    match: `${match.away_team} @ ${match.home_team}`,
                    contenders: contenders
                });
            }
        }
        // format and return the opportunities as HTML rows
        return opportunities.map(opportunity => format(opportunity, "moneyline"));
    } catch (error) {
        console.error('Error fetching market data:', error);
        return [];
    }
}

/**
 * Finds arbitrage opportunities in spread markets.
 * 
 * @param {string} requestURL - The totals URL to fetch market data from.
 * @returns {Promise<string[]>} - A promise resolving to an array of formatted HTML rows.
 */
async function spread(requestURL) {
    try {
        // fetch the data from the API
        const response = await fetch(requestURL);
        const data = await response.json();
        const opportunities = [];
        for (const match of data) {
            // group outcomes by point spread (e.g., -2.5, +3.5)
            const outcomesByPoint = new Map();
            for (const bookmaker of match.bookmakers ?? []) {
                for (const marketEntry of bookmaker.markets ?? []) {
                    for (const outcome of marketEntry.outcomes ?? []) {
                        // store the outcomes by point spread (positive or negative)
                        const point = Math.abs(outcome.point);
                        const outcomes = outcomesByPoint.get(point) || [];
                        outcomes.push({
                            price: outcome.price,
                            contender: outcome.name,
                            bookmaker: bookmaker.title,
                            link: bookmaker.link ?? ""
                        });
                        outcomesByPoint.set(point, outcomes);
                    }
                }
            }
            // iterate over the refined data
            for (const [point, outcomes] of outcomesByPoint) {
                // find the best price for the away and home contenders
                const bestAway = outcomes
                    .filter(o => o.contender === match.away_team)
                    .reduce((best, o) => (o.price > best.price ? o : best), { price: 0 });
                const bestHome = outcomes
                    .filter(o => o.contender === match.home_team)
                    .reduce((best, o) => (o.price > best.price ? o : best), { price: 0 });
                // check if both contenders have valid prices
                if (bestAway.price > 0 && bestHome.price > 0) {
                    // check for arbitrage
                    const arbitrage = (1 / bestAway.price) + (1 / bestHome.price);
                    if (arbitrage < 1) {
                        opportunities.push({
                            match: `${match.away_team} @ ${match.home_team}`,
                            point: point,
                            contenders: [
                                {
                                    name: match.away_team,
                                    price: bestAway.price,
                                    bookmaker: bestAway.bookmaker,
                                    link: bestAway.link ?? ""
                                },
                                {
                                    name: match.home_team,
                                    price: bestHome.price,
                                    bookmaker: bestHome.bookmaker,
                                    link: bestHome.link ?? ""
                                }
                            ]
                        });
                    }
                }
            }
        }
        // format and return the opportunities as HTML rows
        return opportunities.map(opportunity => format(opportunity, "spread"));
    } catch (error) {
        console.error('Error fetching market data:', error);
        return [];
    }
}

/**
 * Finds arbitrage opportunities in over/under markets.
 * 
 * @param {string} requestURL - The totals URL to fetch market data from.
 * @returns {Promise<string[]>} - A promise resolving to an array of formatted HTML rows.
 */
async function total(requestURL) {
    try {
        // fetch the data from the API
        const response = await fetch(requestURL);
        const data = await response.json();
        const opportunities = [];
        for (const match of data) {
            // group outcomes by point spread (e.g., 2.5, 3.5)
            const outcomesByPoint = new Map();
            for (const bookmaker of match.bookmakers ?? []) {
                for (const marketEntry of bookmaker.markets ?? []) {
                    for (const outcome of marketEntry.outcomes ?? []) {
                        // store the outcomes by point spread
                        const point = outcome.point;
                        const outcomes = outcomesByPoint.get(point) || [];
                        outcomes.push({
                            price: outcome.price,
                            contender: outcome.name,
                            bookmaker: bookmaker.title,
                            link: bookmaker.link ?? ""
                        });
                        outcomesByPoint.set(point, outcomes);
                    }
                }
            }
            // iterate over the refined data
            for (const [point, outcomes] of outcomesByPoint) {
                // find the best price for the over and under contenders
                const bestOver = outcomes
                    .filter(o => o.contender === "Over")
                    .reduce((best, o) => (o.price > best.price ? o : best), { price: 0 });
                const bestUnder = outcomes
                    .filter(o => o.contender === "Under")
                    .reduce((best, o) => (o.price > best.price ? o : best), { price: 0 });
                // check if both contenders have valid prices
                if (bestOver.price > 0 && bestUnder.price > 0) {
                    // check for arbitrage
                    const arbitrage = (1 / bestOver.price) + (1 / bestUnder.price);
                    if (arbitrage < 1) {
                        opportunities.push({
                            match: `${match.away_team} @ ${match.home_team}`,
                            point: point,
                            contenders: [
                                {
                                    name: "Over",
                                    price: bestOver.price,
                                    bookmaker: bestOver.bookmaker,
                                    link: bestOver.link ?? ""
                                },
                                {
                                    name: "Under",
                                    price: bestUnder.price,
                                    bookmaker: bestUnder.bookmaker,
                                    link: bestUnder.link ?? ""
                                }
                            ]
                        });
                    }
                }
            }
        }
        // format and return the opportunities as HTML rows
        return opportunities.map(opportunity => format(opportunity, "total"));
    } catch (error) {
        console.error('Error fetching market data:', error);
        return [];
    }
}

/**
 * Formats arbitrage opportunities into an HTML table row and calculates profit.
 *
 * @param {Object} opportunities - The arbitrage opportunity data.
 * @param {string} market - The market type (e.g., "total").
 * @returns {Object} - An object containing the formatted HTML row (`html`) and the profit (`profit`).
 */
function format(opportunities, market) {
    let row = "<tr>";
    // the event column
    row += `<td>${opportunities.match}</td>`;
    // the market column
    if (market === "total" || market === "spread") {
        row += `<td>${market} @ ${opportunities.point}</td>`;
    } else {
        row += `<td>${market}</td>`;
    }
    // the betslip column
    const betslip = opportunities.contenders
        .map(contender => {
            const americanOdds = convertDecimalToAmericanOdds(contender.price);
            const link = contender.link
                ? `<b><a href="${contender.link.replace("{state}", "co")}" target="_blank" class="no-style">${contender.bookmaker}</a></b>`
                : contender.bookmaker;
            return `${contender.name}<br>${link}<br>${contender.price} / ${americanOdds}`;
        })
        .join("<br><b>+</b><br>");
    row += `<td>${betslip}</td>`;
    // the stake column
    const totalInverseOdds = opportunities.contenders.reduce((acc, contender) => acc + (1 / contender.price), 0);
    const stakes = opportunities.contenders.map(
        contender => (100 / (contender.price * totalInverseOdds)).toFixed(2)
    );
    const percentageBet = stakes.map(stake => ((stake / 100) * 100).toFixed(2));
    const stakeColumn = opportunities.contenders
        .map((_, i) => `${percentageBet[i]}%`)
        .join("<br><b>+</b><br>");
    row += `<td>${stakeColumn}</td>`;
    // the profit column
    const profit = ((1 / totalInverseOdds) - 1) * 100;
    row += `<td>${profit.toFixed(2)}%</td>`;
    row += "</tr>";
    return {
        html: row,
        profit: profit.toFixed(2)
    };
}

/**
 * Converts decimal odds to American odds format.
 * 
 * @param {number} decimalOdds - The decimal odds value to be converted.
 * @returns {string} - The corresponding American odds in string format.
 * 
 * If the decimal odds are greater than or equal to 2.0, the function calculates 
 * the American odds as a positive number (e.g., +150). If the decimal odds are less 
 * than 2.0, the function calculates the American odds as a negative number (e.g., -120).
 */
function convertDecimalToAmericanOdds(decimalOdds) {
    if (decimalOdds >= 2.0) {
        return `+${Math.round((decimalOdds - 1) * 100)}`;
    } else {
        return `-${Math.round(100 / (decimalOdds - 1))}`;
    }
}