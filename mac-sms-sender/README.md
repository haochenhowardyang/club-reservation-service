# Poker SMS Sender for Mac

This script allows you to send SMS messages from your Mac using your iPhone's phone number via the Messages app. It polls your poker website for pending SMS messages and automatically sends them through your personal phone number.

## Prerequisites

### 1. Hardware Requirements
- **Mac computer** (macOS only)
- **iPhone** with active cellular service
- Both devices signed in to the same Apple ID

### 2. iPhone Setup
1. Open **Settings** on your iPhone
2. Go to **Messages**
3. Tap **Text Message Forwarding**
4. Enable your Mac in the list
5. Enter the verification code shown on your Mac

### 3. Mac Setup
1. Open **Messages** app on your Mac
2. Sign in with the same Apple ID as your iPhone
3. Verify you can send/receive SMS messages

## Installation

### 1. Navigate to the SMS sender directory
```bash
cd mac-sms-sender
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up environment variables
Create a `.env` file in the `mac-sms-sender` directory:

```bash
# Copy the example and edit it
cp .env.example .env
```

Edit `.env` with your settings:
```env
# Secret token (must match SMS_SECRET_TOKEN in your website's .env.local)
SMS_SECRET_TOKEN=your-super-secret-key-here

# Your website URL (change when deployed)
WEBSITE_URL=http://localhost:3000

# Enable debug logging (optional)
DEBUG=false
```

### 4. Update your website's environment variables
Add to your website's `.env.local`:
```env
# SMS Secret Token (must match the Mac script)
SMS_SECRET_TOKEN=your-super-secret-key-here
```

## Usage

### 1. Start your Next.js website
```bash
# In your main project directory
npm run dev
```

### 2. Start the SMS sender script
```bash
# In the mac-sms-sender directory
npm start
```

You should see output like:
```
[2025-07-31T14:08:57.123Z] [INFO] 🚀 Starting Poker SMS Sender...
[2025-07-31T14:08:57.124Z] [INFO] 📡 Website URL: http://localhost:3000
[2025-07-31T14:08:57.125Z] [INFO] 🔑 Secret token: your-sup...
[2025-07-31T14:08:57.126Z] [INFO] ⏰ Poll interval: every 30 seconds
[2025-07-31T14:08:57.127Z] [INFO] ✅ Messages app is accessible
[2025-07-31T14:08:57.128Z] [INFO] ✅ SMS sender is running. Press Ctrl+C to stop.
[2025-07-31T14:08:57.129Z] [INFO] 📱 Waiting for messages to send...
```

### 3. Test the system
1. Go to your poker admin interface
2. Click "Send SMS" for a player on the waitlist
3. Watch the Mac script logs - you should see it process and send the message
4. The recipient should receive an SMS from your iPhone number

## How It Works

1. **Admin clicks "Send SMS"** in the web interface
2. **Website adds message** to the `sms_queue` database table
3. **Mac script polls** the website every 30 seconds for pending messages
4. **Script sends SMS** via Messages app using AppleScript
5. **Script updates status** back to the website (sent/failed)
6. **User receives SMS** from your personal iPhone number

## Troubleshooting

### "Cannot access Messages app"
- Make sure Messages app is open and signed in
- Enable Text Message Forwarding on iPhone
- Grant accessibility permissions to Terminal/Script Editor

### "Authentication failed"
- Check that `SMS_SECRET_TOKEN` matches in both `.env` files
- Make sure the token doesn't contain spaces or special characters

### "Cannot connect to website"
- Verify your Next.js app is running on the correct port
- Check the `WEBSITE_URL` in your `.env` file
- Make sure the `/api/admin/sms/queue` endpoint is accessible

### Messages not sending
- Verify iPhone is nearby and connected
- Check that you can manually send SMS from Messages app
- Look for error messages in the script output

## Running as a Background Service

To run the script automatically when you log in:

### 1. Create a launch agent
```bash
# Create the launch agents directory if it doesn't exist
mkdir -p ~/Library/LaunchAgents

# Create the plist file
cat > ~/Library/LaunchAgents/com.poker.sms-sender.plist << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.poker.sms-sender</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>/path/to/your/mac-sms-sender/sender.js</string>
    </array>
    <key>WorkingDirectory</key>
    <string>/path/to/your/mac-sms-sender</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/poker-sms-sender.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/poker-sms-sender.error.log</string>
</dict>
</plist>
EOF
```

### 2. Load the service
```bash
launchctl load ~/Library/LaunchAgents/com.poker.sms-sender.plist
```

### 3. Check logs
```bash
tail -f /tmp/poker-sms-sender.log
```

## Security Notes

- The secret token authenticates your Mac script with your website
- Keep the token secure and don't share it
- Only your Mac can send messages through this system
- Messages appear to come from your personal iPhone number

## Support

If you encounter issues:
1. Check the script logs for error messages
2. Verify all prerequisites are met
3. Test manual SMS sending from Messages app
4. Ensure your website is running and accessible
