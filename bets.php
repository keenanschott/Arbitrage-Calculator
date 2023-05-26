<?php
function performMarketScrape($curl, $request_url, $market)
{
    curl_setopt($curl, CURLOPT_URL, $request_url);
    // Execute the cURL request
    $response = curl_exec($curl);
    $response = json_decode($response, true);
    // Check for cURL errors
    if ($response === false) {
        $error = curl_error($curl);
        echo "cURL Error: $error";
    } else {
        for ($i = 0; $i < count($response); $i++) {
            $contenders = [$response[$i]["home_team"], $response[$i]["away_team"], "Draw"];
            $outcomes = array_fill(0, 3, 0.0);
            $bookmakers = array_fill(0, 3, null);
            for ($j = 0; $j < count($response[$i]["bookmakers"]); $j++) {
                if ($j === 0) {
                    for ($len = 0; $len < count($bookmakers); $len++) {
                        $bookmakers[$len] = $response[$i]["bookmakers"][$j]["key"];
                    }
                }
                for ($k = 0; $k < count($response[$i]["bookmakers"][$j]["markets"]); $k++) {
                    for ($l = 0; $l < count($response[$i]["bookmakers"][$j]["markets"][$k]["outcomes"]); $l++) {
                        if ($response[$i]["bookmakers"][$j]["markets"][$k]["outcomes"][$l]["price"] > $outcomes[$l]) {
                            $outcomes[$l] = $response[$i]["bookmakers"][$j]["markets"][$k]["outcomes"][$l]["price"];
                            $bookmakers[$l] = $response[$i]["bookmakers"][$j]["key"];
                        }
                    }
                }
            }
            if ($outcomes[2] === 0.0) {
                array_pop($outcomes);
                array_pop($bookmakers);
            }
            // Perform arbitrage analysis on the bets array
            performArbitrageAnalysis($outcomes, $bookmakers, $market, $contenders);
        }
    }
}
function performArbitrageAnalysis($outcomes, $bookmakers, $market, $contenders)
{
    $sum = 0.0;
    if (!in_array(0, $outcomes)) {
        foreach ($outcomes as $number) {
            $inverse = 1 / $number;
            $sum += $inverse;
        }
    } else {
        return;
    }
    if ($sum < 1.0) {
        echo "<tr>";
        echo "<th>" . $contenders[1] . " @ " . $contenders[0] . "</th>";
        echo "<th>" . $market . "</th>";
        echo "<th>";
        for ($a = 0; $a < count($outcomes); $a++) {
            echo $contenders[$a] . " → " . $bookmakers[$a] . ": " . $outcomes[$a] . "/" . decimalToAmerican($outcomes[$a]) . "<br>";
        }
        echo "</th>";
        echo "<th>";

        if (count($outcomes) === 3) {
            $stakeA = number_format(round((100 / ($outcomes[0] + $outcomes[1] + $outcomes[2])) * ($outcomes[1] * $outcomes[2]), 2), 2);
            $stakeB = number_format(round((100 / ($outcomes[0] + $outcomes[1] + $outcomes[2])) * ($outcomes[0] * $outcomes[2]), 2), 2);
            $stakeC = number_format(round((100 / ($outcomes[0] + $outcomes[1] + $outcomes[2])) * ($outcomes[0] * $outcomes[1]), 2), 2);
            $multiplier = 100 / ($stakeA + $stakeB + $stakeC);
            $stakeA = number_format($stakeA * $multiplier, 2);
            $stakeB = number_format($stakeB * $multiplier, 2);
            $stakeC = number_format($stakeC * $multiplier, 2);
            echo $stakeA . "%<br>" . $stakeB . "%<br>" . $stakeC . "%";
        } else {
            $stakeA = number_format(round((100 / ($outcomes[0] + $outcomes[1])) * $outcomes[1], 2), 2);
            $stakeB = number_format(round(100 - $stakeA, 2), 2);
            echo $stakeA . "%<br>" . $stakeB . "%";
        }


        echo "</th>";
        echo "<th>";

        if (count($outcomes) === 3) {
            echo "($stakeA * " . number_format($outcomes[0], 2) . ") - 100 <i>or</i><br>";
            echo "($stakeB * " . number_format($outcomes[1], 2) . ") - 100 <i>or</i><br>";
            echo "($stakeC * " . number_format($outcomes[2], 2) . ") - 100<br>=<br>";
        } else {
            echo "($stakeA * " . number_format($outcomes[0], 2) . ") - 100 <i>or</i><br>";
            echo "($stakeB * " . number_format($outcomes[1], 2) . ") - 100<br>=<br>";
        }
        echo "$" . number_format((100 / $sum) - 100, 2);
        echo "</th>";
        echo "</tr>";
    }
}

function decimalToAmerican($decimalOdd)
{
    if ($decimalOdd >= 2.0) {
        return "+" . round(($decimalOdd - 1) * 100);
    } else {
        return "-" . round(100 / ($decimalOdd - 1));
    }
}

$key = file_get_contents("key.txt"); 
$curl = curl_init();

// Set the cURL options
curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
curl_setopt($curl, CURLOPT_SSL_VERIFYPEER, false);

performMarketScrape($curl, "https://api.the-odds-api.com/v4/sports/upcoming/odds/?apiKey=$key&regions=us&markets=h2h&bookmakers=fanduel,betmgm,draftkings,circasports,pointsbetus,barstool,betrivers,superbook,mybookieag", "Money");
performMarketScrape($curl, "https://api.the-odds-api.com/v4/sports/upcoming/odds/?apiKey=$key&regions=us&markets=spreads&bookmakers=fanduel,betmgm,draftkings,circasports,pointsbetus,barstool,betrivers,superbook,mybookieag", "Spread");
performMarketScrape($curl, "https://api.the-odds-api.com/v4/sports/upcoming/odds/?apiKey=$key&regions=us&markets=totals&bookmakers=fanduel,betmgm,draftkings,circasports,pointsbetus,barstool,betrivers,superbook,mybookieag", "Total");

// Close the cURL session
curl_close($curl);