<?php
session_start(); // Start the session

// Check if the user is already logged in
if (isset($_SESSION['username'])) {
    header("Location: welcome.php");
    exit();
}

// Initialize variables
$username = $password = "";
$username_err = $password_err = $login_err = "";

// Process form submission
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // Validate username
    if (empty(trim($_POST["username"]))) {
        $username_err = "Please enter your username.";
    } else {
        $username = trim($_POST["username"]);
    }

    // Validate password
    if (empty(trim($_POST["password"]))) {
        $password_err = "Please enter your password.";
    } else {
        $password = trim($_POST["password"]);
    }

    // Check credentials (for demo purposes, we use hardcoded values)
    if (empty($username_err) && empty($password_err)) {
        if ($username == "admin" && $password == "password123") {
            // Successful login
            $_SESSION["username"] = $username; // Store username in session
            header("Location: welcome.php"); // Redirect to welcome page
            exit();
        } else {
            $login_err = "Invalid username or password.";
        }
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login</title>
</head>
<body>
    <h2>Login</h2>

    <!-- Display login error if any -->
    <?php 
    if (!empty($login_err)) {
        echo '<div style="color:red;">' . $login_err . '</div>';
    }
    ?>

    <form action="<?php echo htmlspecialchars($_SERVER["PHP_SELF"]); ?>" method="post">
        <div>
            <label>Username:</label>
            <input type="text" name="username" value="<?php echo $username; ?>">
            <span style="color:red;"><?php echo $username_err; ?></span>
        </div>
        <br>
        <div>
            <label>Password:</label>
            <input type="password" name="password">
            <span style="color:red;"><?php echo $password_err; ?></span>
        </div>
        <br>
        <div>
            <input type="submit" value="Login">
        </div>
    </form>
</body>
</html>
