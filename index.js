"use strict";

require('dotenv').config();
const WebSocket = require("ws");
let token = process.env.TOKEN;
const MAX_RECONNECT_ATTEMPTS = 10;

let presencePayload = {
  op: 3, // Set presence
  d: {
    activities: [
      {
        type: 2,
        timestamps: {
          start: Date.now(),
          end: Date.now() + 260000,
        },
        sync_id: "4cOdK2wGLETKBW3PvgPWqT", // the song link
        state: "PRODUCCIONES NIKA",
        // "session_id": "140ecdfb976bdbf29d4452d492e551b8",
        party: {
          id: "spotify:84490510588792572", // this somehow is important
        },
        // 3kdlVcMVsSkbsUy8eQcBjI
        name: "Spotify",
        id: "spotify:1",
        flags: 48,
        details: "BAD APPLE",
        created_at: Date.now(),
        assets: {
          // large_text: "mi ksa sadjajajaka",
          large_image: "mp:external/QSQcKP9phmj4lRTOiYZiYzlvd0g9n-0rbQ2s1lPV7s0/https/s2.gifyu.com/images/mini_giffo.gif",//"spotify:ab67706c0000da8470779f6d63d8ca044b939c1a",
          // small_image: "spotify:ab67706c0000da8470779f6d63d8ca044b939c1a",
        },
        url: "https://twitter.com/___manzanitaSol",
      },
      //dv47wu6wQhauqkhsG8SK4Zr7KMyK4QNfRYpcokdMIOI Image hash


    ],
    status: "idle",
    since: null,
    afk: false,
  },
};

const identifyPayload = {
  op: 2, // Identify
  d: {
    token: token,
    intents: 0,
    properties: {
      os: "linux",
      browser: "myApp",
      device: "myApp",
    },
  },
};

function connect() {
  const ws = new WebSocket("wss://gateway.discord.gg/?v=10&encoding=json");
  let reconnectAttempts = 0;
  let sessionID = null;
  let presenceInterval;

  ws.on("open", function open() {
    console.log("Connected to Discord Gateway");
    ws.send(JSON.stringify(identifyPayload));
  });

  ws.on("message", function incoming(data) {
    const payload = JSON.parse(data);
    // sessionID = payload.d.session_id;
    // console.log(payload);
    if (payload.op === 10) { // hello snippet // connection stablished 
      console.log("Hello payload received, start heartbeat");

      const interval = payload.d.heartbeat_interval;
      setInterval(() => {
        ws.send(JSON.stringify({ op: 1, d: null }));
      }, interval);

      // Set presence
      ws.send(JSON.stringify(presencePayload));
      // Clear the presence interval before setting a new one
      clearInterval(presenceInterval);
      presenceInterval = setInterval(() => {
        presencePayload.d.activities[0].created_at = Date.now();
        presencePayload.d.activities[0].timestamps.start = Date.now();
        presencePayload.d.activities[0].timestamps.end = Date.now() + 260000;
        console.log("presence sent");
        ws.send(JSON.stringify(presencePayload));
      }, 260000);
      
    }

    if (payload.op === 11) {
      // Heartbeat ACK
      console.log("Heartbeat ACK received");
    }

    if (payload.op === 0) {
      // Dispatch
      if (payload.t === "READY") {
        console.log("Received READY event");
        sessionID = payload.d.session_id;
        console.log(sessionID)
      }
      // handle other events
    }

    if (payload.op === 7) {
      // Reconnect
      console.log("Received reconnect request");
      ws.close();
    }
    
    if (payload.op === 9) {
      // Invalid session
      console.log("Received invalid session, attempting to resume");
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        const resumePayload = {
          op: 6,
          d: {
            token: token,
            session_id: sessionID,
            seq: null,
          },
        };
        ws.send(JSON.stringify(resumePayload));
        reconnectAttempts++;
      } else {
        console.log(`Failed to resume after ${MAX_RECONNECT_ATTEMPTS} attempts, starting a new session`);
        ws.close();
      }
    }

  });


  ws.on("close", function close(event) {
    console.log(`Disconnected from Discord Gateway with code ${event.code}`);
    
    clearInterval(presenceInterval);
  
    if (event.code === 4004 || event.code === 4010) {
      console.log("Invalid token or shard, stop attempting to reconnect");
      return;
    }
  
    const reconnectCodes = [4000, 4001, 4002, 4003, 4005, 4007, 4008, 4009, 4011, 4012, 4013, 4014];
  
    if (reconnectCodes.includes(event.code)) {
      console.log(`Connection closed with error code ${event.code}, attempting to reconnect in 5 seconds`);
      setTimeout(() => {
        connect();
      }, 5000);
    } else {
      console.log(`Connection closed with unknown error code ${event.code}, stop attempting to reconnect`);
    }
  });

  ws.on("error", function error(err) {
    console.error(err);
    ws.close();
  });
}

connect();