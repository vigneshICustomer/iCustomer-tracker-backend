import express from 'express';
import cors from 'cors';
import axios from 'axios';
import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';
import client, { getJitsuIntegrations } from './client.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Internal event tracking (implementation hidden from client)
async function trackEvent(tenantId, eventType, data = {}) {
  try {
    const integrations = await getJitsuIntegrations();
    const integration = integrations.find(i => i.tenant_id === tenantId);
    
    if (!integration) {
      throw new Error("Configuration error: Integration not found");
    }

    // Send event to Jitsu
    await axios.post(
      `${integration.host}/api/s/${eventType}`,
      {
        ...data,
        source: "backend-icustomer",
        sentAt: new Date().toISOString(),
      }
    );
  } catch (error) {
    console.error("Error:", error.message);
    throw error;
  }
}

app.post("/api/identify", async (req, res) => {
  const { userId, previousId, traits, tenantId } = req.body;

  if (!userId || !tenantId) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // Track the identify event
    await trackEvent(tenantId, "identify", {
      event: "identify",
      userId,
      traits: {
        ...traits,
        previous_anonymous_id: previousId,
        identified_at: new Date().toISOString(),
      },
    });

    // If there was a previous anonymous ID, track the alias event
    if (previousId && previousId !== userId) {
      await trackEvent(tenantId, "alias", {
        event: "alias",
        userId,
        previousId,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Service unavailable" });
  }
});

app.post("/api/track", async (req, res) => {
  const { eventName, properties, tenantId, userId } = req.body;

  if (!eventName || !tenantId) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    await trackEvent(tenantId, "track", {
      event: eventName,
      userId: userId || "anonymous",
      properties: {
        ...properties,
        timestamp: new Date().toISOString(),
      },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Service unavailable" });
  }
});

const PORT = process.env.PORT || 3001;

// Connect to PostgreSQL and start the server
try {
  await client.connect();
  console.log('Connected to PostgreSQL');
  
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
} catch (err) {
  console.error('Connection error', err.stack);
  process.exit(1);
}
