from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import cv2
import mediapipe as mp
import numpy as np
from io import BytesIO
from PIL import Image
import base64

app = Flask(__name__)
CORS(app)

# Initialize MediaPipe Hands
mp_hands = mp.solutions.hands
hands = mp_hands.Hands(max_num_hands=1, min_detection_confidence=0.8, min_tracking_confidence=0.8)
mp_draw = mp.solutions.drawing_utils

# Canvas for drawing
canvas = np.ones((480, 640, 3), dtype=np.uint8) * 255

# Color for drawing
draw_color = (0, 0, 255)  # Red color for display
save_color = (0, 0, 0)    # Black color for saving

# State variables
is_drawing = False
last_x, last_y = 0, 0
smooth_factor = 0.2  # Factor for smoothing

def smooth_coordinates(last_c, current_c, factor):
    """Smooth the coordinates."""
    return last_c + (current_c - last_c) * factor

def process_frame(image):
    global is_drawing, last_x, last_y, canvas

    img_rgb = np.array(image.convert('RGB'))
    img_rgb = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2BGR)

    # Process the image and detect hands
    result = hands.process(img_rgb)

    # Draw hand landmarks and handle drawing
    if result.multi_hand_landmarks:
        for hand_landmarks in result.multi_hand_landmarks:
            mp_draw.draw_landmarks(img_rgb, hand_landmarks, mp_hands.HAND_CONNECTIONS)

            # Extract index finger tip coordinates
            index_finger_tip = hand_landmarks.landmark[mp_hands.HandLandmark.INDEX_FINGER_TIP]
            h, w, _ = img_rgb.shape
            ix, iy = int(index_finger_tip.x * w), int(index_finger_tip.y * h)

            # Smooth the coordinates
            ix = int(smooth_coordinates(last_x, ix, smooth_factor))
            iy = int(smooth_coordinates(last_y, iy, smooth_factor))

            # Draw on canvas if is_drawing is True
            if is_drawing:
                cv2.line(canvas, (last_x, last_y), (ix, iy), draw_color, 8)  # Thicker line
                # Interpolate between the points to make the line smoother
                points_between = np.linspace((last_x, last_y), (ix, iy), num=10).astype(int)
                for point in points_between:
                    cv2.circle(canvas, tuple(point), 4, draw_color, -1)

            last_x, last_y = ix, iy

    # Overlay the canvas on the frame
    img_rgb = cv2.addWeighted(img_rgb, 0.5, canvas, 0.5, 0)
    return img_rgb

@app.route('/process_frame', methods=['POST'])
def process_frame_endpoint():
    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400

    image_file = request.files['image']
    image = Image.open(image_file.stream)
    processed_frame = process_frame(image)

    _, buffer = cv2.imencode('.jpg', processed_frame)
    processed_image_base64 = base64.b64encode(buffer).decode('utf-8')
    return jsonify({'image': 'data:image/jpeg;base64,' + processed_image_base64})

@app.route('/start_drawing', methods=['POST'])
def start_drawing():
    global is_drawing
    is_drawing = True
    print("Drawing started")
    return '', 204

@app.route('/stop_drawing', methods=['POST'])
def stop_drawing():
    global is_drawing
    is_drawing = False
    print("Drawing stopped")
    return '', 204

@app.route('/clear_canvas', methods=['POST'])
def clear_canvas():
    global canvas
    canvas = np.ones((480, 640, 3), dtype=np.uint8) * 255
    print("Canvas cleared")
    return '', 204

@app.route('/save_signature', methods=['POST'])
def save_signature():
    global canvas
    # Create a black-and-white version of the canvas for saving
    save_canvas = np.ones((480, 640, 3), dtype=np.uint8) * 255  # White background
    save_canvas[np.where((canvas == [0, 0, 255]).all(axis=2))] = [0, 0, 0]  # Black drawing
    _, buffer = cv2.imencode('.png', save_canvas)  # Save the signature
    print("Signature saved")
    return send_file(BytesIO(buffer), mimetype='image/png')

if __name__ == '__main__':
    app.run(debug=True)
