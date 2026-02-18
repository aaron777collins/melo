"use client";

import React, { useRef } from "react";
import { FileIcon, X, Upload } from "lucide-react";
import Image from "next/image";

interface FileUploadProps {
  onChange: (url?: string) => void;
  value: string;
  endpoint: "messageFile" | "serverImage";
}

export function FileUpload({
  onChange,
  value,
  endpoint
}: FileUploadProps) {
  const fileType = value?.split(".").pop();

  if (value && fileType !== "pdf") {
    return (
      <div className="relative h-20 w-20">
        <Image fill src={value} alt="Upload" className="rounded-full" />
        <button
          onClick={() => onChange("")}
          className="bg-rose-500 text-white p-1 rounded-full absolute top-0 right-0 shadow-sm"
          type="button"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  if (value && fileType === "pdf") {
    return (
      <div className="relative flex items-center p-2 mt-2 rounded-md bg-background/10">
        <FileIcon className="h-10 w-10 fill-indigo-200 stroke-indigo-400" />
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-2 text-sm text-indigo-500 dark:text-indigo-400 hover:underline"
        >
          {value}
        </a>
        <button
          onClick={() => onChange("")}
          className="bg-rose-500 text-white p-1 rounded-full absolute -top-2 -right-2 shadow-sm"
          type="button"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // For now, we'll create a placeholder URL
      // In a real implementation, you'd upload to Matrix media repository
      const placeholderUrl = `https://via.placeholder.com/150?text=${encodeURIComponent(file.name)}`;
      onChange(placeholderUrl);
    }
  };

  return (
    <div 
      className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 transition-colors"
      onClick={() => fileInputRef.current?.click()}
    >
      <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
      <p className="text-sm text-gray-500">
        Click to upload or drag and drop
      </p>
      <p className="text-xs text-gray-400 mt-1">
        {endpoint === "serverImage" ? "PNG, JPG up to 4MB" : "Any file up to 4MB"}
      </p>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
        accept={endpoint === "serverImage" ? "image/*" : "*"}
      />
    </div>
  );
}
