<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

$configFile = __DIR__ . '/availability-config.php';
if (!file_exists($configFile)) {
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'error' => 'Missing availability-config.php file.'
    ]);
    exit;
}

require $configFile;

if (!defined('BOOKING_ICS_URL') || BOOKING_ICS_URL === '') {
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'error' => 'BOOKING_ICS_URL is not configured.'
    ]);
    exit;
}

if (!defined('AVAILABILITY_CACHE_TTL')) {
    define('AVAILABILITY_CACHE_TTL', 900);
}

$cacheDir = __DIR__ . '/cache';
$cacheFile = $cacheDir . '/availability-cache.json';
$cacheTtl = max(60, (int) AVAILABILITY_CACHE_TTL);
$horizonDays = 540;

function respond(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload);
    exit;
}

function start_of_utc_day(DateTimeImmutable $date): DateTimeImmutable
{
    return $date->setTimezone(new DateTimeZone('UTC'))->setTime(0, 0, 0);
}

function add_utc_days(DateTimeImmutable $date, int $days): DateTimeImmutable
{
    return $date->modify(($days >= 0 ? '+' : '') . $days . ' days');
}

function to_iso_date(DateTimeImmutable $date): string
{
    return $date->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d');
}

function unfold_ics_lines(string $icsText): array
{
    $rawLines = preg_split("/\r\n|\n|\r/", $icsText) ?: [];
    $lines = [];

    foreach ($rawLines as $line) {
        if (($line !== '') && (str_starts_with($line, ' ') || str_starts_with($line, "\t")) && !empty($lines)) {
            $lines[count($lines) - 1] .= substr($line, 1);
            continue;
        }

        $lines[] = $line;
    }

    return $lines;
}

function parse_property(string $line): ?array
{
    $separator = strpos($line, ':');
    if ($separator === false) {
        return null;
    }

    $left = substr($line, 0, $separator);
    $value = substr($line, $separator + 1);
    $parts = explode(';', $left);
    $name = strtoupper(array_shift($parts));
    $params = [];

    foreach ($parts as $part) {
        $paramParts = explode('=', $part, 2);
        if (count($paramParts) === 2) {
            $params[strtoupper($paramParts[0])] = $paramParts[1];
        }
    }

    return [
        'name' => $name,
        'params' => $params,
        'value' => trim($value)
    ];
}

function parse_ics_date(string $value, array $params): ?array
{
    $isDateOnly = (($params['VALUE'] ?? '') === 'DATE') || preg_match('/^\d{8}$/', $value);

    if ($isDateOnly) {
      $date = DateTimeImmutable::createFromFormat('!Ymd', $value, new DateTimeZone('UTC'));
      return $date ? ['date' => $date, 'isDateOnly' => true] : null;
    }

    $normalized = str_ends_with($value, 'Z') ? $value : $value . 'Z';
    $date = DateTimeImmutable::createFromFormat('!Ymd\THis\Z', $normalized, new DateTimeZone('UTC'));
    return $date ? ['date' => $date, 'isDateOnly' => false] : null;
}

function parse_ics_events(string $icsText): array
{
    $lines = unfold_ics_lines($icsText);
    $events = [];
    $current = null;

    foreach ($lines as $line) {
        if ($line === 'BEGIN:VEVENT') {
            $current = [];
            continue;
        }

        if ($line === 'END:VEVENT') {
            if (!empty($current['start']) && !empty($current['end'])) {
                $events[] = $current;
            }
            $current = null;
            continue;
        }

        if ($current === null) {
            continue;
        }

        $property = parse_property($line);
        if ($property === null) {
            continue;
        }

        if ($property['name'] === 'DTSTART') {
            $current['start'] = parse_ics_date($property['value'], $property['params']);
        }

        if ($property['name'] === 'DTEND') {
            $current['end'] = parse_ics_date($property['value'], $property['params']);
        }
    }

    return $events;
}

function blocked_dates_from_events(array $events, int $horizonDays): array
{
    $today = start_of_utc_day(new DateTimeImmutable('now', new DateTimeZone('UTC')));
    $horizon = add_utc_days($today, $horizonDays);
    $blocked = [];

    foreach ($events as $event) {
        if (empty($event['start']['date']) || empty($event['end']['date'])) {
            continue;
        }

        $cursor = start_of_utc_day($event['start']['date']);
        $end = start_of_utc_day($event['end']['date']);

        if ($end <= $cursor) {
            $end = add_utc_days($cursor, 1);
        }

        while ($cursor < $end) {
            if ($cursor >= $today && $cursor <= $horizon) {
                $blocked[to_iso_date($cursor)] = true;
            }
            $cursor = add_utc_days($cursor, 1);
        }
    }

    $dates = array_keys($blocked);
    sort($dates);
    return $dates;
}

function load_cached_payload(string $cacheFile, int $cacheTtl): ?array
{
    if (!file_exists($cacheFile)) {
        return null;
    }

    if ((time() - filemtime($cacheFile)) > $cacheTtl) {
        return null;
    }

    $json = file_get_contents($cacheFile);
    if ($json === false) {
        return null;
    }

    $data = json_decode($json, true);
    return is_array($data) ? $data : null;
}

function save_cached_payload(string $cacheDir, string $cacheFile, array $payload): void
{
    if (!is_dir($cacheDir)) {
        @mkdir($cacheDir, 0775, true);
    }

    @file_put_contents($cacheFile, json_encode($payload));
}

$cached = load_cached_payload($cacheFile, $cacheTtl);
if ($cached !== null) {
    respond($cached);
}

$context = stream_context_create([
    'http' => [
        'method' => 'GET',
        'timeout' => 12,
        'header' => "User-Agent: CasaMirabellaAvailabilitySync/1.0\r\n"
    ]
]);

$icsText = @file_get_contents(BOOKING_ICS_URL, false, $context);
if ($icsText === false || trim($icsText) === '') {
    if (file_exists($cacheFile)) {
        $staleJson = file_get_contents($cacheFile);
        $staleData = $staleJson ? json_decode($staleJson, true) : null;
        if (is_array($staleData)) {
            $staleData['stale'] = true;
            respond($staleData);
        }
    }

    respond([
        'ok' => false,
        'error' => 'Could not load the Booking.com iCal feed.'
    ], 502);
}

$events = parse_ics_events($icsText);
$payload = [
    'ok' => true,
    'blockedDates' => blocked_dates_from_events($events, $horizonDays),
    'lastSynced' => gmdate('c'),
    'source' => 'booking-ical-php'
];

save_cached_payload($cacheDir, $cacheFile, $payload);
respond($payload);
