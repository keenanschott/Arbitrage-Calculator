<?php
function performMarketScrape($curl, $request_url, $market)
{
    curl_setopt($curl, CURLOPT_URL, $request_url); // URL to fetch
    // Execute the cURL request
    $response = curl_exec($curl);
    $response = json_decode($response, true); // decode the JSON response into an associative array
    // check for cURL errors
    if ($response === false) {
        $error = curl_error($curl);
        echo "cURL Error: $error";
    } else {
        for ($i = 0; $i < count($response); $i++) {
            $contenders = [$response[$i]["home_team"], $response[$i]["away_team"], "Draw"]; // contender list, assuming 3-way market
            $outcomes = array_fill(0, 3, 0.0); // array of outcomes, assuming 3-way market
            $bookmakers = array_fill(0, 3, null); // array of bookmakers, assuming 3-way market
            for ($j = 0; $j < count($response[$i]["bookmakers"]); $j++) {
                if ($j === 0) {
                    for ($len = 0; $len < count($bookmakers); $len++) {
                        $bookmakers[$len] = $response[$i]["bookmakers"][$j]["key"]; // populate bookmakers array
                    }
                }
                for ($k = 0; $k < count($response[$i]["bookmakers"][$j]["markets"]); $k++) {
                    for ($l = 0; $l < count($response[$i]["bookmakers"][$j]["markets"][$k]["outcomes"]); $l++) {
                        if ($response[$i]["bookmakers"][$j]["markets"][$k]["outcomes"][$l]["price"] > $outcomes[$l]) {
                            $outcomes[$l] = $response[$i]["bookmakers"][$j]["markets"][$k]["outcomes"][$l]["price"]; // best outcome
                            $bookmakers[$l] = $response[$i]["bookmakers"][$j]["key"]; // corresponding bookmaker
                        }
                    }
                }
            }
            if ($outcomes[2] === 0.0) {
                array_pop($outcomes); // remove draw outcome if it doesn't exist
                array_pop($bookmakers);
            }
            // perform arbitrage analysis
            performArbitrageAnalysis($outcomes, $bookmakers, $market, $contenders);
        }
    }
}
function performArbitrageAnalysis($outcomes, $bookmakers, $market, $contenders)
{
    $sum = 0.0; // sum of inverse odds
    if (!in_array(0, $outcomes)) {
        foreach ($outcomes as $number) {
            $inverse = 1 / $number;
            $sum += $inverse;
        }
    } else {
        return;
    }
    if ($sum < 1.0) { // arbitrage opportunity
        echo "<tr>";
        echo "<th>" . $contenders[1] . " @ " . $contenders[0] . "</th>"; // away team @ home team
        echo "<th>" . $market . "</th>"; // market
        echo "<th>"; 
        for ($a = 0; $a < count($outcomes); $a++) {
            echo $contenders[$a] . " → " . $bookmakers[$a] . ": " . $outcomes[$a] . "/" . decimalToAmerican($outcomes[$a]) . "<br>"; // outcome → sportsbook: decimal odds/american odds
        }
        echo "</th>";
        echo "<th>";
        if (count($outcomes) === 3) {
            // TODO - implement 3-way market better; room for optimization because this is sort of cringe
            $stakeA = number_format(round((100 / ($outcomes[0] + $outcomes[1] + $outcomes[2])) * ($outcomes[1] * $outcomes[2]), 2), 2); // stake for contender A
            $stakeB = number_format(round((100 / ($outcomes[0] + $outcomes[1] + $outcomes[2])) * ($outcomes[0] * $outcomes[2]), 2), 2); // stake for contender B
            $stakeC = number_format(round((100 / ($outcomes[0] + $outcomes[1] + $outcomes[2])) * ($outcomes[0] * $outcomes[1]), 2), 2); // stake for contender C
            $multiplier = 100 / ($stakeA + $stakeB + $stakeC); // multiplier to scale stakes to 100
            $stakeA = number_format($stakeA * $multiplier, 2); // scaled stake for contender A
            $stakeB = number_format($stakeB * $multiplier, 2); // scaled stake for contender B
            $stakeC = number_format($stakeC * $multiplier, 2); // scaled stake for contender C
            echo $stakeA . "%<br>" . $stakeB . "%<br>" . $stakeC . "%"; // display stakes
        } else {
            $stakeA = number_format(round((100 / ($outcomes[0] + $outcomes[1])) * $outcomes[1], 2), 2); // stake for contender A
            $stakeB = number_format(round(100 - $stakeA, 2), 2); // stake for contender B 
            echo $stakeA . "%<br>" . $stakeB . "%"; // display stakes
        }
        echo "</th>";
        echo "<th>";
        if (count($outcomes) === 3) {
            echo "($stakeA * " . number_format($outcomes[0], 2) . ") - 100 <i>or</i><br>"; // display calculation
            echo "($stakeB * " . number_format($outcomes[1], 2) . ") - 100 <i>or</i><br>";
            echo "($stakeC * " . number_format($outcomes[2], 2) . ") - 100<br>=<br>";
        } else {
            echo "($stakeA * " . number_format($outcomes[0], 2) . ") - 100 <i>or</i><br>"; // display calculation
            echo "($stakeB * " . number_format($outcomes[1], 2) . ") - 100<br>=<br>";
        }
        echo "$" . number_format((100 / $sum) - 100, 2); // display profit
        echo "</th>";
        echo "</tr>";
    }
}

function decimalToAmerican($decimalOdd)
{
    if ($decimalOdd >= 2.0) {
        return "+" . round(($decimalOdd - 1) * 100); // positive odds
    } else {
        return "-" . round(100 / ($decimalOdd - 1)); // negative odds
    }
}

$key = file_get_contents("key.txt"); // get the API key from a text file 
                                     // TODO - move to .env file
$curl = curl_init();

// set the cURL options
curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
curl_setopt($curl, CURLOPT_SSL_VERIFYPEER, false);

// perform market scrape across three markets
performMarketScrape($curl, "https://api.the-odds-api.com/v4/sports/upcoming/odds/?apiKey=$key&regions=us&markets=h2h&bookmakers=fanduel,betmgm,draftkings,circasports,pointsbetus,barstool,betrivers,superbook,mybookieag", "Money");
performMarketScrape($curl, "https://api.the-odds-api.com/v4/sports/upcoming/odds/?apiKey=$key&regions=us&markets=spreads&bookmakers=fanduel,betmgm,draftkings,circasports,pointsbetus,barstool,betrivers,superbook,mybookieag", "Spread");
performMarketScrape($curl, "https://api.the-odds-api.com/v4/sports/upcoming/odds/?apiKey=$key&regions=us&markets=totals&bookmakers=fanduel,betmgm,draftkings,circasports,pointsbetus,barstool,betrivers,superbook,mybookieag", "Total");

// close the cURL session
curl_close($curl);