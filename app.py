# app.py
from flask import Flask, request, jsonify, render_template
import requests
from requests.exceptions import Timeout, ConnectionError

app = Flask(__name__, static_folder='static', template_folder='templates')

EXTERNAL_API_URL = "https://anajak.site/bakong/api/check"
REQUEST_TIMEOUT = 10

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/check', methods=['GET'])
def check_md5():
    md5_hash = request.args.get('md5')
    
    if not md5_hash or not md5_hash.strip():
        return jsonify({"error": "Missing MD5 parameter", "message": "Please provide a valid MD5 hash"}), 400
    
    try:
        response = requests.get(
            EXTERNAL_API_URL,
            params={'md5': md5_hash.strip()},
            timeout=REQUEST_TIMEOUT
        )
        
        try:
            data = response.json()
        except ValueError:
            data = {"raw_response": response.text, "error": "Non-JSON response from external API"}
        
        return jsonify(data), response.status_code
    
    except Timeout:
        return jsonify({"error": "Request timeout", "message": "External API did not respond in time"}), 504
    except ConnectionError:
        return jsonify({"error": "Connection failed", "message": "Cannot reach external API service"}), 503
    except Exception as e:
        return jsonify({"error": "Internal proxy error", "message": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)