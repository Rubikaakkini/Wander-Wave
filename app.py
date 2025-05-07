from flask import Flask, request, jsonify, send_from_directory
from geopy.geocoders import Nominatim
import requests
import time

app = Flask(__name__, static_folder="static")

# Nominatim (OSM) geocoder
geolocator = Nominatim(user_agent="my_hotel_app")
rate_limit_last = 0
RATE_LIMIT_DELAY = 1.0  # seconds


def respect_rate_limit():
    global rate_limit_last
    elapsed = time.time() - rate_limit_last
    if elapsed < RATE_LIMIT_DELAY:
        time.sleep(RATE_LIMIT_DELAY - elapsed)
    rate_limit_last = time.time()


@app.route('/')
def serve_booking():
    """Serve the booking.html file."""
    return send_from_directory(app.static_folder, 'booking.html')


@app.route('/api/geocode/reverse', methods=['GET'])
def reverse_geocode():
    """Turn lat/lng into a human address"""
    lat = request.args.get('lat', type=float)
    lng = request.args.get('lng', type=float)
    if lat is None or lng is None:
        return jsonify({"error": "lat and lng required"}), 400

    try:
        respect_rate_limit()
        loc = geolocator.reverse((lat, lng), exactly_one=True)
        return jsonify({
            "display_name": loc.address,
            "lat": loc.latitude,
            "lng": loc.longitude
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/geocode/search', methods=['GET'])
def forward_geocode():
    """Turn a text query into lat/lng"""
    q = request.args.get('q')
    if not q:
        return jsonify({"error": "q parameter required"}), 400

    try:
        respect_rate_limit()
        loc = geolocator.geocode(q, exactly_one=True)
        if not loc:
            return jsonify({"error": "not found"}), 404
        return jsonify({
            "display_name": loc.address,
            "lat": loc.latitude,
            "lng": loc.longitude
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/hotels/nearby', methods=['GET'])
def nearby_hotels():
    """
    Query OSM Overpass for nearby hotels.
    GET params: lat, lng, radius (in meters, default=5000)
    """
    lat = request.args.get('lat', type=float)
    lng = request.args.get('lng', type=float)
    radius = request.args.get('radius', default=5000, type=int)
    if lat is None or lng is None:
        return jsonify({"error": "lat and lng required"}), 400

    overpass_url = "https://overpass-api.de/api/interpreter"
    query = f"""
      [out:json][timeout:25];
      (
        node["tourism"="hotel"](around:{radius},{lat},{lng});
        way["tourism"="hotel"](around:{radius},{lat},{lng});
        relation["tourism"="hotel"](around:{radius},{lat},{lng});
      );
      out center;
    """
    try:
        resp = requests.get(overpass_url, params={"data": query})
        resp.raise_for_status()
        elements = resp.json().get("elements", [])
        hotels = []
        for el in elements:
            tags = el.get("tags", {})
            # extract coords
            if el["type"] == "node":
                hlat, hlng = el["lat"], el["lon"]
            else:
                ctr = el.get("center", {})
                hlat, hlng = ctr.get("lat"), ctr.get("lon")
            hotels.append({
                "id": el["id"],
                "name": tags.get("name", "Unnamed Hotel"),
                "lat": hlat,
                "lng": hlng,
                "address": tags.get("addr:full", ""),
                "website": tags.get("website", ""),
                "tourism": tags.get("tourism", "")
            })
        return jsonify(hotels)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/route', methods=['POST'])
def get_route():
    """
    Compute driving route between user and destination.
    JSON body: { user_lat, user_lon, dest_lat, dest_lon }
    """
    data = request.get_json() or {}
    for k in ("user_lat", "user_lon", "dest_lat", "dest_lon"):
        if k not in data:
            return jsonify({"error": f"{k} required"}), 400

    ulat, ulng = data["user_lat"], data["user_lon"]
    dlat, dlng = data["dest_lat"], data["dest_lon"]

    osrm_url = (
      f"http://router.project-osrm.org/route/v1/driving/"
      f"{ulng},{ulat};{dlng},{dlat}?"
      "geometries=geojson"
    )
    try:
        resp = requests.get(osrm_url)
        resp.raise_for_status()
        rdata = resp.json()
        route = rdata["routes"][0]
        return jsonify({
            "geometry": route["geometry"],
            "distance_km": route["distance"] / 1000.0,
            "duration_min": route["duration"] / 60.0
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, port=5001)
