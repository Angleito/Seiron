# Video Assets Directory

This directory contains video files for the Seiron application.

## Required Videos

### dragon-transition.mp4
- **Description**: Transition video that plays after the lightning sequence and before the dragon arrival
- **Duration**: Recommended 3-5 seconds
- **Resolution**: 1920x1080 or higher recommended
- **Format**: MP4 with H.264 codec for best browser compatibility
- **Alternative Format**: Provide a WebM version for better browser support (dragon-transition.webm)

## Usage
The video is referenced in `frontend/pages/HomePage.tsx` and will automatically play during the summoning sequence.

## Notes
- Videos should be optimized for web playback
- Keep file sizes reasonable (under 10MB recommended)
- Consider providing multiple resolutions for different devices
- The video will play muted by default to ensure autoplay works on all browsers