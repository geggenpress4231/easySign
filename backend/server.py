from flask import Flask, render_template, Response, send_file
from flask_cors import CORS
import cv2
import mediapipe as mp
import numpy as np
import time

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
is_streaming = False  # Control the streaming state
cap = None  # Initialize the cap variable

def initialize_camera():
    global cap
    if cap is not None:
        cap.release()  # Release any existing camera before reinitializing
    cap = cv2.VideoCapture(0)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    time.sleep(2)  # Add a short delay to allow the camera to reset
    if cap is not None and cap.isOpened():
        print("Camera initialized successfully")
    else:
        print("Failed to initialize camera")
        cap = None

def release_camera():
    global cap
    if cap is not None:
        cap.release()
        print("Camera released")
    cap = None
    time.sleep(2)  # Add a short delay to allow the camera to reset

def smooth_coordinates(last_c, current_c, factor):
    """Smooth the coordinates."""
    return last_c + (current_c - last_c) * factor

def gen_frames():
    global is_drawing, last_x, last_y, canvas, is_streaming, cap
    while is_streaming:
        if cap is None or not cap.isOpened():
            print("Reinitializing camera inside gen_frames")
            initialize_camera()  # Reinitialize the camera if it's closed
        success, frame = cap.read()
        if not success:
            print("Failed to read frame")
            break

        # Flip the frame horizontally for a later selfie-view display
        frame = cv2.flip(frame, 1)
        
        # Convert the BGR image to RGB
        img_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        # Process the image and detect hands
        result = hands.process(img_rgb)

        # Draw hand landmarks and handle drawing
        if result.multi_hand_landmarks:
            for hand_landmarks in result.multi_hand_landmarks:
                mp_draw.draw_landmarks(frame, hand_landmarks, mp_hands.HAND_CONNECTIONS)
                
                # Extract index finger tip coordinates
                index_finger_tip = hand_landmarks.landmark[mp_hands.HandLandmark.INDEX_FINGER_TIP]
                h, w, _ = frame.shape
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
        frame = cv2.addWeighted(frame, 0.5, canvas, 0.5, 0)

        # Encode the frame in JPEG format
        ret, buffer = cv2.imencode('.jpg', frame)
        frame = buffer.tobytes()

        # Yield the frame in byte format
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/video_feed')
def video_feed():
    global is_streaming
    if not is_streaming:
        is_streaming = True
        initialize_camera()
        print("Starting video feed")
    return Response(gen_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/start_feed', methods=['POST'])
def start_feed():
    global is_streaming
    if not is_streaming:
        is_streaming = True
        initialize_camera()
        print("Video feed started")
    return '', 204

@app.route('/stop_feed', methods=['POST'])
def stop_feed():
    global is_streaming
    is_streaming = False
    release_camera()
    print("Video feed stopped")
    return '', 204

@app.route('/save_signature')
def save_signature():
    global canvas
    # Create a black-and-white version of the canvas for saving
    save_canvas = canvas.copy()
    save_canvas[np.where((save_canvas == draw_color).all(axis=2))] = save_color
    cv2.imwrite('signature.png', save_canvas)  # Save the signature
    print("Signature saved")
    return send_file('signature.png', mimetype='image/png')

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

if __name__ == '__main__':
    app.run(debug=True)
