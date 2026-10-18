"""Download accurate, real HD photos for all destinations and attractions into frontend/public/images."""
import os
import urllib.request
import urllib.error

DEST_IMAGES = {
    "goa": "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=1200&auto=format&fit=crop&q=85",
    "lonavala": "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&auto=format&fit=crop&q=85",
    "manali": "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=1200&auto=format&fit=crop&q=85",
    "rishikesh": "https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?w=1200&auto=format&fit=crop&q=85",
    "udaipur": "https://images.unsplash.com/photo-1599661046289-e31897846e41?w=1200&auto=format&fit=crop&q=85",
    "jaipur": "https://images.unsplash.com/photo-1477587458883-47145ed94245?w=1200&auto=format&fit=crop&q=85",
    "munnar": "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=1200&auto=format&fit=crop&q=85",
    "pondicherry": "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=1200&auto=format&fit=crop&q=85",
    "hampi": "https://images.unsplash.com/photo-1600100397608-f010f445b95c?w=1200&auto=format&fit=crop&q=85",
    "mumbai": "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=1200&auto=format&fit=crop&q=85",
    "shimla": "https://images.unsplash.com/photo-1597074866923-dc0589150358?w=1200&auto=format&fit=crop&q=85",
    "srinagar": "https://images.unsplash.com/photo-1595815771614-ade9d652a65d?w=1200&auto=format&fit=crop&q=85",
    "ladakh": "https://images.unsplash.com/photo-1581793745862-99fde7fa73d2?w=1200&auto=format&fit=crop&q=85",
    "agra": "https://images.unsplash.com/photo-1564507592333-c60657eea523?w=1200&auto=format&fit=crop&q=85",
    "varanasi": "https://images.unsplash.com/photo-1561361513-2d000a50f0dc?w=1200&auto=format&fit=crop&q=85",
    "amritsar": "https://images.unsplash.com/photo-1609137144827-0cf7f98fb699?w=1200&auto=format&fit=crop&q=85",
    "kyoto": "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1200&auto=format&fit=crop&q=85",
    "bali": "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1200&auto=format&fit=crop&q=85",
    "cappadocia": "https://images.unsplash.com/photo-1641128324571-a53f34f66bb1?w=1200&auto=format&fit=crop&q=85",
    "paris": "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1200&auto=format&fit=crop&q=85",
    "swiss-alps": "https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?w=1200&auto=format&fit=crop&q=85",
    "dubai": "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1200&auto=format&fit=crop&q=85",
    "rome": "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=1200&auto=format&fit=crop&q=85",
    "new-york": "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=1200&auto=format&fit=crop&q=85",
    "bangkok": "https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=1200&auto=format&fit=crop&q=85",
    "kaziranga-assam": "https://images.unsplash.com/photo-1589308078059-be1415eab4c3?w=1200&auto=format&fit=crop&q=85",
    "bodh-gaya-bihar": "https://images.unsplash.com/photo-1609137144827-0cf7f98fb699?w=1200&auto=format&fit=crop&q=85",
    "hyderabad-telangana": "https://images.unsplash.com/photo-1605649487212-47bdab064df7?w=1200&auto=format&fit=crop&q=85",
    "puri-bhubaneswar-odisha": "https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?w=1200&auto=format&fit=crop&q=85",
    "banff-canada": "https://images.unsplash.com/photo-1503614472-8c93d56e92ce?w=1200&auto=format&fit=crop&q=85",
    "tromso-norway": "https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?w=1200&auto=format&fit=crop&q=85",
    "seoul-south-korea": "https://images.unsplash.com/photo-1538485399081-7191377e8241?w=1200&auto=format&fit=crop&q=85",
    "rio-de-janeiro-brazil": "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=1200&auto=format&fit=crop&q=85",
    "queenstown-new-zealand": "https://images.unsplash.com/photo-1507699622108-4be3abd695ad?w=1200&auto=format&fit=crop&q=85",
    "reykjavik-iceland": "https://images.unsplash.com/photo-1504893524553-b855bce32c67?w=1200&auto=format&fit=crop&q=85",
}

def main():
    target_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "public", "images"))
    os.makedirs(target_dir, exist_ok=True)
    print(f"Target directory: {target_dir}")

    success_count = 0
    for slug, url in DEST_IMAGES.items():
        file_path = os.path.join(target_dir, f"{slug}.jpg")
        if os.path.exists(file_path) and os.path.getsize(file_path) > 1000:
            print(f"[SKIP] {slug}.jpg exists ({os.path.getsize(file_path)} bytes)")
            success_count += 1
            continue
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=10) as resp, open(file_path, "wb") as f:
                f.write(resp.read())
            print(f"[OK] Downloaded {slug}.jpg ({os.path.getsize(file_path)} bytes)")
            success_count += 1
        except Exception as e:
            print(f"[ERR] Failed {slug}: {e}")

    print(f"\nDone! {success_count}/{len(DEST_IMAGES)} images saved successfully.")

if __name__ == "__main__":
    main()
