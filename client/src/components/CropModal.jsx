import Cropper from 'react-easy-crop';
import { useState, useCallback } from 'react';
import { getCroppedImg } from '../utils/cropImage';

const CropModal = ({ imageSrc, onCropDone, onCancel }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const onCropComplete = useCallback((_, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleDone = async () => {
    try {
      const croppedBlobUrl = await getCroppedImg(imageSrc, croppedAreaPixels);
      onCropDone(croppedBlobUrl);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-[20000] flex flex-col items-center justify-center p-4">
      <div className="relative w-full max-w-[400px] aspect-square bg-[#060d14] rounded-2xl overflow-hidden shadow-2xl">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={1}
          cropShape="round"
          showGrid={false}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
        />
      </div>
      
      <div className="w-full max-w-[400px] mt-6 px-4">
        <input 
          type="range" 
          min={1} 
          max={3} 
          step={0.1} 
          value={zoom}
          onChange={e => setZoom(Number(e.target.value))}
          className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[var(--accent)]"
        />
      </div>

      <div className="flex gap-4 mt-8">
        <button 
          onClick={onCancel} 
          className="px-8 py-3 rounded-xl border border-white/20 text-white font-medium hover:bg-white/5 transition-colors"
        >
          Cancel
        </button>
        <button 
          onClick={handleDone} 
          className="px-8 py-3 rounded-xl bg-[var(--accent)] text-black font-bold hover:scale-105 active:scale-95 transition-all shadow-lg shadow-[var(--accent)]/20"
        >
          Apply Crop
        </button>
      </div>
    </div>
  );
};

export default CropModal;
