from flask import Flask, jsonify

app = Flask(__name__)

@app.route("/")
def home():
    return jsonify({"message": "Flask server is running!"})

@app.route("/test")
def test():
    return jsonify({"message": "Test endpoint working!"})

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
