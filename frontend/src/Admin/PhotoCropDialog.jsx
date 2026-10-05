import React, { useCallback, useEffect, useState } from "react";
import Cropper from "react-easy-crop";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";

// Every product photo is saved as a square JPEG on white, so it looks the
// same in every spot on the site whatever shape the original was.
export const PHOTO_SIZE = 1600; // pixels, each side
const MIN_SHARP_SIZE = 800; // below this the photo may look soft on big screens
const MIN_ZOOM = 0.2;

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("This file isn’t a photo the browser can open."));
    image.src = src;
  });

// Draws the chosen square onto a white canvas. `area` is in the photo's own
// pixels and may reach outside it (zoomed out), which becomes white space.
export const renderSquare = async (src, area) => {
  const image = await loadImage(src);
  const size = Math.min(PHOTO_SIZE, Math.round(area.width));
  const scale = size / area.width;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    image,
    -area.x * scale,
    -area.y * scale,
    image.naturalWidth * scale,
    image.naturalHeight * scale
  );
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
};

// Shows one photo in the square frame, starting with its full width in view;
// the owner can zoom and drag. Calls onSave(blob) or onSkip().
const PhotoCropDialog = ({ file, position, total, busy, onSave, onSkip, onCancel }) => {
  const [src, setSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [fitZoom, setFitZoom] = useState(1);
  const [area, setArea] = useState(null);
  const [error, setError] = useState(null);
  const [cropSide, setCropSide] = useState(null);

  // The square fills the space it has (phone or desktop), less a margin.
  // Measured once the dialog has put the box on screen.
  const areaRef = useCallback((node) => {
    if (!node) return;
    const box = node.getBoundingClientRect();
    setCropSide(Math.floor(Math.min(box.width, box.height) - 32));
  }, []);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    setCrop({ x: 0, y: 0 });
    setArea(null);
    setError(null);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // `width`/`height` are the photo's on-screen size at zoom 1.
  const onMediaLoaded = ({ width, height }) => {
    const clamp = (z) => Math.min(4, Math.max(MIN_ZOOM, z));
    // "Show whole photo": the long side just fits the square.
    const fit = clamp(cropSide / Math.max(width, height));
    setFitZoom(fit);
    // Start with the photo's full width in the square: frames are wide, so
    // nothing is cut off sideways, and a tall phone photo loses only
    // background at the top and bottom instead of gaining white bars.
    setZoom(clamp(width >= height ? fit : cropSide / width));
  };

  const save = async () => {
    try {
      const blob = await renderSquare(src, area);
      onSave(blob);
    } catch (err) {
      setError(err.message);
    }
  };

  const soft = area && area.width < MIN_SHARP_SIZE;

  return (
    <Dialog open onClose={busy ? undefined : onCancel} maxWidth="sm" fullWidth aria-labelledby="crop-title">
      <DialogTitle id="crop-title">
        Position the photo {total > 1 && <span className="muted">({position} of {total})</span>}
        <div className="muted" style={{ fontSize: 14, fontWeight: 400 }}>
          {file.name}. This square is exactly what customers will see.
        </div>
      </DialogTitle>
      <DialogContent>
        <div className="adminCropArea" ref={areaRef}>
          {src && cropSide && (
            <Cropper
              image={src}
              crop={crop}
              zoom={zoom}
              minZoom={MIN_ZOOM}
              maxZoom={4}
              aspect={1}
              cropSize={{ width: cropSide, height: cropSide }}
              restrictPosition={false}
              objectFit="contain"
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, pixels) => setArea(pixels)}
              onMediaLoaded={onMediaLoaded}
              style={{ containerStyle: { backgroundColor: "#ffffff" }, cropAreaStyle: { color: "rgba(0,0,0,0.35)" } }}
            />
          )}
        </div>
        <div className="adminCropControls">
          <label className="adminField" style={{ flex: 1 }}>
            Zoom
            <input
              type="range"
              min={MIN_ZOOM}
              max={4}
              step={0.01}
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
            />
          </label>
          <button
            type="button"
            className="adminButton secondary small"
            onClick={() => {
              setZoom(fitZoom);
              setCrop({ x: 0, y: 0 });
            }}
          >
            Show whole photo
          </button>
        </div>
        <p className="muted" style={{ marginTop: 8 }}>
          Drag to move, use the slider or pinch to zoom. Empty space is filled with white.
        </p>
        {soft && (
          <p className="adminNotice" role="status">
            This photo is small ({Math.round(area.width)} px across the square), so it may look a little
            blurry. A bigger or closer photo will look sharper.
          </p>
        )}
        {error && (
          <p className="adminNotice" role="alert">
            {error}
          </p>
        )}
      </DialogContent>
      <DialogActions>
        <button type="button" className="adminButton secondary" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <span style={{ flex: 1 }} />
        {total > 1 && (
          <button type="button" className="adminButton secondary" onClick={onSkip} disabled={busy}>
            Skip this one
          </button>
        )}
        <button type="button" className="adminButton" onClick={save} disabled={busy || !area}>
          {busy ? "Saving…" : "Save photo"}
        </button>
      </DialogActions>
    </Dialog>
  );
};

export default PhotoCropDialog;
