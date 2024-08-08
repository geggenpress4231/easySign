import React, { useEffect, useRef } from 'react';
import { startCamera, stopCamera, captureFrame, sendCommand, saveSignature } from '../utils/cameraUtils';

const CameraModal = ({ isOpen, onClose, onSave }) => {
    const modalRef = useRef(null);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const intervalIdRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            startCamera(videoRef);
            document.addEventListener('keydown', handleKeyDown);
            document.addEventListener('keyup', handleKeyUp);
            document.addEventListener('mousedown', handleClickOutside);
            intervalIdRef.current = setInterval(() => captureFrame(videoRef, canvasRef), 100); // Capture frame every 100ms
        } else {
            stopCamera(videoRef);
            clearInterval(intervalIdRef.current);
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('keyup', handleKeyUp);
            document.removeEventListener('mousedown', handleClickOutside);
        }
        return () => {
            stopCamera(videoRef);
            clearInterval(intervalIdRef.current);
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('keyup', handleKeyUp);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleKeyDown = async (e) => {
        if (e.repeat) return;
        if (e.key === 'w') {
            await sendCommand('start_drawing');
        } else if (e.key === 'c') {
            await sendCommand('clear_canvas');
        } else if (e.key === 's') {
            await saveSignature(canvasRef, onSave, onClose);
        } else if (e.key === 'q') {
            stopCamera(videoRef);
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
            stopCamera(videoRef);
            onClose();
        }
    };

    return (
        isOpen && (
            <div className="modal" style={{ display: 'block' }}>
                <div className="modal-content" ref={modalRef}>
                    <span className="close" onClick={() => { stopCamera(videoRef); onClose(); }}>&times;</span>
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
