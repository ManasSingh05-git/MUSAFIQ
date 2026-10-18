"""Extended dynamic destination directory covering Indian states and global countries with HD photos."""
import re
from sqlalchemy.orm import Session
from .models import Destination, Attraction

# Global and Indian States HD Destination Knowledge Base
# Keys can be searched by country, state, region, or city name
DYNAMIC_CATALOG = {
    "assam": {
        "slug": "kaziranga-assam",
        "name": "Kaziranga & Guwahati",
        "country": "India",
        "region": "Assam",
        "description": "Lush tea gardens, Brahmaputra riverfronts, ancient Kamakhya shrine, and Kaziranga's one-horned rhino sanctuaries.",
        "lat": 26.5775, "lon": 93.1711,
        "categories": ["nature", "heritage", "adventure"],
        "interests": ["nature", "photography", "culture", "adventure"],
        "climate": "temperate", "best_months": [11, 12, 1, 2, 3, 4], "crowd": "medium", "days": 4,
        "stay": 1400, "food": 500, "local": 300, "activities": 350,
        "info": "Kaziranga National Park is open from November to April. Elephant safaris require early booking.",
        "image_url": "https://images.unsplash.com/photo-1589308078059-be1415eab4c3?w=1200&auto=format&fit=crop&q=85",
        "attractions": [
            ("Kaziranga National Park Safari", "World-renowned sanctuary for the great Indian one-horned rhinoceros.", 26.5775, 93.1711, ["nature", "adventure"], 4, 1200, "morning", True, "https://images.unsplash.com/photo-1544979590-37e9b47eb705?w=800&auto=format&fit=crop&q=80"),
            ("Kamakhya Temple Guwahati", "Historic hilltop Shakti peeth temple overlooking the Brahmaputra.", 26.1664, 91.7052, ["culture", "history"], 2.5, 0, "morning", True, "https://images.unsplash.com/photo-1600100397608-f010f445b95c?w=800&auto=format&fit=crop&q=80"),
            ("Brahmaputra Sunset Cruise", "Scenic river cruise with dolphin sightings and island views.", 26.1850, 91.7450, ["nature", "photography"], 2, 500, "evening", False, "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80"),
        ]
    },
    "bihar": {
        "slug": "bodh-gaya-bihar",
        "name": "Bodh Gaya & Nalanda",
        "country": "India",
        "region": "Bihar",
        "description": "The cradle of Buddhism: the Mahabodhi Temple under the sacred Bodhi tree, serene international monasteries, and ancient ruins of Nalanda University.",
        "lat": 24.6961, "lon": 84.9869,
        "categories": ["heritage", "culture"],
        "interests": ["history", "culture", "photography"],
        "climate": "warm", "best_months": [10, 11, 12, 1, 2, 3], "crowd": "medium", "days": 3,
        "stay": 1100, "food": 400, "local": 250, "activities": 150,
        "info": "Respect monastery dress codes. Winter months are pleasant and hold international prayer festivals.",
        "image_url": "https://images.unsplash.com/photo-1609137144827-0cf7f98fb699?w=1200&auto=format&fit=crop&q=85",
        "attractions": [
            ("Mahabodhi Temple Complex", "UNESCO World Heritage site where Gautama Buddha attained enlightenment.", 24.6961, 84.9869, ["culture", "history"], 3, 0, "morning", True, "https://images.unsplash.com/photo-1548013146-72479768bada?w=800&auto=format&fit=crop&q=80"),
            ("Great Buddha Statue", "Majestic 80-foot stone statue of Buddha in meditation posture.", 24.6980, 84.9820, ["culture", "photography"], 1.5, 0, "afternoon", False, "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=800&auto=format&fit=crop&q=80"),
            ("Ruins of Nalanda University", "Ancient 5th-century Buddhist monastic university and museum.", 25.1357, 85.4439, ["history", "culture"], 3, 50, "morning", False, "https://images.unsplash.com/photo-1599661046827-dacff0c0f09a?w=800&auto=format&fit=crop&q=80"),
        ]
    },
    "telangana": {
        "slug": "hyderabad-telangana",
        "name": "Hyderabad",
        "country": "India",
        "region": "Telangana",
        "description": "The City of Pearls: historic Charminar, Golconda Fort ramparts, world-famous Hyderabadi biryani, and futuristic tech corridors.",
        "lat": 17.3850, "lon": 78.4867,
        "categories": ["heritage", "food", "city"],
        "interests": ["history", "food", "shopping", "photography"],
        "climate": "warm", "best_months": [10, 11, 12, 1, 2], "crowd": "high", "days": 3,
        "stay": 1300, "food": 550, "local": 300, "activities": 200,
        "info": "Metro connectivity is excellent. Try authentic Irani chai and Osmania biscuits near Charminar.",
        "image_url": "https://images.unsplash.com/photo-1605649487212-47bdab064df7?w=1200&auto=format&fit=crop&q=85",
        "attractions": [
            ("Charminar & Laad Bazaar", "16th-century landmark with 4 grand minarets and bustling bangle markets.", 17.3616, 78.4747, ["history", "shopping", "food"], 2.5, 25, "morning", True, "https://images.unsplash.com/photo-1599661046289-e31897846e41?w=800&auto=format&fit=crop&q=80"),
            ("Golconda Fort", "Acoustically remarkable medieval fortress with sunset views.", 17.3833, 78.4011, ["history", "photography"], 3, 50, "afternoon", False, "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=800&auto=format&fit=crop&q=80"),
            ("Hussain Sagar Lake & Buddha Statue", "Giant monolithic Buddha statue situated on an island in the lake.", 17.4239, 78.4738, ["photography", "nature"], 2, 100, "evening", False, "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80"),
        ]
    },
    "odisha": {
        "slug": "puri-bhubaneswar-odisha",
        "name": "Puri & Konark",
        "country": "India",
        "region": "Odisha",
        "description": "The Golden Triangle of the East: Konark Sun Temple chariot, Jagannath holy shrine, and serene golden sand beaches along the Bay of Bengal.",
        "lat": 19.8135, "lon": 85.8312,
        "categories": ["heritage", "beach", "culture"],
        "interests": ["history", "culture", "photography", "nature"],
        "climate": "tropical", "best_months": [10, 11, 12, 1, 2, 3], "crowd": "medium", "days": 3,
        "stay": 1100, "food": 450, "local": 250, "activities": 150,
        "info": "Konark Light & Sound show in the evening is recommended. Puri beach has designated safe bathing zones.",
        "image_url": "https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?w=1200&auto=format&fit=crop&q=85",
        "attractions": [
            ("Konark Sun Temple", "UNESCO World Heritage stone temple sculpted as a colossal sun chariot.", 19.8876, 86.0945, ["history", "photography"], 3, 40, "morning", True, "https://images.unsplash.com/photo-1599661046827-dacff0c0f09a?w=800&auto=format&fit=crop&q=80"),
            ("Golden Beach Puri", "Blue Flag certified beach with clean sands and morning sunrises.", 19.7983, 85.8250, ["beach", "nature"], 2, 0, "evening", False, "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80"),
            ("Chilika Lake (Satapada)", "Asia's largest brackish lagoon famous for Irrawaddy dolphins and migratory birds.", 19.6700, 85.4300, ["nature", "photography"], 4, 400, "morning", False, "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80"),
        ]
    },
    "canada": {
        "slug": "banff-canada",
        "name": "Banff & Canadian Rockies",
        "country": "Canada",
        "region": "Alberta",
        "description": "Turquoise glacial lakes, snow-capped Canadian Rocky peaks, wildlife corridors, and scenic wilderness drives.",
        "lat": 51.1784, "lon": -115.5708,
        "categories": ["mountain", "nature", "adventure"],
        "interests": ["nature", "photography", "adventure"],
        "climate": "cool", "best_months": [6, 7, 8, 9, 12, 1, 2], "crowd": "medium", "days": 5,
        "stay": 7500, "food": 3000, "local": 1000, "activities": 1200,
        "info": "National park pass required. Winter offers world-class skiing; summer is ideal for lake hiking.",
        "image_url": "https://images.unsplash.com/photo-1503614472-8c93d56e92ce?w=1200&auto=format&fit=crop&q=85",
        "attractions": [
            ("Lake Louise", "Iconic turquoise glacier lake surrounded by towering mountain peaks.", 51.4254, -116.1773, ["nature", "photography"], 3, 0, "morning", True, "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop&q=80"),
            ("Moraine Lake & Valley of the Ten Peaks", "Glacial-fed lake with striking vivid blue waters in Banff.", 51.3217, -116.1860, ["nature", "photography"], 3, 0, "morning", True, "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80"),
            ("Banff Gondola & Sulphur Mountain", "Cable car ride to 360-degree panoramic Rocky Mountain summit views.", 51.1477, -115.5562, ["adventure", "photography"], 2.5, 3500, "afternoon", False, "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&auto=format&fit=crop&q=80"),
        ]
    },
    "norway": {
        "slug": "tromso-norway",
        "name": "Tromsø & The Fjords",
        "country": "Norway",
        "region": "Troms",
        "description": "Gateway to the Arctic: ethereal Northern Lights (Aurora Borealis), deep dramatic fjords, Midnight Sun, and snow adventures.",
        "lat": 69.6492, "lon": 18.9553,
        "categories": ["nature", "adventure", "romantic"],
        "interests": ["nature", "photography", "adventure"],
        "climate": "cool", "best_months": [9, 10, 11, 12, 1, 2, 3], "crowd": "medium", "days": 4,
        "stay": 8500, "food": 3500, "local": 800, "activities": 2500,
        "info": "Pack thermal layers. Aurora activity is highest between September and March.",
        "image_url": "https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?w=1200&auto=format&fit=crop&q=85",
        "attractions": [
            ("Northern Lights Chase Tour", "Guided night expedition into dark Arctic valleys to witness the Aurora.", 69.6492, 18.9553, ["nature", "photography", "adventure"], 5, 6000, "evening", True, "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=800&auto=format&fit=crop&q=80"),
            ("Fjellheisen Cable Car", "Scenic aerial tramway offering panoramic view of Tromsø island and fjords.", 69.6416, 18.9866, ["photography", "nature"], 2, 1800, "evening", False, "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop&q=80"),
            ("Arctic Cathedral", "Striking triangular modern landmark inspired by Arctic ice formations.", 69.6480, 18.9875, ["culture", "photography"], 1.5, 500, "morning", False, "https://images.unsplash.com/photo-1548013146-72479768bada?w=800&auto=format&fit=crop&q=80"),
        ]
    },
    "south korea": {
        "slug": "seoul-south-korea",
        "name": "Seoul",
        "country": "South Korea",
        "region": "Seoul Capital Area",
        "description": "Where ancient dynastic palaces meet neon skyscrapers, K-culture, street food night markets, and serene mountain trails.",
        "lat": 37.5665, "lon": 126.9780,
        "categories": ["city", "heritage", "food"],
        "interests": ["culture", "food", "shopping", "photography", "history"],
        "climate": "temperate", "best_months": [3, 4, 5, 9, 10, 11], "crowd": "high", "days": 5,
        "stay": 5500, "food": 2200, "local": 600, "activities": 800,
        "info": "T-money transport card works for metro and buses nationwide. Autumn foliage and Spring cherry blossoms are peak seasons.",
        "image_url": "https://images.unsplash.com/photo-1538485399081-7191377e8241?w=1200&auto=format&fit=crop&q=85",
        "attractions": [
            ("Gyeongbokgung Palace", "Grand 14th-century royal palace with royal guard changing ceremony.", 37.5796, 126.9770, ["history", "culture", "photography"], 2.5, 300, "morning", True, "https://images.unsplash.com/photo-1538485399081-7191377e8241?w=800&auto=format&fit=crop&q=80"),
            ("Bukchon Hanok Village", "Preserved historic neighborhood of traditional wooden Korean houses.", 37.5826, 126.9835, ["culture", "photography"], 2, 0, "morning", False, "https://images.unsplash.com/photo-1517824806704-9040b037703b?w=800&auto=format&fit=crop&q=80"),
            ("Myeongdong Night Market", "Electric pedestrian district packed with Korean street food and skincare.", 37.5636, 126.9850, ["food", "shopping"], 3, 0, "evening", True, "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=800&auto=format&fit=crop&q=80"),
        ]
    },
    "brazil": {
        "slug": "rio-de-janeiro-brazil",
        "name": "Rio de Janeiro",
        "country": "Brazil",
        "region": "Southeast Region",
        "description": "Lush coastal mountains, world-famous Copacabana sands, samba beats, and the towering Christ the Redeemer statue.",
        "lat": -22.9068, "lon": -43.1729,
        "categories": ["beach", "nature", "city"],
        "interests": ["nature", "photography", "food", "culture", "adventure"],
        "climate": "tropical", "best_months": [12, 1, 2, 3, 4], "crowd": "high", "days": 5,
        "stay": 4500, "food": 1800, "local": 600, "activities": 900,
        "info": "Stay in Ipanema or Copacabana. Early morning visits to Christ the Redeemer avoid long queues.",
        "image_url": "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=1200&auto=format&fit=crop&q=85",
        "attractions": [
            ("Christ the Redeemer (Corcovado)", "One of the New Seven Wonders atop Corcovado mountain.", -22.9519, -43.2105, ["photography", "culture"], 3, 1500, "morning", True, "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=800&auto=format&fit=crop&q=80"),
            ("Copacabana & Ipanema Beach", "World-renowned crescent golden beaches with boardwalk cafes.", -22.9711, -43.1822, ["beach", "photography"], 3, 0, "afternoon", False, "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80"),
            ("Sugarloaf Mountain Cable Car", "Glass-walled cable car offering panoramic views across Guanabara Bay.", -22.9492, -43.1545, ["adventure", "photography"], 2.5, 2000, "evening", True, "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop&q=80"),
        ]
    },
    "new zealand": {
        "slug": "queenstown-new-zealand",
        "name": "Queenstown & Southern Lakes",
        "country": "New Zealand",
        "region": "Otago",
        "description": "Adventure capital of the world set against Lake Wakatipu and the dramatic Remarkables alpine range.",
        "lat": -45.0312, "lon": 168.6626,
        "categories": ["adventure", "mountain", "nature"],
        "interests": ["adventure", "nature", "photography"],
        "climate": "temperate", "best_months": [12, 1, 2, 3, 6, 7, 8], "crowd": "medium", "days": 5,
        "stay": 7000, "food": 2800, "local": 800, "activities": 2200,
        "info": "Milford Sound day trips depart from Queenstown. Summer is great for hiking and lake sports.",
        "image_url": "https://images.unsplash.com/photo-1507699622108-4be3abd695ad?w=1200&auto=format&fit=crop&q=85",
        "attractions": [
            ("Milford Sound Fjord Cruise", "Breathtaking fiord with sheer rock faces and cascading waterfalls.", -44.6716, 167.9256, ["nature", "photography"], 5, 4500, "morning", True, "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80"),
            ("Skyline Gondola & Luge", "Cable car to Bob's Peak with panoramic alpine lake views and downhill cart rides.", -45.0280, 168.6550, ["adventure", "photography"], 2.5, 2000, "afternoon", False, "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop&q=80"),
            ("Lake Wakatipu TSS Earnslaw Cruise", "Historic vintage steamship cruising serene alpine waters.", -45.0320, 168.6600, ["nature", "romantic"], 2, 2500, "evening", False, "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80"),
        ]
    },
    "iceland": {
        "slug": "reykjavik-iceland",
        "name": "Reykjavik & Golden Circle",
        "country": "Iceland",
        "region": "Capital Region",
        "description": "Land of fire and ice: geothermal hot springs, erupting geysers, thundering waterfalls, and black sand beaches.",
        "lat": 64.1466, "lon": -21.9426,
        "categories": ["nature", "adventure"],
        "interests": ["nature", "photography", "adventure"],
        "climate": "cool", "best_months": [5, 6, 7, 8, 9, 10], "crowd": "medium", "days": 5,
        "stay": 8500, "food": 3200, "local": 900, "activities": 2500,
        "info": "Rent a 4WD car for the Ring Road. Blue Lagoon requires reservations well in advance.",
        "image_url": "https://images.unsplash.com/photo-1504893524553-b855bce32c67?w=1200&auto=format&fit=crop&q=85",
        "attractions": [
            ("Blue Lagoon Geothermal Spa", "Famous mineral-rich warm milky-cyan waters set in lava fields.", 63.8804, -22.4495, ["nature", "romantic"], 3, 6000, "afternoon", True, "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80"),
            ("Gullfoss Waterfall & Geysir", "Mighty double-tier canyon waterfall and bubbling geothermal hot springs.", 64.3271, -20.1199, ["nature", "photography"], 4, 0, "morning", True, "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80"),
            ("Hallgrimskirkja Church", "Distinctive basalt-inspired tower with panoramic city observation deck.", 64.1417, -21.9266, ["culture", "photography"], 1.5, 600, "morning", False, "https://images.unsplash.com/photo-1548013146-72479768bada?w=800&auto=format&fit=crop&q=80"),
        ]
    }
}


def ensure_destination_for_query(q: str, db: Session) -> list[Destination]:
    """Check if query matches an unseeded state/country in the extended knowledge catalog, and seed it."""
    clean_q = q.strip().lower()
    if not clean_q or len(clean_q) < 2:
        return []

    matched = []
    for key, data in DYNAMIC_CATALOG.items():
        if key in clean_q or clean_q in data["name"].lower() or clean_q in data["country"].lower() or clean_q in data["region"].lower():
            # Check if already in DB
            existing = db.query(Destination).filter_by(slug=data["slug"]).first()
            if not existing:
                dest = Destination(
                    slug=data["slug"], name=data["name"], country=data["country"], region=data["region"],
                    description=data["description"], image_url=data["image_url"],
                    latitude=data["lat"], longitude=data["lon"], categories=data["categories"],
                    interests=data["interests"], climate=data["climate"], best_months=data["best_months"],
                    crowd_level=data["crowd"], suggested_days=data["days"], stay_per_night_inr=data["stay"],
                    food_per_day_inr=data["food"], local_transport_per_day_inr=data["local"],
                    activities_per_day_inr=data["activities"], practical_info=data["info"],
                )
                for item in data["attractions"]:
                    name, desc, lat, lon, tags, hours, fee, best, crowded, img = item
                    dest.attractions.append(Attraction(
                        name=name, description=desc, latitude=lat, longitude=lon, tags=tags,
                        duration_hours=hours, entry_fee_inr=fee, best_time=best, crowded=crowded,
                        image_url=img,
                    ))
                db.add(dest)
                db.commit()
                matched.append(dest)
            else:
                matched.append(existing)
    return matched
