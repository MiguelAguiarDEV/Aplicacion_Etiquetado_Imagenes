from flask import Flask, render_template, request, jsonify
import os
import json

app = Flask(__name__)
UPLOAD_FOLDER = 'static/images'
LABELS_FOLDER = 'labels'

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(LABELS_FOLDER, exist_ok=True)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_image():
    image = request.files['image']
    image_path = os.path.join(UPLOAD_FOLDER, image.filename)
    image.save(image_path)
    return jsonify({"message": "Imagen subida exitosamente.", "image_url": f"/{image_path}"})

@app.route('/save', methods=['POST'])
def save_labels():
    data = request.json
    image_name = data['image']
    labels = data['labels']
    format = data['format']
    base_name = os.path.splitext(image_name)[0]

    if format == 'yolo':
        label_path = os.path.join(LABELS_FOLDER, f"{base_name}_Yolo.txt")
        with open(label_path, 'w') as f:
            for label in labels:
                if isinstance(label["bbox"], list):
                    x_min, y_min, width, height = label["bbox"]
                    x_center = (x_min + width / 2) / 800  # Cambia 800 por el ancho real
                    y_center = (y_min + height / 2) / 600  # Cambia 600 por el alto real
                    norm_width = width / 800
                    norm_height = height / 600
                    f.write(f"{label['label']} {x_center:.6f} {y_center:.6f} {norm_width:.6f} {norm_height:.6f}\n")

    elif format == 'coco':
        label_path = os.path.join(LABELS_FOLDER, f"{base_name}_COCO.json")
        coco_output = {
            "images": [{"id": 1, "file_name": image_name, "width": 800, "height": 600}],
            "annotations": [],
            "categories": []
        }

        category_map = {}
        for label in labels:
            if isinstance(label["bbox"], list):
                category_name = label["label"]
                if category_name not in category_map:
                    category_id = len(category_map) + 1
                    category_map[category_name] = category_id
                    coco_output["categories"].append({"id": category_id, "name": category_name})

                coco_output["annotations"].append({
                    "id": len(coco_output["annotations"]) + 1,
                    "image_id": 1,
                    "category_id": category_map[category_name],
                    "bbox": label["bbox"],
                    "area": label["bbox"][2] * label["bbox"][3],
                    "iscrowd": 0
                })

        with open(label_path, 'w') as f:
            json.dump(coco_output, f, indent=4)

    elif format == 'pascal':
        label_path = os.path.join(LABELS_FOLDER, f"{base_name}_PascalVoc.xml")
        pascal_output = "<annotation>\n"
        pascal_output += f"  <filename>{image_name}</filename>\n"
        pascal_output += "  <size>\n"
        pascal_output += "    <width>800</width>\n"
        pascal_output += "    <height>600</height>\n"
        pascal_output += "  </size>\n"

        for label in labels:
            if isinstance(label["bbox"], list):
                x_min, y_min, width, height = label["bbox"]
                x_max = x_min + width
                y_max = y_min + height
                pascal_output += "  <object>\n"
                pascal_output += f"    <name>{label['label']}</name>\n"
                pascal_output += "    <bndbox>\n"
                pascal_output += f"      <xmin>{int(x_min)}</xmin>\n"
                pascal_output += f"      <ymin>{int(y_min)}</ymin>\n"
                pascal_output += f"      <xmax>{int(x_max)}</xmax>\n"
                pascal_output += f"      <ymax>{int(y_max)}</ymax>\n"
                pascal_output += "    </bndbox>\n"
                pascal_output += "  </object>\n"

        pascal_output += "</annotation>"

        with open(label_path, 'w') as f:
            f.write(pascal_output)

    return jsonify({"message": f"Etiquetas guardadas exitosamente en formato {format}."})

if __name__ == '__main__':
    app.run(debug=True)
