<?php
/**
 * ============================================================================
 * Bites & Clicks - Feedback & Contact Form Processor
 * File: process_feedback.php
 * 
 * Handles incoming POST requests from the website contact/feedback form,
 * enforces rigorous sanitization and validation, and securely inserts the
 * submission into the `user_feedback` MySQL table using PDO prepared statements.
 * ============================================================================
 */

// Enable strict type enforcement
declare(strict_types=1);

// Prevent caching
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

// ----------------------------------------------------------------------------
// 1. Database Configuration (Placeholder Credentials)
// ----------------------------------------------------------------------------
define('DB_HOST', 'localhost');          // Database host (e.g., 127.0.0.1 or localhost)
define('DB_PORT', '3306');               // Database port
define('DB_NAME', 'biteclicks_db');      // Database name
define('DB_USER', 'your_db_username');   // Database user
define('DB_PASS', 'your_db_password');   // Database password
define('DB_CHARSET', 'utf8mb4');         // Full Unicode support

// Redirect destination after processing
define('REDIRECT_URL', 'index.html#contact');

// ----------------------------------------------------------------------------
// 2. Helper: Detect if Request is AJAX / JSON
// ----------------------------------------------------------------------------
function isAjaxRequest(): bool {
    $hasAjaxHeader = !empty($_SERVER['HTTP_X_REQUESTED_WITH']) && 
                     strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest';
    $acceptsJson   = !empty($_SERVER['HTTP_ACCEPT']) && 
                     strpos(strtolower($_SERVER['HTTP_ACCEPT']), 'application/json') !== false;
    return $hasAjaxHeader || $acceptsJson;
}

// ----------------------------------------------------------------------------
// 3. Helper: Terminate with Clean Error Response
// ----------------------------------------------------------------------------
function respondWithError(string $errorMessage, int $statusCode = 400): void {
    if (isAjaxRequest()) {
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'status'  => 'error',
            'message' => $errorMessage
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Traditional Form Submission: Redirect back with error parameters
    $redirect = 'index.html?status=error&msg=' . urlencode($errorMessage) . '#contact';
    header('Location: ' . $redirect);
    exit;
}

// ----------------------------------------------------------------------------
// 4. Helper: Terminate with Success Response
// ----------------------------------------------------------------------------
function respondWithSuccess(string $successMessage = 'Thank you! Your feedback has been received.'): void {
    if (isAjaxRequest()) {
        http_response_code(200);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'status'  => 'success',
            'message' => $successMessage
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Traditional Form Submission: Redirect back with success flag
    $redirect = 'index.html?status=success#contact';
    header('Location: ' . $redirect);
    exit;
}

// ----------------------------------------------------------------------------
// 5. Method Guard: Only Allow POST Requests
// ----------------------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondWithError('Invalid request method. Only POST submissions are accepted.', 405);
}

// ----------------------------------------------------------------------------
// 6. Data Extraction & Anti-XSS Sanitization
// ----------------------------------------------------------------------------
// Support both 'feedback' and 'message' keys from the form
$rawName     = $_POST['name']     ?? '';
$rawEmail    = $_POST['email']    ?? '';
$rawFeedback = $_POST['feedback'] ?? ($_POST['message'] ?? '');

// Strip null bytes and control characters
$cleanName     = str_replace("\0", '', (string)$rawName);
$cleanEmail    = str_replace("\0", '', (string)$rawEmail);
$cleanFeedback = str_replace("\0", '', (string)$rawFeedback);

// Trim whitespace
$trimmedName     = trim($cleanName);
$trimmedEmail    = trim($cleanEmail);
$trimmedFeedback = trim($cleanFeedback);

// Sanitize inputs for XSS prevention while retaining readable content
$sanitizedName     = htmlspecialchars($trimmedName, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
$sanitizedFeedback = htmlspecialchars($trimmedFeedback, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
$sanitizedEmail    = filter_var($trimmedEmail, FILTER_SANITIZE_EMAIL);

// ----------------------------------------------------------------------------
// 7. Input Validation Rules
// ----------------------------------------------------------------------------
$errors = [];

// Name validation
if (empty($sanitizedName)) {
    $errors[] = 'Please enter your name.';
} elseif (mb_strlen($sanitizedName, 'UTF-8') > 150) {
    $errors[] = 'Name cannot exceed 150 characters.';
}

// Email validation
if (empty($sanitizedEmail)) {
    $errors[] = 'Please enter your email address.';
} elseif (!filter_var($sanitizedEmail, FILTER_VALIDATE_EMAIL)) {
    $errors[] = 'Please enter a valid email address (e.g. name@example.com).';
} elseif (strlen($sanitizedEmail) > 255) {
    $errors[] = 'Email cannot exceed 255 characters.';
}

// Feedback message validation
if (empty($sanitizedFeedback)) {
    $errors[] = 'Please enter your feedback or suggestions.';
} elseif (mb_strlen($sanitizedFeedback, 'UTF-8') > 5000) {
    $errors[] = 'Feedback message cannot exceed 5000 characters.';
}

// Return first validation error if any found
if (!empty($errors)) {
    respondWithError($errors[0], 422);
}

// ----------------------------------------------------------------------------
// 8. Database Connection (PDO) & Secure Prepared Insert
// ----------------------------------------------------------------------------
try {
    // Data Source Name (DSN)
    $dsn = sprintf(
        'mysql:host=%s;port=%s;dbname=%s;charset=%s',
        DB_HOST,
        DB_PORT,
        DB_NAME,
        DB_CHARSET
    );

    // PDO connection options for security and resilience
    $pdoOptions = [
        // Throw exceptions on SQL errors
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        // Fetch as associative arrays by default
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        // Disable emulated prepares to enforce true database-level prepared statements (SQL Injection Prevention)
        PDO::ATTR_EMULATE_PREPARES   => false,
        // Connection timeout
        PDO::ATTR_TIMEOUT            => 5,
    ];

    // Instantiate PDO
    $pdo = new PDO($dsn, DB_USER, DB_PASS, $pdoOptions);

    // SQL statement with named placeholders
    $sql = "INSERT INTO user_feedback (name, email, message, submitted_at) 
            VALUES (:name, :email, :message, NOW())";

    // Prepare statement
    $stmt = $pdo->prepare($sql);

    // Execute with securely bound parameters
    $stmt->execute([
        ':name'    => $sanitizedName,
        ':email'   => $sanitizedEmail,
        ':message' => $sanitizedFeedback,
    ]);

    // Submission succeeded
    respondWithSuccess('Thank you! Your feedback has been successfully sent to Bites & Clicks.');

} catch (PDOException $e) {
    // Log internal database errors securely to the server error log (never expose DB credentials to client)
    error_log('[Bites & Clicks DB Error] ' . $e->getMessage());

    respondWithError('A database error occurred while saving your feedback. Please try again later or email us directly at bites.clicks@gmail.com.', 500);

} catch (Throwable $t) {
    // Catch-all general exceptions
    error_log('[Bites & Clicks General Error] ' . $t->getMessage());

    respondWithError('An unexpected error occurred. Please try again later.', 500);
}
