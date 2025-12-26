'use client'

import Image from 'next/image'
import { useState, useImperativeHandle, forwardRef } from 'react'

interface ImageDisplayProps {
  image: string
  name: string
  onImageLoad?: () => void
}

export interface ImageDisplayRef {
  triggerSuccess: () => void
}

const ImageDisplay = forwardRef<ImageDisplayRef, ImageDisplayProps>(
  ({ image, name, onImageLoad }, ref) => {
    const [showSuccess, setShowSuccess] = useState(false)
    const [hasLoaded, setHasLoaded] = useState(false)

    // Show success animation when correct answer is given
    const triggerSuccess = () => {
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 2000)
    }

    useImperativeHandle(ref, () => ({
      triggerSuccess,
    }))

    const handleImageLoad = () => {
      if (!hasLoaded) {
        setHasLoaded(true)
        onImageLoad?.()
      }
    }

    return (
      <div className="relative mb-6" style={{ maxWidth: '330px', width: '100%' }}>
        <div
          className={`border rounded-lg shadow-lg overflow-hidden transition-all duration-300 ${
            showSuccess ? 'border-green-500 border-8 scale-105' : 'border-gray-300 border-4'
          }`}
        >
          <Image
            src={image}
            alt={name}
            width={330}
            height={330}
            className="w-full h-auto"
            style={{ objectFit: 'contain' }}
            priority
            onLoad={handleImageLoad}
          />
        </div>

        {showSuccess && (
          <div
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-green-500 text-6xl font-bold animate-bounce"
          >
            ✓
          </div>
        )}
      </div>
    )
  })

ImageDisplay.displayName = 'ImageDisplay'

export default ImageDisplay
