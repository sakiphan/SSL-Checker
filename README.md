# SSL Monitor

An application that monitors the expiration dates of SSL certificates and sends notifications.

## Features

- SSL monitoring management via web interface  
- Telegram notifications  
- Email notifications  
- Automatic SSL certificate checks  
- Automatic subdomain discovery  
- JSON file-based database  
- Scheduled tasks  
- Responsive and modern UI  

## New Features

- **Subdomain Discovery:** Automatically discovers domains listed in SSL certificates  
- **Email Notifications:** Sends email alerts using SMTP settings  
- **SSL Security Grading:** Classifies the security level of SSL connections  
- **Modern UI:** Responsive and user-friendly interface  
- **Toast Notifications:** Stylish toast messages for action feedback  
- **Turkish Language Support:** UI available in Turkish  

## Installation

### Install with Docker (Recommended)

1. Clone the project:
   ```bash
   git clone https://github.com/sakiphan/ssl-mon.git
   cd ssl-mon
   ```

2. Edit the `.env` file:
   ```
   # Telegram Bot Info
   TELEGRAM_BOT_TOKEN=telegram_bot_token
   TELEGRAM_CHANNEL_ID=telegram_channel_id
   
   # Email Settings
   EMAIL_HOST=smtp.example.com
   EMAIL_PORT=587
   EMAIL_SECURE=true
   EMAIL_USER=user@example.com
   EMAIL_PASS=password
   EMAIL_FROM=sender@example.com
   EMAIL_TO=recipient@example.com
   
   # Web Server Settings
   PORT=3000
   
   # SSL Check Settings
   CHECK_INTERVAL=0 0 * * * # Every day at midnight (Cron format)
   ```

3. Start the application using Docker Compose:
   ```bash
   docker-compose up -d
   ```

4. Open your browser and go to `http://localhost:3000`.

### Manual Installation

1. Make sure Node.js v14 or higher is installed.

2. Clone the project:
   ```bash
   git clone https://github.com/sakiphan/ssl-mon.git
   cd ssl-mon
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Configure the `.env` file.

5. Start the application:
   ```bash
   npm start
   ```

## Usage

1. Open `http://localhost:3000` in your browser.  
2. Go to the "Settings" tab, enter your Telegram Bot or Email info, and click the "Test" button to verify.  
3. Add the websites you want to monitor in the "Websites" tab.  
4. SSL certificates will be checked automatically, and if there are 15 or fewer days remaining before expiration, notifications will be sent to your selected channels.

## Docker Commands

- Start the app: `docker-compose up -d`  
- Stop the app: `docker-compose down`  
- View logs: `docker-compose logs -f`  
- Restart the app: `docker-compose restart`

## Development

- Backend built with Node.js and Express.js  
- Frontend built with Vanilla JavaScript, HTML5, and CSS3  
- RESTful API  
- HTTP requests handled with Axios  
- SSL certificate analysis using OpenSSL  

## Contributing

1. Fork this repository  
2. Create a new feature branch (`git checkout -b feature/amazing-feature`)  
3. Commit your changes (`git commit -m 'Add some amazing feature'`)  
4. Push to your branch (`git push origin feature/amazing-feature`)  
5. Create a Pull Request  

