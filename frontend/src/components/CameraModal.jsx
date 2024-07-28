import React, { useEffect, useRef } from 'react';

const CameraModal = ({ isOpen, onClose, onSave }) => {
    const modalRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            startFeed();
            document.addEventListener('keydown', handleKeyDown);
            document.addEventListener('keyup', handleKeyUp);
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            stopFeed();
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('keyup', handleKeyUp);
            document.removeEventListener('mousedown', handleClickOutside);
        }
        return () => {
            stopFeed();
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('keyup', handleKeyUp);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const startFeed = async () => {
        console.log('Starting feed');
        try {
            await fetch('http://localhost:5000/start_feed', {
                method: 'POST',
            });
        } catch (error) {
            console.error('Failed to start feed:', error);
        }
    };

    const stopFeed = async () => {
        console.log('Stopping feed');
        try {
            await fetch('http://localhost:5000/stop_feed', {
                method: 'POST',
            });
        } catch (error) {
            console.error('Failed to stop feed:', error);
        }
    };

    const sendCommand = async (command) => {
        console.log(`Sending command: ${command}`);
        try {
            await fetch(`http://localhost:5000/${command}`, {
                method: 'POST',
            });
        } catch (error) {
            console.error(`Failed to send command ${command}:`, error);
        }
    };

    const handleKeyDown = (e) => {
        if (e.repeat) return; // Ignore auto-repeating keydown events
        console.log(`Key down: ${e.key}`); // Debugging
        if (e.key === 'w') {
            sendCommand('start_drawing');
        } else if (e.key === 'c') {
            sendCommand('clear_canvas');
        } else if (e.key === 's') {
            saveSignature();
        } else if (e.key === 'q') {
            stopFeed();
            onClose();
        }
    };

    const handleKeyUp = (e) => {
        console.log(`Key up: ${e.key}`); // Debugging
        if (e.key === 'w') {
            sendCommand('stop_drawing');
        }
    };

    const handleClickOutside = (e) => {
        if (modalRef.current && !modalRef.current.contains(e.target)) {
            console.log('Clicked outside the modal'); // Debugging
            stopFeed();
            onClose();
        }
    };

    const saveSignature = async () => {
        console.log('Saving signature'); // Debugging
        try {
            const response = await fetch('http://localhost:5000/save_signature');
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            onSave(url); // Callback to update the canvas
            const clearscreen=await fetch('http://localhost:5000//clear_canvas');
            console.log(clearscreen);
             stopFeed();
            onClose(); // Close the modal
        } catch (error) {
            console.error('Error saving or claering', error);
        }
    };

    return (
        isOpen && (
            <div className="modal" style={{ display: 'block' }}>
                <div className="modal-content" ref={modalRef}>
                    <span className="close" onClick={onClose}>&times;</span>
                    <div className="camera-feed">
                        <img src="http://localhost:5000/video_feed" alt="Camera Feed" />
                    </div>
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
