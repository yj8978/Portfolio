<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PHP Example</title>
</head>
<body>
    <h1>Welcome to My Website</h1>
    <p>
        <?php
            echo "Today's date is: " . date("Y-m-d");
        ?>
    </p>
    <p>
        <?php
            $hour = date("H");

            if ($hour < 12) {
                echo "Good morning!";
            } elseif ($hour < 18) {
                echo "Good afternoon!";
            } else {
                echo "Good evening!";
            }
        ?>
    </p>
        <?php
            $a = 5;
            $b = 10;
            $sum = $a + $b;
            echo "The sum of $a and $b is: $sum";
        ?>
    </p>
</body>
</html>
