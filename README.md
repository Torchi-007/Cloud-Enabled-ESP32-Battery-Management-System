# Cloud-Enabled-ESP32-Battery-Management-System

A real-time battery management dashboard for an ESP32 device. The dashboard reads battery telemetry from Firebase Realtime Database and displays state of charge, cell voltage, temperature, battery health, charger status, and alerts.

## Configuration

This is a static browser application, so Firebase configuration is loaded from the local `firebase-config.js` file before `script.js` runs.

1. Copy `.env.example` to `.env`.
2. Set `FIREBASE_API_KEY` and `FIREBASE_DATABASE_URL` in `.env`.
3. Create `firebase-config.js` in the project root with the values from `.env`:

```js
window.__FIREBASE_CONFIG__ = {
	apiKey: "your-firebase-web-api-key",
	databaseURL: "https://your-project-default-rtdb.region.firebasedatabase.app"
};
```

Both `.env` and `firebase-config.js` are ignored by Git. Do not commit either file or place private service-account credentials in this frontend project. Firebase web API keys are browser-visible identifiers; protect the database with Firebase Realtime Database rules and restrict the key in Google Cloud where appropriate.

## Expected Database Data

The dashboard listens to the `bms` path. A record can contain:

```json
{
	"soc": 82.5,
	"voltage": 3.91,
	"temperature": 28.4,
	"soh": 96.0,
	"state": "Charging"
}
```

The accepted `state` values are `Charging`, `Discharging`, and `Idle`. The temperature field may also be named `temp`.

## Run Locally

Serve the project from a local web server. Opening `index.html` directly may prevent ES modules or Firebase requests from working in the browser.

For example, with VS Code Live Server, open `index.html` and choose **Open with Live Server**. The configured development port is `5501`.

## Project Files

- `index.html` - dashboard markup and Firebase runtime configuration loader
- `script.js` - Firebase listener and dashboard update logic
- `style.css` - dashboard layout and visual styling
- `.env.example` - safe configuration template