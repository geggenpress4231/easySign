import cv2
import numpy as np

def postprocess_signature(input_image_path, output_image_path):
    print(f"Reading the image from {input_image_path}")
    # Read the image
    img = cv2.imread(input_image_path, cv2.IMREAD_GRAYSCALE)
    if img is None:
        raise FileNotFoundError(f"Image at path {input_image_path} not found")

    print("Thresholding the image to create a binary image")
    # Threshold the image to create a binary image
    _, binary = cv2.threshold(img, 128, 255, cv2.THRESH_BINARY_INV)

    print("Applying morphological operations to clean the image")
    # Apply morphological operations to clean the image
    kernel = np.ones((3, 3), np.uint8)
    morph = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel, iterations=2)
    morph = cv2.morphologyEx(morph, cv2.MORPH_OPEN, kernel, iterations=2)

    print("Applying Gaussian blur to smooth the image")
    # Apply Gaussian blur to smooth the image
    blurred = cv2.GaussianBlur(morph, (5, 5), 0)

    print("Inverting the image back")
    # Invert the image back
    final_img = cv2.bitwise_not(blurred)

    print(f"Saving the processed image to {output_image_path}")
    # Save the processed image
    cv2.imwrite(output_image_path, final_img)
    print("Processing complete!")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Post-process a signature image to clean and smooth it.")
    parser.add_argument("input_image", help="Path to the input signature image")
    parser.add_argument("output_image", help="Path to save the processed signature image")
    args = parser.parse_args()

    postprocess_signature(args.input_image, args.output_image)
