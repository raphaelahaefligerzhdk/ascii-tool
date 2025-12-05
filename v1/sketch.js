let media;
let mediaReady = false;
let isVideo = false;
let asciiFont;

const canvasW = 1350;
const canvasH = 1080;

function preload() {
  asciiFont = loadFont("../../assets/RadioGroteskMono-Mono-Regular.otf");
}

function setup() {
  const c = createCanvas(canvasW, canvasH);
  c.parent("canvas-container");
  background(255);

  document.getElementById("fileInput").addEventListener("change", handleFile);
  document.getElementById("savePngBtn").addEventListener("click", saveAsciiPNG);
  document.getElementById("saveTxtBtn").addEventListener("click", saveAsciiTXT);
}

function draw() {
  if (!mediaReady) {
    background(255);
    return;
  }

  const contrastSliderEl = document.getElementById("contrastSlider");
  const fontSliderEl = document.getElementById("fontSlider");
  const invertToggle = document.getElementById("invert").checked;
  const bgToggle = document.getElementById("bgToggle").checked;
  const fitModeEl = document.getElementById("fitMode");

  const contrast = parseFloat(contrastSliderEl.value);
  const fontSize = parseInt(fontSliderEl.value);

  const frame = getTransformedFrame();
  if (!frame) return;

  background(255);
  if (bgToggle) {
    let bgImg = frame;
    if (invertToggle) {
      bgImg = frame.get();
      bgImg.filter(INVERT);
    }
    image(bgImg, 0, 0);
  }

  drawASCII(frame, fontSize, contrast, invertToggle);
}

function getTransformedFrame() {
  const frame = isVideo ? media.get() : media;
  if (!frame) return null;
  let img = frame.get();
  const mode = document.getElementById("fitMode").value;

  // Calculate scale that preserves aspect ratio so the image is not distorted.
  // We scale so that either the width OR the height matches the canvas (no cropping).
  const scaleByWidth = canvasW / frame.width;
  const scaleByHeight = canvasH / frame.height;
  const fitScale = min(scaleByWidth, scaleByHeight);

  // Resize keeping aspect ratio
  img.resize(frame.width * fitScale, frame.height * fitScale);

  // Create a canvas-sized graphics buffer and draw the resized image at top-left
  // so the returned frame always matches the canvas dimensions.
  const pg = createGraphics(canvasW, canvasH);
  pg.clear();
  pg.image(img, 0, 0);

  return pg.get();
}

function drawASCII(img, fontSize, contrast, invertToggle, g = null) {
  const cell = max(2, fontSize);
  const cols = floor(canvasW / cell);
  const rows = floor(canvasH / cell);

  const small = img.get();
  small.resize(cols, rows);
  small.filter(GRAY);
  small.loadPixels();

  const useGfx = !!g;
  
  // Set font and text properties
  if (useGfx) {
    g.textFont(asciiFont);
    g.textSize(fontSize);
    g.fill(0);
    g.noStroke();
    g.textAlign(LEFT, TOP);
  } else {
    textFont(asciiFont);
    textSize(fontSize);
    fill(0);
    noStroke();
    textAlign(LEFT, TOP);
  }

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = (y * cols + x) * 4;
      const alpha = small.pixels[i + 3];

      if (alpha < 10) continue;

      let b = small.pixels[i];
      if (invertToggle) b = 255 - b;
      b = ((b / 255 - 0.5) * contrast + 0.5) * 255;
      b = constrain(b, 0, 255);
      const pct = (b / 255) * 100;

      const ch =
        pct < 20 ? " " :
        pct < 40 ? "|" :
        pct < 60 ? "\\" :
        pct < 80 ? "/" : "o";

      if (useGfx) g.text(ch, x * cell, y * cell);
      else text(ch, x * cell, y * cell);
    }
  }
}

function handleFile(e) {
  const file = e.target.files[0];
  if (!file) return;

  mediaReady = false;
  isVideo = file.type.startsWith("video");

  if (isVideo) {
    media = createVideo(URL.createObjectURL(file), () => {
      media.volume(0);
      media.loop();
      media.hide();
      mediaReady = true;
    });
  } else {
    loadImage(URL.createObjectURL(file), img => {
      media = img;
      mediaReady = true;
    });
  }
}

function saveAsciiPNG() {
  if (!mediaReady) return;
  const contrast = parseFloat(document.getElementById("contrastSlider").value);
  const fontSize = parseInt(document.getElementById("fontSlider").value);
  const invertToggle = document.getElementById("invert").checked;
  const frame = getTransformedFrame();

  const pg = createGraphics(canvasW, canvasH);
  pg.clear();
  drawASCII(frame, fontSize, contrast, invertToggle, pg);

  const a = document.createElement("a");
  a.href = pg.canvas.toDataURL("image/png");
  a.download = "ascii_art.png";
  a.click();
}

function saveAsciiTXT() {
  if (!mediaReady) return;

  const contrast = parseFloat(document.getElementById("contrastSlider").value);
  const fontSize = parseInt(document.getElementById("fontSlider").value);
  const invertToggle = document.getElementById("invert").checked;
  const frame = getTransformedFrame();

  const cell = max(2, fontSize);
  const cols = floor(canvasW / cell);
  const rows = floor(canvasH / cell);

  const small = frame.get();
  small.resize(cols, rows);
  small.filter(GRAY);
  small.loadPixels();

  const lines = [];

  for (let y = 0; y < rows; y++) {
    let row = "";
    for (let x = 0; x < cols; x++) {
      const i = (y * cols + x) * 4;
      const alpha = small.pixels[i + 3];

      if (alpha < 10) {
        row += " ";
        continue;
      }

      let b = small.pixels[i];
      if (invertToggle) b = 255 - b;
      b = ((b / 255 - 0.5) * contrast + 0.5) * 255;
      b = constrain(b, 0, 255);
      const pct = (b / 255) * 100;
      row +=
        pct < 20 ? " " :
        pct < 40 ? "|" :
        pct < 60 ? "\\" :
        pct < 80 ? "/" : "o";
    }
    lines.push(row);
  }

  const blob = new Blob([lines.join("\n")], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "ascii_art.txt";
  a.click();
}
