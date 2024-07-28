import React, { useRef, useState, useEffect } from 'react';
import CameraModal from './CameraModal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCamera } from '@fortawesome/free-solid-svg-icons';

const Canvas = () => {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [lastX, setLastX] = useState(0);
    const [lastY, setLastY] = useState(0);
    const [strokeStyle, setStrokeStyle] = useState('#000000');
    const [backgroundColor, setBackgroundColor] = useState('#FFFFFF');
    const [fontSize, setFontSize] = useState(5);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const undoStack = useRef([]);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = fontSize;
        saveState();
    }, [backgroundColor, strokeStyle, fontSize]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.ctrlKey && e.key === 'z') {
                e.preventDefault();
                undo();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    const saveState = () => {
        const canvas = canvasRef.current;
        const state = canvas.toDataURL();
        if (undoStack.current.length === 0 || undoStack.current[undoStack.current.length - 1] !== state) {
            undoStack.current.push(state);
        }
    };

    const startDrawing = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        setIsDrawing(true);
        setLastX(e.clientX - rect.left);
        setLastY(e.clientY - rect.top);
        saveState();
    };

    const draw = (e) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
        ctx.stroke();
        setLastX(e.clientX - rect.left);
        setLastY(e.clientY - rect.top);
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = backgroundColor; // Reset the background color
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        saveState();
    };

    const saveCanvas = () => {
        const canvas = canvasRef.current;
        const dataURL = canvas.toDataURL();
        localStorage.setItem('canvasContents', dataURL);
        const link = document.createElement('a');
        link.download = 'signature.png';
        link.href = dataURL;
        link.click();
    };

    const retrieveCanvas = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const savedCanvas = localStorage.getItem('canvasContents');
        if (savedCanvas) {
            const img = new Image();
            img.src = savedCanvas;
            img.onload = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
            };
        }
    };

    const undo = () => {
        if (undoStack.current.length > 1) {
            undoStack.current.pop();
            const previousState = undoStack.current[undoStack.current.length - 1];
            const img = new Image();
            img.src = previousState;
            img.onload = () => {
                const canvas = canvasRef.current;
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            };
        }
    };

    const handleCameraClick = () => {
        clearCanvas();
        setIsModalOpen(true);
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
    };

    const handleSaveSignature = (url) => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.src = url; // image to be added to canvas
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            saveState();
        };
    };

    return (
        <div className="main">
            <h1>EasySign</h1>
            <div className="top">
                <div className="block">
                    <p>Text Color Picker</p>
                    <input type="color" className="form-control" value={strokeStyle} onChange={(e) => setStrokeStyle(e.target.value)} />  
                </div>
                <div className="block">
                    <p>Background</p>
                    <input type="color" className="form-control" value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} />  
                </div>
                <div className="block">
                    <p>Font Size</p>
                    <select className="form-control" value={fontSize} onChange={(e) => setFontSize(parseInt(e.target.value, 10))}>
                        <option value="5">5px</option>
                        <option value="10">10px</option>
                        <option value="20">20px</option>
                        <option value="30">30px</option>
                        <option value="40">40px</option>
                    </select> 
                </div>
                <div className="block">
                    <p>Draw Sign</p>
                    <button type="button" className="btn-camera" onClick={handleCameraClick}>
                        <FontAwesomeIcon icon={faCamera} /> Camera
                    </button>
                </div>
            </div>
            <canvas
                className="canvas"
                id="signBoard"
                height="350"
                width="800"
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseOut={stopDrawing}
            ></canvas>
            <div className="bottom">
                <button type="button" className="btn-ocean-green" onClick={clearCanvas}>Clear</button>
                <button type="button" className="btn-ocean-green" onClick={saveCanvas}>Save & Download</button>
                <button type="button" className="btn-ocean-green" onClick={retrieveCanvas}>Retrieve Saved Signature</button>
            </div>
            <CameraModal
                isOpen={isModalOpen}
                onClose={handleModalClose}
                onSave={handleSaveSignature}
            />
        </div>
    );
};

export default Canvas;
