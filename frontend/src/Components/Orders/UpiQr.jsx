import React, { useEffect, useState } from "react";

// QR code for a upi://pay link; any UPI app can scan it. The QR library is
// only downloaded on pages that show one.
const UpiQr = ({ uri, size = 220 }) => {
  const [src, setSrc] = useState(null);

  useEffect(() => {
    let cancelled = false;
    import("qrcode")
      .then((QRCode) => QRCode.toDataURL(uri, { width: size * 2, margin: 1, errorCorrectionLevel: "M" }))
      .then((url) => !cancelled && setSrc(url))
      .catch(() => !cancelled && setSrc(null));
    return () => {
      cancelled = true;
    };
  }, [uri, size]);

  return src ? (
    <img className="upiQr" src={src} width={size} height={size} alt="UPI QR code. Scan it with any UPI app to pay." />
  ) : (
    <div className="upiQr" style={{ width: size, height: size }} aria-hidden="true" />
  );
};

export default UpiQr;
