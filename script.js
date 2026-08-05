// ===== ELECTROGENIE - PHASE 3 UPGRADED =====
// Realistic Circuit Diagram with drawn components!

const API_KEY = "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"; // Replace with your Groq API key

function setQuery(text) {
  document.getElementById("projectInput").value = text;
}

async function generateProject() {
  const input = document.getElementById("projectInput").value.trim();
  if (input === "") { alert("Please enter a project name first!"); return; }

  const resultSection  = document.getElementById("resultSection");
  const resultTitle    = document.getElementById("resultTitle");
  const resultInfo     = document.getElementById("resultInfo");
  const resultCode     = document.getElementById("resultCode");
  const circuitSection = document.getElementById("circuitSection");

  resultSection.style.display = "block";
  circuitSection.style.display = "none";
  resultTitle.textContent = "Generating: " + input + " ...";
  resultInfo.innerHTML = "<i>Please wait, AI is generating your project...</i>";
  resultCode.textContent = "// Loading...";
  resultSection.scrollIntoView({ behavior: "smooth" });

  const prompt = `You are ElectroGenie, an expert electronics project assistant.
The user wants to build this project: "${input}"

Please provide the following in this EXACT format:

MICROCONTROLLER: [best microcontroller - Arduino Uno / Arduino Nano / ESP32 / Raspberry Pi]

COMPONENTS: [list all required components with quantities, separated by commas]

CONNECTIONS: [explain step by step how to connect all components with exact pin numbers]

EXPLANATION: [explain in 2-3 simple sentences how this project works]

PINLIST:
[List each component and its pin connection in this exact format, one per line:
ComponentName|PinOnComponent|PinOnMicrocontroller|ComponentType
ComponentType must be one of: LED, RESISTOR, SENSOR, RELAY, MOTOR, DISPLAY, BUTTON, BUZZER, OTHER
Example:
DHT11 Sensor|VCC|5V|SENSOR
DHT11 Sensor|GND|GND|SENSOR
DHT11 Sensor|DATA|Pin 2|SENSOR
Red LED|Anode|Pin 13|LED
Red LED|Cathode|GND|LED
Resistor 220ohm|Pin1|Pin 13|RESISTOR
Resistor 220ohm|Pin2|GND|RESISTOR]

CODE:
[Write complete working Arduino C++ code with comments on every line]

Keep everything simple so a first year IT student can understand easily.`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${API_KEY}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 2000,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const e = await response.json();
      throw new Error("API Error: " + (e.error?.message || response.status));
    }

    const data   = await response.json();
    const aiText = data.choices[0].message.content;
    if (!aiText) throw new Error("Empty response from Groq API");

    const microcontroller = extractSection(aiText, "MICROCONTROLLER:");
    const components      = extractSection(aiText, "COMPONENTS:");
    const connections     = extractSection(aiText, "CONNECTIONS:");
    const explanation     = extractSection(aiText, "EXPLANATION:");
    const pinList         = extractPinList(aiText);
    const code            = extractCode(aiText);

    resultTitle.textContent = "Project: " + input;
    resultInfo.innerHTML = `
      <b>Microcontroller:</b> ${microcontroller}<br><br>
      <b>Components needed:</b> ${components}<br><br>
      <b>Connections:</b> ${connections}<br><br>
      <b>How it works:</b> ${explanation}
    `;
    resultCode.textContent = code;

    if (pinList.length > 0) {
      circuitSection.style.display = "block";
      drawRealisticCircuit(pinList, microcontroller);
      buildComponentList(pinList);
      circuitSection.scrollIntoView({ behavior: "smooth" });
    }

  } catch (error) {
    resultTitle.textContent = "Error!";
    resultInfo.innerHTML = `<b>Something went wrong.</b><br><br><b>Error:</b> ${error.message}<br><br><b>Please check:</b><br>1. Your API key is correct<br>2. Key starts with "gsk_..."<br>3. Internet connection is working`;
    resultCode.textContent = "// Fix the error above and try again";
    console.error(error);
  }
}

// ===================================================
// REALISTIC CIRCUIT DRAWING ENGINE
// ===================================================
function drawRealisticCircuit(pinList, microcontroller) {
  const canvas = document.getElementById("circuitCanvas");
  const ctx    = canvas.getContext("2d");

  const components = [...new Set(pinList.map(p => p.component))];
  const W = 700;
  const H = Math.max(420, components.length * 110 + 120);
  canvas.width  = W;
  canvas.height = H;
  ctx.clearRect(0, 0, W, H);

  // Background grid (like Tinkercad)
  drawGrid(ctx, W, H);

  // Draw breadboard
  drawBreadboard(ctx, 180, 60, 320, H - 120);

  // Draw microcontroller
  const mcY = H / 2 - 90;
  drawArduino(ctx, 10, mcY, microcontroller);

  // Draw each component and wires
  const startY  = 90;
  const spacing = (H - 180) / Math.max(components.length, 1);

  components.forEach((comp, i) => {
    const cy   = startY + i * spacing;
    const type = pinList.find(p => p.component === comp)?.type || "OTHER";
    const cx   = 560;

    drawComponent(ctx, cx, cy, comp, type);

    // Draw wires from Arduino to breadboard to component
    const compPins = pinList.filter(p => p.component === comp);
    compPins.forEach((pin, pi) => {
      const wireColor = getWireColor(pin.mcPin, pin.compPin);
      const fromX = 155;
      const fromY = mcY + 40 + pi * 18;
      const toX   = cx - 5;
      const toY   = cy + 20 + pi * 14;
      drawWire(ctx, fromX, fromY, toX, toY, wireColor);
    });
  });

  // Legend
  drawLegend(ctx, W, H);
}

// ===== DRAW BACKGROUND GRID =====
function drawGrid(ctx, W, H) {
  ctx.strokeStyle = "rgba(100,149,237,0.1)";
  ctx.lineWidth   = 0.5;
  for (let x = 0; x < W; x += 20) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 0; y < H; y += 20) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
}

// ===== DRAW BREADBOARD =====
function drawBreadboard(ctx, x, y, w, h) {
  // Main body
  ctx.fillStyle = "#e8e0c8";
  roundRectFill(ctx, x, y, w, h, 8);

  // Border
  ctx.strokeStyle = "#bbb";
  ctx.lineWidth = 1.5;
  roundRectStroke(ctx, x, y, w, h, 8);

  // Center divider
  ctx.fillStyle = "#d4c9a8";
  ctx.fillRect(x + 10, y + h / 2 - 6, w - 20, 12);

  // Dots (holes)
  ctx.fillStyle = "#8a7a5a";
  const cols = 20;
  const rows = 10;
  const dotSpX = (w - 30) / cols;
  const dotSpY = (h / 2 - 30) / rows;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      // Top half
      ctx.beginPath();
      ctx.arc(x + 15 + col * dotSpX, y + 15 + row * dotSpY, 2, 0, Math.PI * 2);
      ctx.fill();
      // Bottom half
      ctx.beginPath();
      ctx.arc(x + 15 + col * dotSpX, y + h / 2 + 20 + row * dotSpY, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Power rail labels
  ctx.fillStyle = "#dc2626";
  ctx.font      = "bold 9px monospace";
  ctx.fillText("+", x + 3, y + 18);
  ctx.fillStyle = "#1a1a2e";
  ctx.fillText("−", x + 3, y + 30);
  ctx.fillStyle = "#dc2626";
  ctx.fillText("+", x + 3, y + h - 20);
  ctx.fillStyle = "#1a1a2e";
  ctx.fillText("−", x + 3, y + h - 8);
}

// ===== DRAW ARDUINO BOARD =====
function drawArduino(ctx, x, y, label) {
  const w = 155;
  const h = 190;

  // PCB body
  ctx.fillStyle = "#1a6b3a";
  roundRectFill(ctx, x, y, w, h, 8);

  // PCB border
  ctx.strokeStyle = "#145c30";
  ctx.lineWidth = 1.5;
  roundRectStroke(ctx, x, y, w, h, 8);

  // USB connector
  ctx.fillStyle = "#888";
  ctx.fillRect(x + w - 22, y + 12, 22, 30);
  ctx.fillStyle = "#555";
  ctx.fillRect(x + w - 20, y + 16, 18, 22);

  // Power jack
  ctx.fillStyle = "#444";
  ctx.beginPath();
  ctx.arc(x + 14, y + 14, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#222";
  ctx.beginPath();
  ctx.arc(x + 14, y + 14, 5, 0, Math.PI * 2);
  ctx.fill();

  // Reset button
  ctx.fillStyle = "#e53e3e";
  roundRectFill(ctx, x + 30, y + 10, 16, 10, 2);

  // IC chip
  ctx.fillStyle = "#1a1a2e";
  roundRectFill(ctx, x + 40, y + 70, 55, 50, 4);
  ctx.strokeStyle = "#555";
  ctx.lineWidth = 0.5;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(x + 48 + i * 11, y + 70);
    ctx.lineTo(x + 48 + i * 11, y + 75);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 48 + i * 11, y + 120);
    ctx.lineTo(x + 48 + i * 11, y + 115);
    ctx.stroke();
  }

  // Pin headers (right side - digital pins)
  ctx.fillStyle = "#f0c040";
  for (let i = 0; i < 10; i++) {
    ctx.fillRect(x + w - 6, y + 30 + i * 14, 8, 8);
    // Pin label
    ctx.fillStyle = "#ccc";
    ctx.font = "7px monospace";
    ctx.fillText("D" + i, x + w - 24, y + 37 + i * 14);
    ctx.fillStyle = "#f0c040";
  }

  // Pin headers (left side - analog/power)
  ctx.fillStyle = "#f0c040";
  for (let i = 0; i < 6; i++) {
    ctx.fillRect(x - 2, y + 50 + i * 14, 8, 8);
    ctx.fillStyle = "#ccc";
    ctx.font = "7px monospace";
    const pinNames = ["5V", "GND", "A0", "A1", "A2", "A3"];
    ctx.fillText(pinNames[i], x + 8, y + 57 + i * 14);
    ctx.fillStyle = "#f0c040";
  }

  // Board label
  ctx.fillStyle = "white";
  ctx.font = "bold 11px monospace";
  ctx.textAlign = "center";
  const name = (label || "Arduino Uno").replace("Arduino ", "");
  ctx.fillText("Arduino", x + w / 2, y + h - 28);
  ctx.fillText(name, x + w / 2, y + h - 14);
  ctx.textAlign = "left";

  // LEDs on board (TX, RX, PWR)
  const leds = [
    { x: x + 25, y: y + 35, color: "#22c55e" },  // PWR
    { x: x + 36, y: y + 35, color: "#f59e0b" },  // TX
    { x: x + 47, y: y + 35, color: "#f59e0b" }   // RX
  ];
  leds.forEach(led => {
    ctx.fillStyle = led.color;
    ctx.beginPath();
    ctx.arc(led.x, led.y, 3.5, 0, Math.PI * 2);
    ctx.fill();
  });
}

// ===== DRAW COMPONENT BY TYPE =====
function drawComponent(ctx, x, y, name, type) {
  switch (type) {
    case "LED":      drawLED(ctx, x, y, name); break;
    case "RESISTOR": drawResistor(ctx, x, y, name); break;
    case "SENSOR":   drawSensor(ctx, x, y, name); break;
    case "RELAY":    drawRelay(ctx, x, y, name); break;
    case "BUTTON":   drawButton(ctx, x, y, name); break;
    case "BUZZER":   drawBuzzer(ctx, x, y, name); break;
    case "DISPLAY":  drawDisplay(ctx, x, y, name); break;
    default:         drawGeneric(ctx, x, y, name); break;
  }
}

// ===== DRAW LED =====
function drawLED(ctx, x, y, name) {
  const color = name.toLowerCase().includes("red") ? "#ef4444"
    : name.toLowerCase().includes("green") ? "#22c55e"
    : name.toLowerCase().includes("blue") ? "#3b82f6"
    : name.toLowerCase().includes("yellow") ? "#f59e0b"
    : "#a78bfa";

  // Legs
  ctx.strokeStyle = "#888";
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x + 10, y + 45); ctx.lineTo(x + 10, y + 65); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 20, y + 45); ctx.lineTo(x + 20, y + 65); ctx.stroke();

  // LED body
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x + 15, y + 30, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#555";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Glow effect
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.beginPath();
  ctx.arc(x + 10, y + 24, 5, 0, Math.PI * 2);
  ctx.fill();

  // Flat edge (cathode marker)
  ctx.strokeStyle = "#555";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 20, y + 15);
  ctx.lineTo(x + 30, y + 15);
  ctx.stroke();

  // Label
  ctx.fillStyle = "#1a1a2e";
  ctx.font = "bold 9px Segoe UI";
  ctx.textAlign = "center";
  ctx.fillText(name.length > 8 ? name.substring(0, 8) : name, x + 15, y + 78);
  ctx.textAlign = "left";
}

// ===== DRAW RESISTOR =====
function drawResistor(ctx, x, y, name) {
  // Leads
  ctx.strokeStyle = "#888";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x, y + 25); ctx.lineTo(x + 15, y + 25); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 55, y + 25); ctx.lineTo(x + 70, y + 25); ctx.stroke();

  // Body
  ctx.fillStyle = "#d4a843";
  roundRectFill(ctx, x + 15, y + 15, 40, 20, 4);
  ctx.strokeStyle = "#b8922a";
  ctx.lineWidth = 1;
  roundRectStroke(ctx, x + 15, y + 15, 40, 20, 4);

  // Color bands (brown, black, brown, gold = 10 ohm example)
  const bands = ["#8B4513", "#1a1a2e", "#f59e0b", "#ffd700"];
  bands.forEach((color, i) => {
    ctx.fillStyle = color;
    ctx.fillRect(x + 20 + i * 8, y + 15, 4, 20);
  });

  // Label
  ctx.fillStyle = "#1a1a2e";
  ctx.font = "bold 9px Segoe UI";
  ctx.textAlign = "center";
  ctx.fillText("Resistor", x + 35, y + 48);
  ctx.textAlign = "left";
}

// ===== DRAW SENSOR =====
function drawSensor(ctx, x, y, name) {
  // Body
  ctx.fillStyle = "#1a1a2e";
  roundRectFill(ctx, x, y, 70, 50, 6);
  ctx.strokeStyle = "#555";
  ctx.lineWidth = 1;
  roundRectStroke(ctx, x, y, 70, 50, 6);

  // Pin legs
  ctx.strokeStyle = "#888";
  ctx.lineWidth   = 1.5;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(x + 12 + i * 20, y + 50);
    ctx.lineTo(x + 12 + i * 20, y + 68);
    ctx.stroke();
  }

  // Circle (sensor element)
  ctx.fillStyle = "#374151";
  ctx.beginPath();
  ctx.arc(x + 35, y + 22, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#6b7280";
  ctx.beginPath();
  ctx.arc(x + 35, y + 22, 8, 0, Math.PI * 2);
  ctx.fill();

  // Label
  ctx.fillStyle = "white";
  ctx.font = "bold 8px Segoe UI";
  ctx.textAlign = "center";
  const shortName = name.length > 10 ? name.substring(0, 10) : name;
  ctx.fillText(shortName, x + 35, y + 80);
  ctx.textAlign = "left";
}

// ===== DRAW RELAY =====
function drawRelay(ctx, x, y, name) {
  ctx.fillStyle = "#1e3a5f";
  roundRectFill(ctx, x, y, 70, 55, 5);
  ctx.strokeStyle = "#2d5a8e";
  ctx.lineWidth = 1.5;
  roundRectStroke(ctx, x, y, 70, 55, 5);

  // Coil symbol
  ctx.strokeStyle = "#60a5fa";
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.arc(x + 20 + i * 7, y + 22, 5, Math.PI, 0);
    ctx.stroke();
  }

  // Switch symbol
  ctx.strokeStyle = "#f59e0b";
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x + 15, y + 38); ctx.lineTo(x + 30, y + 38); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 28, y + 30); ctx.lineTo(x + 45, y + 38); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 45, y + 38); ctx.lineTo(x + 58, y + 38); ctx.stroke();

  // Pins
  ctx.strokeStyle = "#888";
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(x + 10 + i * 25, y + 55);
    ctx.lineTo(x + 10 + i * 25, y + 70);
    ctx.stroke();
  }

  ctx.fillStyle = "white";
  ctx.font = "bold 9px Segoe UI";
  ctx.textAlign = "center";
  ctx.fillText("Relay", x + 35, y + 83);
  ctx.textAlign = "left";
}

// ===== DRAW BUTTON =====
function drawButton(ctx, x, y, name) {
  // Body
  ctx.fillStyle = "#374151";
  roundRectFill(ctx, x + 5, y + 5, 40, 40, 4);

  // Button cap
  ctx.fillStyle = "#ef4444";
  ctx.beginPath();
  ctx.arc(x + 25, y + 25, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#dc2626";
  ctx.beginPath();
  ctx.arc(x + 25, y + 25, 8, 0, Math.PI * 2);
  ctx.fill();

  // Pins
  ctx.fillStyle = "#888";
  ctx.fillRect(x + 8, y + 45, 4, 12);
  ctx.fillRect(x + 38, y + 45, 4, 12);
  ctx.fillRect(x + 8, y - 5, 4, 12);
  ctx.fillRect(x + 38, y - 5, 4, 12);

  ctx.fillStyle = "#1a1a2e";
  ctx.font = "bold 9px Segoe UI";
  ctx.textAlign = "center";
  ctx.fillText("Button", x + 25, y + 68);
  ctx.textAlign = "left";
}

// ===== DRAW BUZZER =====
function drawBuzzer(ctx, x, y, name) {
  // Base
  ctx.fillStyle = "#1a1a2e";
  ctx.beginPath();
  ctx.ellipse(x + 25, y + 30, 25, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body dome
  ctx.fillStyle = "#374151";
  ctx.beginPath();
  ctx.arc(x + 25, y + 20, 22, Math.PI, 0);
  ctx.closePath();
  ctx.fill();

  // Sound waves
  ctx.strokeStyle = "#60a5fa";
  ctx.lineWidth = 1.5;
  for (let i = 1; i <= 3; i++) {
    ctx.beginPath();
    ctx.arc(x + 25, y + 10, 8 + i * 5, -Math.PI * 0.4, Math.PI * 1.4);
    ctx.stroke();
  }

  // Pins
  ctx.strokeStyle = "#888";
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x + 15, y + 40); ctx.lineTo(x + 15, y + 58); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 35, y + 40); ctx.lineTo(x + 35, y + 58); ctx.stroke();

  ctx.fillStyle = "#1a1a2e";
  ctx.font = "bold 9px Segoe UI";
  ctx.textAlign = "center";
  ctx.fillText("Buzzer", x + 25, y + 70);
  ctx.textAlign = "left";
}

// ===== DRAW LCD DISPLAY =====
function drawDisplay(ctx, x, y, name) {
  // PCB
  ctx.fillStyle = "#166534";
  roundRectFill(ctx, x, y, 80, 45, 4);

  // Screen
  ctx.fillStyle = "#bef264";
  roundRectFill(ctx, x + 6, y + 6, 68, 30, 2);

  // Screen lines
  ctx.strokeStyle = "#84cc16";
  ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(x + 6, y + 18); ctx.lineTo(x + 74, y + 18); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 6, y + 25); ctx.lineTo(x + 74, y + 25); ctx.stroke();

  // Fake text on LCD
  ctx.fillStyle = "#365314";
  ctx.font = "6px monospace";
  ctx.fillText("ElectroGenie", x + 10, y + 16);
  ctx.fillText("Project Ready!", x + 10, y + 24);

  // Pin headers
  ctx.fillStyle = "#f0c040";
  for (let i = 0; i < 8; i++) {
    ctx.fillRect(x + 4 + i * 9, y + 43, 6, 10);
  }

  ctx.fillStyle = "#1a1a2e";
  ctx.font = "bold 9px Segoe UI";
  ctx.textAlign = "center";
  ctx.fillText("LCD Display", x + 40, y + 64);
  ctx.textAlign = "left";
}

// ===== DRAW GENERIC COMPONENT =====
function drawGeneric(ctx, x, y, name) {
  ctx.fillStyle = "#4f46e5";
  roundRectFill(ctx, x, y, 70, 50, 6);
  ctx.strokeStyle = "#4338ca";
  ctx.lineWidth = 1;
  roundRectStroke(ctx, x, y, 70, 50, 6);

  // Pins
  ctx.strokeStyle = "#888";
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(x + 12 + i * 22, y + 50);
    ctx.lineTo(x + 12 + i * 22, y + 65);
    ctx.stroke();
  }

  ctx.fillStyle = "white";
  ctx.font = "bold 9px Segoe UI";
  ctx.textAlign = "center";
  const shortName = name.length > 10 ? name.substring(0, 9) + "." : name;
  ctx.fillText(shortName, x + 35, y + 28);
  ctx.textAlign = "left";
}

// ===== DRAW WIRE (with routing) =====
function drawWire(ctx, x1, y1, x2, y2, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth   = 2;
  ctx.setLineDash([]);
  ctx.lineCap = "round";

  const midX = (x1 + x2) / 2;

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.bezierCurveTo(midX, y1, midX, y2, x2, y2);
  ctx.stroke();

  // Small dot at connection points
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x1, y1, 3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x2, y2, 3, 0, Math.PI * 2); ctx.fill();
}

// ===== GET WIRE COLOR =====
function getWireColor(mcPin, compPin) {
  if (mcPin === "GND" || compPin === "GND")        return "#1a1a2e";
  if (mcPin === "5V" || mcPin === "3.3V" || compPin === "VCC") return "#dc2626";
  if (mcPin.includes("A"))                          return "#f59e0b";
  return "#3b82f6";
}

// ===== DRAW LEGEND =====
function drawLegend(ctx, W, H) {
  const lx = 10;
  const ly = H - 22;
  ctx.font = "10px Segoe UI";
  ctx.textAlign = "left";

  const items = [
    { color: "#dc2626", label: "Power (VCC/5V)" },
    { color: "#1a1a2e", label: "Ground (GND)" },
    { color: "#3b82f6", label: "Signal/Data" },
    { color: "#f59e0b", label: "Analog" }
  ];

  items.forEach((item, i) => {
    const ix = lx + i * 150;
    ctx.strokeStyle = item.color;
    ctx.lineWidth   = 2;
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(ix, ly); ctx.lineTo(ix + 20, ly); ctx.stroke();
    ctx.fillStyle = "#555";
    ctx.fillText(item.label, ix + 25, ly + 4);
  });
}

// ===== BUILD COMPONENT PIN TABLE =====
function buildComponentList(pinList) {
  const container = document.getElementById("componentList");
  container.innerHTML = "";
  pinList.forEach(pin => {
    const div = document.createElement("div");
    div.className = "component-item";
    div.innerHTML = `
      <div class="comp-name">${pin.component}</div>
      <div class="comp-pin">${pin.compPin} → ${pin.mcPin}</div>
    `;
    container.appendChild(div);
  });
}

// ===== HELPERS =====
function roundRectFill(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
}

function roundRectStroke(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.stroke();
}

function extractPinList(text) {
  const pins = [];
  const pinStart = text.indexOf("PINLIST:");
  const codeStart = text.indexOf("CODE:");
  if (pinStart === -1) return pins;
  const end = codeStart !== -1 ? codeStart : text.length;
  const pinSection = text.substring(pinStart + 8, end);
  for (let line of pinSection.split("\n")) {
    line = line.trim();
    if (line.includes("|")) {
      const parts = line.split("|");
      if (parts.length >= 3) {
        pins.push({
          component: parts[0].trim(),
          compPin:   parts[1].trim(),
          mcPin:     parts[2].trim(),
          type:      (parts[3] || "OTHER").trim()
        });
      }
    }
  }
  return pins;
}

function extractSection(text, sectionName) {
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(sectionName)) {
      let content = lines[i].replace(sectionName, "").trim();
      if (!content && lines[i + 1]) content = lines[i + 1].trim();
      return content || "See full response";
    }
  }
  return "Not specified";
}

function extractCode(text) {
  const codeStart = text.indexOf("CODE:");
  if (codeStart !== -1) {
    let code = text.substring(codeStart + 5).trim();
    code = code.replace(/```cpp/g, "").replace(/```arduino/g, "").replace(/```python/g, "").replace(/```/g, "").trim();
    return code;
  }
  return "// Code not found in response";
}

document.addEventListener("DOMContentLoaded", function () {
  document.getElementById("projectInput").addEventListener("keypress", function (e) {
    if (e.key === "Enter") generateProject();
  });
});
