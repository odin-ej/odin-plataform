"use client";

import { Button } from "@/components/ui/button";
import React, { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import type { Point, Area } from "react-easy-crop";

// ====================================================================================
// ✂️ COMPONENTES E UTILITÁRIOS PARA O CORTE DE IMAGEM
// ====================================================================================

/**
 * Cria uma imagem cortada a partir de uma fonte e coordenadas de pixels.
 * @param {string} imageSrc - A URL da imagem a ser cortada.
 * @param {Area} pixelCrop - A área em pixels a ser cortada.
 * @returns {Promise<Blob | null>} - Uma Promise que resolve com a imagem cortada como um Blob.
 */
async function cropImage(
  imageSrc: string,
  pixelCrop: Area
): Promise<Blob | null> {
  const image = new Image();
  image.src = imageSrc;
  await new Promise((resolve) => {
    image.onload = resolve;
  });

  const canvas = document.createElement("canvas");
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    return null;
  }

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob);
    }, "image/jpeg");
  });
}

interface ImageCropModalProps {
  imageSrc: string | null;
  onClose: () => void;
  onCropComplete: (croppedImage: Blob) => void;
  cropShape: "rect" | "round";
  aspect: number;
}

const ImageCropModal = ({
  imageSrc,
  onClose,
  onCropComplete,
  cropShape,
  aspect,
}: ImageCropModalProps) => {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isCropping, setIsCropping] = useState(false);

  const onCropAreaChange = useCallback(
    (_croppedArea: Area, croppedAreaPixelsValue: Area) => {
      setCroppedAreaPixels(croppedAreaPixelsValue);
    },
    []
  );

  const handleSaveCrop = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!imageSrc || !croppedAreaPixels) return;
    setIsCropping(true);
    try {
      const croppedImageBlob = await cropImage(imageSrc, croppedAreaPixels);
      if (croppedImageBlob) {
        onCropComplete(croppedImageBlob);
      }
    } catch (e) {
      console.error("Erro ao cortar a imagem:", e);
    } finally {
      setIsCropping(false);
      onClose();
    }
  };

  const handleCancel = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Adiciona o evento 'e'
    e.stopPropagation(); // <-- IMPEDE A PROPAGAÇÃO
    onClose();
  };

  if (!imageSrc) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[999]">
      <div className="pointer-events-auto bg-[#010d26] p-6 rounded-xl w-[90%] max-w-lg relative border border-[#0126fb]">
        <h2 className="mb-5 text-white font-semibold text-xl text-center">
          Editar Imagem
        </h2>
        <div className="relative w-full h-[350px] bg-black rounded-md">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            cropShape={cropShape}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropAreaChange}
          />
        </div>
        <div className="py-5 flex items-center justify-center">
          <label className="mr-3 text-white">Zoom</label>
          <input
            type="range"
            value={zoom}
            min={1}
            max={3}
            step={0.1}
            aria-labelledby="Zoom"
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-3/5 h-2 bg-[#0126fb] rounded-lg appearance-none cursor-pointer text-white accent-[#f5b719]"
          />
        </div>
        <div className="flex justify-end gap-3 mt-3">
          <Button
            onClick={handleCancel}
            disabled={isCropping}
            className="px-5 py-2.5 hover:text-white rounded-lg border border-gray-600 bg-transparent text-white cursor-pointer transition-colors hover:bg-gray-800 disabled:opacity-50"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSaveCrop}
            disabled={isCropping}
            className="px-5 py-2.5 rounded-lg hover:text-white border-none bg-[#f5b719] text-white hover:bg-[#f5b719]/90 font-semibold cursor-pointer transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isCropping ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ImageCropModal;
