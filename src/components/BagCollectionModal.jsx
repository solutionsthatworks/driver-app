import React, { useState } from "react";

const BagCollectionModal = ({ isOpen, onClose, onSubmit }) => {
  const [bagCount, setBagCount] = useState(0);
  const [stickerCount, setStickerCount] = useState(0);

  const handleSubmit = () => {
    if (bagCount > 0 && stickerCount > 0) {
      onSubmit(bagCount, stickerCount);
      onClose();
    } else {
      alert("Please enter valid numbers for bags and stickers.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>Collect Bags and Bar Codes</h2>
        <div>
          <label>Number of Bags:</label>
          <input
            type="number"
            value={bagCount}
            onChange={(e) => setBagCount(e.target.value)}
            min="1"
          />
        </div>
        <div>
          <label>Number of Stickers:</label>
          <input
            type="number"
            value={stickerCount}
            onChange={(e) => setStickerCount(e.target.value)}
            min="1"
          />
        </div>
        <button onClick={handleSubmit}>Submit</button>
        <button onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
};

export default BagCollectionModal;
