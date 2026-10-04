import React, { useEffect, useState } from "react";

import { ConfirmDialog } from "./components";
import { apiErrorCode, errorMessage } from "../Api/errors";
import {
  useAddImageMutation,
  useDeleteImageMutation,
  useReorderImagesMutation,
  useUpdateImageMutation,
  useUploadSignatureMutation,
} from "../Features/Admin/adminApi";
import { imageUrl } from "../Utils/cloudinary";
import { notify } from "../Utils/notify";

// Sends one file straight from the browser to Cloudinary using parameters the
// API signed, reporting progress. Resolves with Cloudinary's response.
const uploadToCloudinary = (file, signed, onProgress) =>
  new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("file", file);
    ["api_key", "timestamp", "signature", "folder", "allowed_formats"].forEach((key) =>
      form.append(key, signed[key])
    );
    const xhr = new XMLHttpRequest();
    xhr.open("POST", signed.upload_url);
    xhr.upload.onprogress = (event) => event.lengthComputable && onProgress(event.loaded / event.total);
    xhr.onload = () =>
      xhr.status < 300 ? resolve(JSON.parse(xhr.responseText)) : reject(new Error(xhr.responseText));
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(form);
  });

const ColourSelect = ({ product, value, onChange, label }) => (
  <select className="adminSelect" aria-label={label} value={value ?? ""} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}>
    <option value="">All colours</option>
    {product.variants.map((v) => (
      <option key={v.id} value={v.id}>
        {v.color_name}
      </option>
    ))}
  </select>
);

const ImageCard = ({ product, image, index, onMove }) => {
  const [updateImage] = useUpdateImageMutation();
  const [deleteImage, deleteState] = useDeleteImageMutation();
  const [alt, setAlt] = useState(image.alt_text ?? "");
  const [confirming, setConfirming] = useState(false);

  const update = (changes) =>
    updateImage({ id: image.id, ...changes })
      .unwrap()
      .catch((err) => notify.error(errorMessage(err)));

  return (
    <li className={`adminImageCard ${image.is_primary ? "primary" : ""}`}>
      <img src={imageUrl(image, 400)} alt={image.alt_text ?? ""} loading="lazy" />
      {image.is_primary ? (
        <strong>Main photo</strong>
      ) : (
        <button type="button" className="adminButton secondary small" onClick={() => update({ is_primary: true })}>
          Make main photo
        </button>
      )}
      <ColourSelect product={product} label="Colour" value={image.variant_id} onChange={(variant_id) => update({ variant_id })} />
      <input
        className="adminInput"
        aria-label="Description for screen readers"
        placeholder="Alt text"
        value={alt}
        onChange={(e) => setAlt(e.target.value)}
        onBlur={() => alt !== (image.alt_text ?? "") && update({ alt_text: alt || null })}
      />
      <div className="adminImageActions">
        <button type="button" className="adminButton secondary small" disabled={index === 0} onClick={() => onMove(index, -1)} aria-label="Move earlier">
          ←
        </button>
        <button type="button" className="adminButton secondary small" disabled={index === product.images.length - 1} onClick={() => onMove(index, 1)} aria-label="Move later">
          →
        </button>
        <button type="button" className="adminButton secondary small" onClick={() => setConfirming(true)}>
          Delete
        </button>
      </div>
      <p className="muted" style={{ wordBreak: "break-all" }}>{image.public_id}</p>
      <ConfirmDialog
        open={confirming}
        title="Delete this photo?"
        confirmLabel="Delete photo"
        danger
        busy={deleteState.isLoading}
        onClose={() => setConfirming(false)}
        onConfirm={async () => {
          await deleteImage(image.id).unwrap().catch((err) => notify.error(errorMessage(err)));
          setConfirming(false);
        }}
      >
        It’s removed from this product. Photos uploaded here are also deleted from Cloudinary.
      </ConfirmDialog>
    </li>
  );
};

const ImagesTab = ({ product }) => {
  const [getSignature] = useUploadSignatureMutation();
  const [addImage] = useAddImageMutation();
  const [reorder] = useReorderImagesMutation();
  const [variantId, setVariantId] = useState(product.variants[0]?.id ?? null);
  const [progress, setProgress] = useState(null);
  const [uploadsDisabled, setUploadsDisabled] = useState(false);
  const [publicId, setPublicId] = useState("");

  // Find out up front whether uploads are set up, so the form can say so.
  useEffect(() => {
    getSignature(product.id)
      .unwrap()
      .catch((err) => apiErrorCode(err) === "IMAGES_NOT_CONFIGURED" && setUploadsDisabled(true));
  }, [getSignature, product.id]);

  const upload = async (files) => {
    let signed;
    try {
      signed = await getSignature(product.id).unwrap();
    } catch (err) {
      if (apiErrorCode(err) === "IMAGES_NOT_CONFIGURED") setUploadsDisabled(true);
      notify.error(errorMessage(err));
      return;
    }
    for (const [n, file] of [...files].entries()) {
      if (file.size > signed.max_bytes) {
        notify.error(`${file.name} is larger than 10 MB`);
        continue;
      }
      try {
        const result = await uploadToCloudinary(file, signed, (p) => setProgress({ n: n + 1, total: files.length, p }));
        await addImage({ productId: product.id, public_id: result.public_id, variant_id: variantId }).unwrap();
      } catch (err) {
        notify.error(`${file.name}: ${err.message?.slice(0, 120) || errorMessage(err)}`);
      }
    }
    setProgress(null);
    notify.success("Upload finished");
  };

  const attachExisting = async (event) => {
    event.preventDefault();
    try {
      await addImage({ productId: product.id, public_id: publicId.trim(), variant_id: variantId }).unwrap();
      setPublicId("");
      notify.success("Photo added");
    } catch (err) {
      notify.error(errorMessage(err));
    }
  };

  const move = (index, step) => {
    const ids = product.images.map((image) => image.id);
    [ids[index], ids[index + step]] = [ids[index + step], ids[index]];
    reorder({ productId: product.id, imageIds: ids }).unwrap().catch((err) => notify.error(errorMessage(err)));
  };

  return (
    <>
      <section className="adminCard">
        <h2>Add photos</h2>
        <div className="adminToolbar">
          <div className="adminField" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <span aria-hidden="true">For colour</span>
            <ColourSelect product={product} label="Colour for new photos" value={variantId} onChange={setVariantId} />
          </div>
        </div>
        {uploadsDisabled ? (
          <p className="adminNotice">
            Uploading needs the shop’s Cloudinary API key and secret in the backend settings
            (CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET). Until then, add photos that are already in
            Cloudinary by their public ID below.
          </p>
        ) : (
          <label className="adminField">
            Upload JPG, PNG or WebP (up to 10 MB each)
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              disabled={progress !== null}
              onChange={(e) => e.target.files.length && upload(e.target.files)}
            />
          </label>
        )}
        {progress && (
          <p role="status" className="muted">
            Uploading {progress.n} of {progress.total}… {Math.round(progress.p * 100)}%
          </p>
        )}
        <form className="adminToolbar" style={{ marginTop: 14 }} onSubmit={attachExisting}>
          <label className="visuallyHidden" htmlFor="existing-public-id">
            Cloudinary public ID
          </label>
          <input
            id="existing-public-id"
            type="text"
            placeholder="Existing Cloudinary public ID, e.g. Products/orb2132/orb2132_1"
            value={publicId}
            onChange={(e) => setPublicId(e.target.value)}
            style={{ minWidth: 380 }}
          />
          <button type="submit" className="adminButton secondary" disabled={!publicId.trim()}>
            Add by ID
          </button>
        </form>
      </section>

      {product.images.length === 0 ? (
        <p className="muted">No photos yet. The shop shows a grey placeholder until you add one.</p>
      ) : (
        <ul className="adminImages">
          {product.images.map((image, index) => (
            <ImageCard key={`${image.id}-${image.is_primary}-${image.variant_id}`} product={product} image={image} index={index} onMove={move} />
          ))}
        </ul>
      )}
    </>
  );
};

export default ImagesTab;
