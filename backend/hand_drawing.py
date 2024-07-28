import cv2
import mediapipe as mp
import numpy as np

# Initialize MediaPipe Hands
mp_hands = mp.solutions.hands
hands = mp_hands.Hands(max_num_hands=1, min_detection_confidence=0.8, min_tracking_confidence=0.8)
mp_draw = mp.solutions.drawing_utils

# Initialize webcam
cap = cv2.VideoCapture(0)
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

# Canvas for drawing
canvas = None

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

print("Press 'w' to start drawing, 'c' to clear, 's' to save, and 'q' to quit.")

while cap.isOpened():
    success, frame = cap.read()
    if not success:
        break

    # Flip the frame horizontally for a later selfie-view display
    frame = cv2.flip(frame, 1)
    
    # Convert the BGR image to RGB
    img_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    # Process the image and detect hands
    result = hands.process(img_rgb)

    # Initialize canvas if it is not initialized
    if canvas is None:
        canvas = np.ones_like(frame) * 255

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

    # Display the frame
    cv2.imshow('Hand Drawing', frame)

    # Handle key events
    key = cv2.waitKey(1) & 0xFF
    if key == ord('q'):
        break
    elif key == ord('c'):
        canvas = np.ones_like(frame) * 255  # Clear the canvas
    elif key == ord('s'):
        # Create a black-and-white version of the canvas for saving
        save_canvas = canvas.copy()
        save_canvas[np.where((save_canvas == draw_color).all(axis=2))] = save_color
        cv2.imwrite('signature.png', save_canvas)  # Save the signature
    elif key == ord('w'):
        is_drawing = True
    else:
        is_drawing = False

# Release resources
cap.release()
cv2.destroyAllWindows()
