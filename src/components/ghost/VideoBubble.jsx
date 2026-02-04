import React, { useRef, useEffect } from 'react';

export const VideoBubble = ({ src, startTime = 0, autoPlay = false }) => {
    const videoRef = useRef(null);
    const [hasError, setHasError] = React.useState(false);

    useEffect(() => {
        if (videoRef.current && startTime > 0) {
            videoRef.current.currentTime = startTime;
        }
    }, [startTime]);

    const handleError = () => {
        setHasError(true);
    };

    if (hasError) {
        return (
            <div className="mt-2 mb-2 p-3 rounded-lg border border-red-900/50 bg-red-950/30 text-red-200 text-xs text-center font-mono">
                🚫 "Lo siento, ese recuerdo visual se ha desvanecido. Intenta renderizarlo de nuevo con el comando de video."
            </div>
        );
    }

    return (
        <div className="mt-2 mb-2 rounded-lg overflow-hidden border border-slate-700 shadow-lg bg-black">
            <video
                ref={videoRef}
                controls
                autoPlay={autoPlay}
                muted
                playsInline
                className="w-full h-auto max-h-60 object-contain"
                onError={handleError}
            >
                <source src={src} type="video/mp4" />
                Your browser does not support the video tag.
            </video>
            <div className="p-1 bg-slate-900 text-xs text-slate-400 text-center">
                Memoria Visual: {src.split('/').pop()}
            </div>
        </div>
    );
};
