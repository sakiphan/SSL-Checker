# SSL Monitor

An application that monitors SSL certificate expiration dates and sends notifications via Telegram.

## Features

- SSL monitoring management through web interface
- Telegram notifications
- Automatic checking of SSL certificate expiration dates
- JSON file-based database
- Scheduled tasks

## Installation

### Docker Installation (Recommended)

1. Clone the project:
   ```bash
   git clone https://github.com/yourusername/ssl-mon.git
   cd ssl-mon
   ```

2. Edit the `.env` file:
   ```
   # Telegram Bot Information
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token
   TELEGRAM_CHANNEL_ID=your_telegram_channel_id
   
   # Web Server Settings
   PORT=3000
   
   # SSL Check Settings
   CHECK_INTERVAL=0 0 * * * # Every day at midnight (Cron format)
   ```

3. Start the application with Docker Compose:
   ```bash
   docker-compose up -d
   ```

4. Access the application from your browser at `http://localhost:3000`.

### Manual Installation

1. Make sure Node.js 14 or higher is installed.

2. Clone the project:
   ```bash
   git clone https://github.com/yourusername/ssl-mon.git
   cd ssl-mon
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Edit the `.env` file.

5. Start the application:
   ```bash
   npm start
   ```

## Usage

1. Go to `http://localhost:3000` in your browser.
2. Enter your Telegram Bot information in the "Settings" tab and verify by clicking the "Test" button.
3. Add websites you want to monitor in the "Websites" tab.
4. SSL certificates will be automatically checked, and notifications will be sent to your Telegram channel when there are 15 days or less until expiration.

## Docker Commands

- Start the application: `docker-compose up -d`
- Stop the application: `docker-compose down`
- View logs: `docker-compose logs -f`
- Restart: `docker-compose restart`

## License

ISC 