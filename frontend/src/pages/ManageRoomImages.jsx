import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  UploadCloud,
  Trash2,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Plus,
  Eye,
  X,
} from "lucide-react";

const API = import.meta.env.VITE_API_URL;
const MAX_IMAGES = 3;

function ManageRoomImages() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Upload State
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);
  const fileInputRef = useRef(null);

  const SLOTS_META = [
    { index: 0, title: "Cover Photo", hint: "Main photo shown in search" },
    { index: 1, title: "Interior / Room", hint: "Bedroom, desk, or living area" },
    { index: 2, title: "Bathroom / Extra", hint: "Bathroom or exterior amenities" },
  ];

  // Fetch room & images
  useEffect(() => {
    const fetchRoomAndImages = async () => {
      try {
        setError("");
        const [imagesRes, roomRes] = await Promise.all([
          axios.get(`${API}/rooms/${roomId}/images`),
          axios.get(`${API}/rooms/${roomId}`).catch(() => null),
        ]);

        setImages(imagesRes.data);
        if (roomRes?.data) setRoom(roomRes.data);
      } catch (err) {
        setError(
          err.response?.data?.detail || "Unable to load property photos."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchRoomAndImages();
  }, [roomId]);

  const validateAndSetFile = (file) => {
    setError("");
    setSuccess("");

    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Please select a valid image (JPEG, PNG, or WEBP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be less than 5 MB.");
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    validateAndSetFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    validateAndSetFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    const token = sessionStorage.getItem("access_token");
    if (!token) {
      navigate("/login");
      return;
    }

    setUploading(true);
    setError("");
    setSuccess("");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      await axios.post(`${API}/rooms/${roomId}/images`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Refetch images
      const response = await axios.get(`${API}/rooms/${roomId}/images`);
      setImages(response.data);

      setSelectedFile(null);
      setPreviewUrl("");
      setSuccess("Photo uploaded successfully!");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to upload image.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (imageId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this photo?"
    );
    if (!confirmed) return;

    const token = sessionStorage.getItem("access_token");
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      setError("");
      setSuccess("");

      await axios.delete(`${API}/rooms/${roomId}/images/${imageId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setImages((prev) => prev.filter((img) => img.id !== imageId));
      setSuccess("Photo deleted.");
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to delete photo.");
    }
  };

  if (loading) {
    return (
      <div className="photo-manager-page">
        <div className="photo-manager-container">
          <div className="photo-manager-loading">
            <Loader2 size={24} className="spin-icon" />
            <p>Loading property photos...</p>
          </div>
        </div>
      </div>
    );
  }

  const atLimit = images.length >= MAX_IMAGES;

  return (
    <div className="photo-manager-page">
      <div className="photo-manager-container">
        {/* Navigation Breadcrumb */}
        <Link to="/owner/dashboard" className="photo-manager-back">
          <ArrowLeft size={15} /> Back to Dashboard
        </Link>

        {/* Page Header */}
        <div className="photo-manager-header">
          <div>
            <span className="photo-manager-kicker">PROPERTY GALLERY</span>
            <h1>{room?.title ? `${room.title} Photos` : "Property Photos"}</h1>
            <p>Upload clean, well-lit photos to attract more verified student inquiries.</p>
          </div>

          <div className="photo-count-pill">
            <ImageIcon size={16} />
            <span>
              <strong>{images.length}</strong> of {MAX_IMAGES} photos
            </span>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="photo-manager-alert is-error" role="alert">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="photo-manager-alert is-success" role="status">
            <CheckCircle2 size={16} />
            <span>{success}</span>
          </div>
        )}

        {/* Upload Dropzone Section */}
        {!atLimit ? (
          <section className="photo-upload-section">
            <div
              className={`photo-dropzone ${isDragging ? "is-dragging" : ""} ${
                previewUrl ? "has-preview" : ""
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !previewUrl && fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                style={{ display: "none" }}
              />

              {!previewUrl ? (
                <div className="dropzone-prompt">
                  <div className="dropzone-icon-circle">
                    <UploadCloud size={24} />
                  </div>
                  <h3>Click to upload or drag and drop</h3>
                  <p>JPG, PNG or WEBP (Max 5MB)</p>
                  <span className="dropzone-badge">
                    {MAX_IMAGES - images.length} {MAX_IMAGES - images.length === 1 ? "slot" : "slots"} remaining
                  </span>
                </div>
              ) : (
                <div className="dropzone-preview-box" onClick={(e) => e.stopPropagation()}>
                  <img src={previewUrl} alt="Upload preview" className="dropzone-preview-img" />
                  <div className="dropzone-preview-actions">
                    <button
                      type="button"
                      className="photo-btn-primary"
                      onClick={handleUpload}
                      disabled={uploading}
                    >
                      {uploading ? (
                        <>
                          <Loader2 size={15} className="spin-icon" /> Uploading...
                        </>
                      ) : (
                        <>
                          <UploadCloud size={15} /> Upload Photo
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      className="photo-btn-secondary"
                      onClick={() => {
                        setSelectedFile(null);
                        setPreviewUrl("");
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      disabled={uploading}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        ) : (
          <div className="photo-limit-banner">
            <CheckCircle2 size={18} />
            <div>
              <strong>Photo Limit Reached ({MAX_IMAGES}/{MAX_IMAGES})</strong>
              <p>To upload a new photo, please delete one of your existing photos below.</p>
            </div>
          </div>
        )}

        {/* Existing Photos Grid */}
        <section className="photo-gallery-section">
          <div className="gallery-section-heading">
            <h2>Current Photos</h2>
            <span>Photos are displayed to students in this order</span>
          </div>

          <div className="photo-cards-grid">
            {SLOTS_META.map((slot) => {
              const image = images[slot.index];

              if (image) {
                const imgUrl = image.image_url.startsWith("http")
                  ? image.image_url
                  : `${API}${image.image_url.startsWith("/") ? "" : "/"}${image.image_url}`;

                return (
                  <article className="photo-card" key={image.id}>
                    <div
                      className="photo-card-media"
                      onClick={() => setLightboxImage(imgUrl)}
                      style={{ cursor: "pointer" }}
                      title="Click to view full size"
                    >
                      <img src={imgUrl} alt={`Property photo ${slot.index + 1}`} loading="lazy" />
                      {slot.index === 0 && (
                        <span className="photo-cover-tag">Cover Photo</span>
                      )}
                      <span className="photo-order-tag">Slot #{slot.index + 1}</span>
                    </div>

                    <div className="photo-card-footer">
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: 600,
                          color: "#64748b",
                          marginRight: "auto",
                        }}
                      >
                        {slot.title}
                      </span>
                      <button
                        type="button"
                        className="photo-delete-btn"
                        onClick={() => handleDelete(image.id)}
                        title="Delete this photo"
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  </article>
                );
              }

              return (
                <div
                  className="photo-slot-empty"
                  key={`empty-slot-${slot.index}`}
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.click();
                    }
                  }}
                  title={`Upload ${slot.title}`}
                >
                  <div className="photo-slot-icon-circle">
                    <Plus size={22} />
                  </div>
                  <div>
                    <p className="photo-slot-label">+ Add {slot.title}</p>
                    <p className="photo-slot-hint">{slot.hint}</p>
                  </div>
                  <span className="photo-slot-badge">Slot #{slot.index + 1}</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Lightbox Preview */}
        {lightboxImage && (
          <div
            className="gallery-lightbox-overlay"
            onClick={() => setLightboxImage(null)}
          >
            <div
              className="gallery-lightbox-content"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="gallery-lightbox-close"
                onClick={() => setLightboxImage(null)}
                aria-label="Close photo preview"
              >
                <X size={20} />
              </button>
              <img src={lightboxImage} alt="Full resolution property view" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ManageRoomImages;
