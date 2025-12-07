'use client';

import { useState } from 'react';
import { Upload, X } from 'lucide-react';

interface ImageUploaderProps {
  onImageUpload: (base64: string | string[]) => void;
  multipleImages?: boolean;
  maxImages?: number;
}

export default function ImageUploader({ onImageUpload, multipleImages = false, maxImages = 3 }: ImageUploaderProps) {
  const [previews, setPreviews] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = (files: FileList) => {
    const fileArray = Array.from(files);
    
    if (!multipleImages && fileArray.length > 0) {
      handleSingleFile(fileArray[0]);
      return;
    }

    const validFiles = fileArray.filter(file => file.type.startsWith('image/'));
    
    if (validFiles.length === 0) {
      alert('Please upload image files');
      return;
    }

    if (previews.length + validFiles.length > maxImages) {
      alert(`Maximum ${maxImages} images allowed`);
      return;
    }

    const readers = validFiles.map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readers).then(base64Array => {
      const newPreviews = [...previews, ...base64Array];
      setPreviews(newPreviews);
      onImageUpload(newPreviews);
    });
  };

  const handleSingleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setPreviews([base64]);
      onImageUpload(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const removeImage = (index: number) => {
    const newPreviews = previews.filter((_, i) => i !== index);
    setPreviews(newPreviews);
    onImageUpload(multipleImages ? newPreviews : (newPreviews[0] || ''));
  };

  const clearAllImages = () => {
    setPreviews([]);
    onImageUpload(multipleImages ? [] : '');
  };

  return (
    <div className="w-full">
      {previews.length === 0 ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
            isDragging 
              ? 'border-indigo-500 bg-indigo-50 scale-[1.02]' 
              : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
          }`}
        >
          <div className="flex flex-col items-center">
            <div className={`p-4 rounded-full mb-4 transition-colors ${
              isDragging ? 'bg-indigo-100' : 'bg-gray-100'
            }`}>
              <Upload className={`w-8 h-8 ${isDragging ? 'text-indigo-600' : 'text-gray-400'}`} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {multipleImages ? 'Upload Multiple Images' : 'Upload Image'}
            </h3>
            <p className="text-sm text-gray-600 mb-1">
              Drag and drop or click to browse
            </p>
            <p className="text-xs text-gray-500 mb-4">
              Supports: JPG, PNG, WebP (max 10MB)
            </p>
            {multipleImages && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 max-w-md">
                <p className="text-xs text-blue-800 font-medium">
                  📚 Retrieval Quiz requires 3 images:
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  Topic A • Topic B • Topic C
                </p>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              multiple={multipleImages}
              onChange={handleChange}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg cursor-pointer hover:bg-indigo-700 active:scale-95 transition-all duration-150 shadow-sm hover:shadow-md"
            >
              Choose {multipleImages ? 'Images' : 'Image'}
            </label>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {multipleImages && (
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <p className="text-sm font-medium text-gray-700">
                  {previews.length} of {maxImages} images uploaded
                </p>
              </div>
              <button
                onClick={clearAllImages}
                className="text-sm text-red-600 hover:text-red-700 font-medium transition-colors"
              >
                Clear All
              </button>
            </div>
          )}
          <div className={`grid ${multipleImages ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'} gap-4`}>
            {previews.map((preview, index) => (
              <div key={index} className="group relative bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden border border-gray-200">
                {multipleImages && (
                  <div className="absolute top-3 left-3 bg-indigo-600 text-white px-3 py-1 rounded-full text-xs font-bold z-10 shadow-lg">
                    Topic {String.fromCharCode(65 + index)}
                  </div>
                )}
                <div className="h-32 overflow-hidden bg-gray-100">
                  <img 
                    src={preview} 
                    alt={`Preview ${index + 1}`} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" 
                  />
                </div>
                <button
                  onClick={() => removeImage(index)}
                  className="absolute top-3 right-3 p-1.5 bg-white/90 backdrop-blur-sm text-red-600 rounded-full hover:bg-red-600 hover:text-white transition-all duration-150 shadow-lg opacity-0 group-hover:opacity-100"
                  title="Remove image"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          {multipleImages && previews.length < maxImages && (
            <div className="text-center pt-2">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleChange}
                className="hidden"
                id="file-upload-more"
              />
              <label
                htmlFor="file-upload-more"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border-2 border-dashed border-gray-300 text-gray-700 text-sm font-medium rounded-lg cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 transition-all duration-150"
              >
                <Upload className="w-4 h-4" />
                Add More Images
              </label>
            </div>
          )}
        </div>
      )}
    </div>
  );
}