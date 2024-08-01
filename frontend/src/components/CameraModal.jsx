import React, { useEffect, useRef } from 'react';

const CameraModal = ({ isOpen, onClose, onSave }) => {
    const modalRef = useRef(null);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const intervalIdRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            startCamera();
            document.addEventListener('keydown', handleKeyDown);
            document.addEventListener('keyup', handleKeyUp);
            document.addEventListener('mousedown', handleClickOutside);
            intervalIdRef.current = setInterval(captureFrame, 100); // Capture frame every 100ms
        } else {
            stopCamera();
            clearInterval(intervalIdRef.current);
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('keyup', handleKeyUp);
            document.removeEventListener('mousedown', handleClickOutside);
        }
        return () => {
            stopCamera();
            clearInterval(intervalIdRef.current);
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('keyup', handleKeyUp);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const startCamera = async () => {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play();
                }
            } catch (error) {
                console.error('Failed to start camera:', error);
            }
        }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            videoRef.current.srcObject.getTracks().forEach(track => track.stop());
        }
    };

    const captureFrame = async () => {
        if (!videoRef.current || !canvasRef.current) return;

        // Ensure the off-screen canvas is initialized
        const offscreenCanvas = document.createElement('canvas');
        const offscreenCtx = offscreenCanvas.getContext('2d');
        if (!offscreenCtx) return; // Ensure offscreenCtx is valid

        offscreenCanvas.width = videoRef.current.videoWidth;
        offscreenCanvas.height = videoRef.current.videoHeight;

        // Flip the video image horizontally (mirroring)
        offscreenCtx.save();
        offscreenCtx.scale(-1, 1);
        offscreenCtx.translate(-offscreenCanvas.width, 0);
        offscreenCtx.drawImage(videoRef.current, 0, 0, offscreenCanvas.width, offscreenCanvas.height);
        offscreenCtx.restore();

        const dataUrl = offscreenCanvas.toDataURL('image/jpeg');
        try {
            const response = await fetch('http://localhost:5000/process_frame', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: dataUrl }),
            });
            const result = await response.json();
            const img = new Image();
            img.src = result.image;
            img.onload = () => {
                requestAnimationFrame(() => {
                    const ctx = canvasRef.current ? canvasRef.current.getContext('2d') : null;
                    if (!ctx) return; // Ensure ctx is valid
                    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                    ctx.drawImage(img, 0, 0, canvasRef.current.width, canvasRef.current.height);
                });
            };
        } catch (error) {
            console.error('Failed to send frame:', error);
        }
    };

    const handleKeyDown = async (e) => {
        if (e.repeat) return;
        if (e.key === 'w') {
            await sendCommand('start_drawing');
        } else if (e.key === 'c') {
            await sendCommand('clear_canvas');
        } else if (e.key === 's') {
            await saveSignature();
        } else if (e.key === 'q') {
            stopCamera();
            onClose();
        }
    };

    const handleKeyUp = async (e) => {
        if (e.key === 'w') {
            await sendCommand('stop_drawing');
        }
    };

    const handleClickOutside = (e) => {
        if (modalRef.current && !modalRef.current.contains(e.target)) {
            stopCamera();
            onClose();
        }
    };

    const sendCommand = async (command) => {
        try {
            await fetch(`http://localhost:5000/${command}`, {
                method: 'POST',
            });
        } catch (error) {
            console.error(`Failed to send command ${command}:`, error);
        }
    };

    const saveSignature = async () => {
        if (!canvasRef.current) return;
        canvasRef.current.toBlob(async (blob) => {
            const formData = new FormData();
            formData.append('signature', blob, 'signature.png');
            try {
                const response = await fetch('http://localhost:5000/save_signature', {
                    method: 'POST',
                    body: formData,
                });
                const url = URL.createObjectURL(await response.blob());
                onSave(url);
                stopCamera();
                onClose();
            } catch (error) {
                console.error('Error saving signature:', error);
            }
        });
    };

    return (
        isOpen && (
            <div className="modal" style={{ display: 'block' }}>
                <div className="modal-content" ref={modalRef}>
                    <span className="close" onClick={() => { stopCamera(); onClose(); }}>&times;</span>
                    <video ref={videoRef} style={{ display: 'none' }}></video>
                    <canvas ref={canvasRef} width={640} height={480}></canvas>
                    <div className="instructions">
                        <p>Press 'W' to start drawing</p>
                        <p>Release 'W' to stop drawing</p>
                        <p>Press 'C' to clear the screen</p>
                        <p>Press 'S' to save the drawing</p>
                        <p>Press 'Q' to exit</p>
                    </div>
                </div>
            </div>
        )
    );
};

export default CameraModal;
