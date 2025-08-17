#!/usr/bin/env node

import axios from "axios";
import { execSync } from "child_process";
import cron from "node-cron";

// Configuration
const CONFIG = {
  // Your website URL (change this to your actual domain when deployed)
  WEBSITE_URL:"https://tipsyclub.org",

  // Secret token for authentication (hard coded)
  SECRET_TOKEN: "poker-sms-secret-2025-secure-token",

  // How often to check for new messages (every 30 seconds)
  POLL_INTERVAL: "*/30 * * * * *",

  // Enable debug logging
  DEBUG: process.env.DEBUG === "true" || false,
};

// Logging utility
function log(message, level = "INFO") {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level}] ${message}`);
}

function debug(message) {
  if (CONFIG.DEBUG) {
    log(message, "DEBUG");
  }
}

// Send SMS via macOS Messages app using AppleScript
async function sendSMSViaMessages(phoneNumber, message) {
  try {
    debug(`Attempting to send SMS to ${phoneNumber}`);

    // Escape quotes and special characters in the message
    const escapedMessage = message.replace(/"/g, '\\"').replace(/\n/g, "\\n");
    const escapedPhone = phoneNumber.replace(/"/g, '\\"');

    // AppleScript to send SMS via Messages app
    const appleScript = `
      tell application "Messages"
        set targetService to 1st account whose service type = SMS
        set targetBuddy to participant "${escapedPhone}" of targetService
        send "${escapedMessage}" to targetBuddy
      end tell
    `;

    // Execute AppleScript
    execSync(`osascript -e '${appleScript}'`, {
      stdio: "pipe",
      timeout: 10000, // 10 second timeout
    });

    log(`✅ SMS sent successfully to ${phoneNumber}`);
    return true;
  } catch (error) {
    log(`❌ Failed to send SMS to ${phoneNumber}: ${error.message}`, "ERROR");
    return false;
  }
}

// Fetch pending messages from the website
async function fetchPendingMessages() {
  try {
    debug("Fetching pending messages from website...");

    const response = await axios.get(
      `${CONFIG.WEBSITE_URL}/api/admin/sms/queue`,
      {
        headers: {
          Authorization: `Bearer ${CONFIG.SECRET_TOKEN}`,
          "Content-Type": "application/json",
        },
        timeout: 10000, // 10 second timeout
      }
    );

    const { messages, count } = response.data;
    debug(`Found ${count} pending messages`);

    return messages || [];
  } catch (error) {
    if (error.response?.status === 401) {
      log("❌ Authentication failed. Check your SMS_SECRET_TOKEN.", "ERROR");
    } else if (error.code === "ECONNREFUSED") {
      log(
        "❌ Cannot connect to website. Make sure your Next.js app is running.",
        "ERROR"
      );
    } else {
      log(`❌ Error fetching messages: ${error.message}`, "ERROR");
    }
    return [];
  }
}

// Update message status on the website
async function updateMessageStatus(messageId, status, error = null) {
  try {
    debug(`Updating message ${messageId} status to ${status}`);

    await axios.post(
      `${CONFIG.WEBSITE_URL}/api/admin/sms/queue`,
      {
        messageId,
        status,
        error,
      },
      {
        headers: {
          Authorization: `Bearer ${CONFIG.SECRET_TOKEN}`,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      }
    );

    debug(`✅ Updated message ${messageId} status to ${status}`);
  } catch (error) {
    log(
      `❌ Failed to update message ${messageId} status: ${error.message}`,
      "ERROR"
    );
  }
}

// Process a single message
async function processMessage(message) {
  const { id, phoneNumber, message: messageText } = message;

  log(`📱 Processing message ${id} to ${phoneNumber}`);

  // Send SMS via Messages app
  const success = await sendSMSViaMessages(phoneNumber, messageText);

  // Update status on website
  if (success) {
    await updateMessageStatus(id, "sent");
  } else {
    await updateMessageStatus(id, "failed", "Failed to send via Messages app");
  }
}

// Main processing function
async function processMessages() {
  try {
    const messages = await fetchPendingMessages();

    if (messages.length === 0) {
      debug("No pending messages to process");
      return;
    }

    log(`📨 Processing ${messages.length} pending message(s)`);

    // Process messages one by one to avoid overwhelming the Messages app
    for (const message of messages) {
      await processMessage(message);

      // Small delay between messages to be nice to the Messages app
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    log(`✅ Finished processing ${messages.length} message(s)`);
  } catch (error) {
    log(`❌ Error in processMessages: ${error.message}`, "ERROR");
  }
}

// Startup checks
function performStartupChecks() {
  log("🚀 Starting Poker SMS Sender...");

  // Check if we're on macOS
  if (process.platform !== "darwin") {
    log("❌ This script only works on macOS", "ERROR");
    process.exit(1);
  }

  // Check configuration
  if (
    !CONFIG.SECRET_TOKEN ||
    CONFIG.SECRET_TOKEN === "your-super-secret-key-here"
  ) {
    log("❌ Please set SMS_SECRET_TOKEN environment variable", "ERROR");
    log(
      '   Example: export SMS_SECRET_TOKEN="your-actual-secret-key"',
      "ERROR"
    );
    process.exit(1);
  }

  log(`📡 Website URL: ${CONFIG.WEBSITE_URL}`);
  log(`🔑 Secret token: ${CONFIG.SECRET_TOKEN.substring(0, 8)}...`);
  log(`⏰ Poll interval: every 30 seconds`);
  log(`🐛 Debug mode: ${CONFIG.DEBUG ? "enabled" : "disabled"}`);

  // Test Messages app accessibility
  try {
    execSync('osascript -e "tell application \\"Messages\\" to get name"', {
      stdio: "pipe",
    });
    log("✅ Messages app is accessible");
  } catch (error) {
    log("❌ Cannot access Messages app. Make sure:", "ERROR");
    log("   1. Messages app is installed and signed in", "ERROR");
    log("   2. Text Message Forwarding is enabled on your iPhone", "ERROR");
    log("   3. This script has accessibility permissions", "ERROR");
  }
}

// Graceful shutdown
function setupGracefulShutdown() {
  process.on("SIGINT", () => {
    log("👋 Received SIGINT, shutting down gracefully...");
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    log("👋 Received SIGTERM, shutting down gracefully...");
    process.exit(0);
  });
}

// Main function
function main() {
  performStartupChecks();
  setupGracefulShutdown();

  // Schedule the cron job to run every 30 seconds
  cron.schedule(CONFIG.POLL_INTERVAL, () => {
    processMessages();
  });

  log("✅ SMS sender is running. Press Ctrl+C to stop.");
  log("📱 Waiting for messages to send...");

  // Run once immediately
  processMessages();
}

// Start the application
main();
