# app.py
import os
import re
import requests
from flask import Flask, request, jsonify, Response

app = Flask(__name__)

# ========== HELPER: Validate MD5 ==========
def is_valid_md5(md5_string):
    return bool(re.match(r'^[a-fA-F0-9]{32}$', md5_string))

# ========== SERVE STATIC FILES ==========
def read_file_content(file_name, content_type):
    try:
        with open(file_name, 'r', encoding='utf-8') as f:
            return Response(f.read(), mimetype=content_type)
    except Exception:
        return Response("File not found", status=404)

@app.route('/style.css')
def serve_css():
    return read_file_content('style.css', 'text/css')

@app.route('/script.js')
def serve_js():
    return read_file_content('script.js', 'application/javascript')

def serve_index():
    return read_file_content('index.html', 'text/html')

# ========== API ENDPOINT: Proxy to external API ==========
@app.route('/api/check', methods=['GET'])
def check_md5():
    md5_param = request.args.get('md5', '').strip()

    # Validate MD5 format
    if not md5_param:
        return jsonify({"error": "Missing MD5 parameter"}), 400
    if not is_valid_md5(md5_param):
        return jsonify({"error": "Invalid MD5 format. Must be 32 hex characters."}), 400

    external_url = f"https://anajak.site/bakong/api/check?md5={md5_param}"
    try:
        # Forward request to external API with timeout
        resp = requests.get(external_url, timeout=10)
        resp.raise_for_status()  # Raise HTTPError for bad responses (4xx or 5xx)

        # Return exact JSON from external API
        return jsonify(resp.json()), resp.status_code

    except requests.exceptions.Timeout:
        return jsonify({"error": "External API timeout", "status": "timeout"}), 504
    except requests.exceptions.ConnectionError:
        return jsonify({"error": "Connection error to payment gateway", "status": "unreachable"}), 502
    except requests.exceptions.HTTPError as e:
        return jsonify({"error": f"External API error: {e.response.status_code}", "status": "http_error"}), 502
    except Exception as e:
        return jsonify({"error": f"Internal proxy error: {str(e)}", "status": "proxy_error"}), 500

# ========== CATCH-ALL ROUTE (serve index.html for SPA fallback) ==========
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def catch_all(path):
    # Avoid interfering with API routes and static files (already handled above)
    if path.startswith('api/') or path in ['style.css', 'script.js']:
        return jsonify({"error": "Not found"}), 404
    return serve_index()

# ========== VERCEL REQUIRES NO app.run() ==========
# The application object 'app' is used by Vercel