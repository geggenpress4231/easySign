export const startCamera = async (videoRef) => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
                console.log("Camera started");
            }
        } catch (error) {
            console.error('Failed to start camera:', error);
        }
    }
};

export const stopCamera = (videoRef) => {
    if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
        console.log("Camera stopped");
    }
};

export const captureFrame = async (videoRef, canvasRef) => {
    if (!videoRef.current || !canvasRef.current) return;

    const offscreenCanvas = document.createElement('canvas');
    const offscreenCtx = offscreenCanvas.getContext('2d');
    if (!offscreenCtx) return;

    offscreenCanvas.width = videoRef.current.videoWidth;
    offscreenCanvas.height = videoRef.current.videoHeight;

    offscreenCtx.save();
    offscreenCtx.scale(-1, 1);
    offscreenCtx.translate(-offscreenCanvas.width, 0);
    offscreenCtx.drawImage(videoRef.current, 0, 0, offscreenCanvas.width, offscreenCanvas.height);
    offscreenCtx.restore();

    offscreenCanvas.toBlob(async (blob) => {
        if (!blob) {
            console.error('Failed to create blob from canvas.');
            return;
        }
        const formData = new FormData();
        formData.append('image', blob, 'frame.jpg');
        try {
            const response = await fetch('http://localhost:5000/process_frame', {
                method: 'POST',
                body: formData,
            });
            if (!response.ok) {
                throw new Error('Failed to send frame');
            }
            const result = await response.json();
            const img = new Image();
            img.src = result.image;
            img.onload = () => {
                requestAnimationFrame(() => {
                    const ctx = canvasRef.current ? canvasRef.current.getContext('2d') : null;
                    if (!ctx) return;
                    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                    ctx.drawImage(img, 0, 0, canvasRef.current.width, canvasRef.current.height);
                });
            };
        } catch (error) {
            console.error('Failed to send frame:', error);
        }
    }, 'image/jpeg');
};

export const sendCommand = async (command) => {
    try {
        await fetch(`http://localhost:5000/${command}`, {
            method: 'POST',
        });
    } catch (error) {
        console.error(`Failed to send command ${command}:`, error);
    }
};

export const saveSignature = async (canvasRef, onSave, onClose) => {
    if (!canvasRef.current) return;
    canvasRef.current.toBlob(async (blob) => {
        if (!blob) {
            console.error('Failed to create blob from canvas.');
            return;
        }
        const formData = new FormData();
        formData.append('signature', blob, 'signature.png');
        try {
            const response = await fetch('http://localhost:5000/save_signature', {
                method: 'POST',
                body: formData,
            });
            if (!response.ok) {
                throw new Error('Error saving signature');
            }
            const url = URL.createObjectURL(await response.blob());
            onSave(url);
            onClose();
        } catch (error) {
            console.error('Error saving signature:', error);
        }
    });
};
