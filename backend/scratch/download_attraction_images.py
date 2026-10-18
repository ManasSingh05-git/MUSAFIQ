"""Download real HD photos for attractions into frontend/public/images/attractions/."""
import os
import re
import urllib.request

ATTRACTION_IMAGES = {
    # Goa
    "goa_0": ("Baga Beach", "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80"),
    "goa_1": ("Fort Aguada", "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=800&auto=format&fit=crop&q=80"),
    "goa_2": ("Basilica of Bom Jesus", "https://images.unsplash.com/photo-1588096344356-9b62646c07aa?w=800&auto=format&fit=crop&q=80"),
    "goa_3": ("Fontainhas Latin Quarter", "https://images.unsplash.com/photo-1590523277543-a94d2e4eb00b?w=800&auto=format&fit=crop&q=80"),
    "goa_4": ("Anjuna Beach", "https://images.unsplash.com/photo-1519046904884-53103b34b206?w=800&auto=format&fit=crop&q=80"),

    # Lonavala
    "lonavala_0": ("Karla Caves", "https://images.unsplash.com/photo-1600100397608-f010f445b95c?w=800&auto=format&fit=crop&q=80"),
    "lonavala_1": ("Bhushi Dam", "https://images.unsplash.com/photo-1518457607834-6e8d80c183c5?w=800&auto=format&fit=crop&q=80"),
    "lonavala_2": ("Tiger's Point", "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop&q=80"),
    "lonavala_3": ("Lohagad Fort", "https://images.unsplash.com/photo-1508873696983-2df5293cbdaf?w=800&auto=format&fit=crop&q=80"),

    # Manali
    "manali_0": ("Hadimba Devi Temple", "https://images.unsplash.com/photo-1605649487212-47bdab064df7?w=800&auto=format&fit=crop&q=80"),
    "manali_1": ("Solang Valley", "https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?w=800&auto=format&fit=crop&q=80"),
    "manali_2": ("Old Manali", "https://images.unsplash.com/photo-1517824806704-9040b037703b?w=800&auto=format&fit=crop&q=80"),
    "manali_3": ("Vashisht Village", "https://images.unsplash.com/photo-1544979590-37e9b47eb705?w=800&auto=format&fit=crop&q=80"),
    "manali_4": ("Rohtang Pass", "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&auto=format&fit=crop&q=80"),

    # Rishikesh
    "rishikesh_0": ("Laxman Jhula", "https://images.unsplash.com/photo-1609137144827-0cf7f98fb699?w=800&auto=format&fit=crop&q=80"),
    "rishikesh_1": ("Ram Jhula & Parmarth Niketan", "https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?w=800&auto=format&fit=crop&q=80"),
    "rishikesh_2": ("Triveni Ghat Ganga Aarti", "https://images.unsplash.com/photo-1561361513-2d000a50f0dc?w=800&auto=format&fit=crop&q=80"),
    "rishikesh_3": ("Beatles Ashram", "https://images.unsplash.com/photo-1548013146-72479768bada?w=800&auto=format&fit=crop&q=80"),
    "rishikesh_4": ("River rafting stretch", "https://images.unsplash.com/photo-1530866495561-507c9faab2ed?w=800&auto=format&fit=crop&q=80"),

    # Udaipur
    "udaipur_0": ("City Palace", "https://images.unsplash.com/photo-1615836245337-f5b9b2303f10?w=800&auto=format&fit=crop&q=80"),
    "udaipur_1": ("Lake Pichola boat ride", "https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?w=800&auto=format&fit=crop&q=80"),
    "udaipur_2": ("Saheliyon ki Bari", "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=800&auto=format&fit=crop&q=80"),
    "udaipur_3": ("Sajjangarh Monsoon Palace", "https://images.unsplash.com/photo-1572979241482-297ba093f330?w=800&auto=format&fit=crop&q=80"),
    "udaipur_4": ("Bagore Ki Haveli", "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=800&auto=format&fit=crop&q=80"),

    # Jaipur
    "jaipur_0": ("Amber Fort", "https://images.unsplash.com/photo-1599661046827-dacff0c0f09a?w=800&auto=format&fit=crop&q=80"),
    "jaipur_1": ("Hawa Mahal", "https://images.unsplash.com/photo-1603288967396-18751509b5cb?w=800&auto=format&fit=crop&q=80"),
    "jaipur_2": ("City Palace Jaipur", "https://images.unsplash.com/photo-1599661046289-e31897846e41?w=800&auto=format&fit=crop&q=80"),
    "jaipur_3": ("Jantar Mantar", "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=800&auto=format&fit=crop&q=80"),
    "jaipur_4": ("Nahargarh Fort sunset point", "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop&q=80"),
    "jaipur_5": ("Johari Bazaar", "https://images.unsplash.com/photo-1517824806704-9040b037703b?w=800&auto=format&fit=crop&q=80"),

    # Munnar
    "munnar_0": ("Tea Museum, Munnar", "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=800&auto=format&fit=crop&q=80"),
    "munnar_1": ("Mattupetty Dam", "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80"),
    "munnar_2": ("Top Station", "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop&q=80"),
    "munnar_3": ("Eravikulam National Park", "https://images.unsplash.com/photo-1511497584788-87676104235f?w=800&auto=format&fit=crop&q=80"),

    # Pondicherry
    "pondicherry_0": ("Promenade Beach", "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80"),
    "pondicherry_1": ("French Quarter (White Town)", "https://images.unsplash.com/photo-1589308078059-be1415eab4c3?w=800&auto=format&fit=crop&q=80"),
    "pondicherry_2": ("Sri Aurobindo Ashram", "https://images.unsplash.com/photo-1548013146-72479768bada?w=800&auto=format&fit=crop&q=80"),
    "pondicherry_3": ("Auroville & Matrimandir", "https://images.unsplash.com/photo-1600100397608-f010f445b95c?w=800&auto=format&fit=crop&q=80"),

    # Hampi
    "hampi_0": ("Virupaksha Temple", "https://images.unsplash.com/photo-1548013146-72479768bada?w=800&auto=format&fit=crop&q=80"),
    "hampi_1": ("Vittala Temple & Stone Chariot", "https://images.unsplash.com/photo-1620766182966-c6eb5ed2b788?w=800&auto=format&fit=crop&q=80"),
    "hampi_2": ("Hemakuta Hill sunset", "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop&q=80"),
    "hampi_3": ("Lotus Mahal & Royal Enclosure", "https://images.unsplash.com/photo-1599661046827-dacff0c0f09a?w=800&auto=format&fit=crop&q=80"),

    # Mumbai
    "mumbai_0": ("Gateway of India", "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=800&auto=format&fit=crop&q=80"),
    "mumbai_1": ("Marine Drive Promenade", "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=800&auto=format&fit=crop&q=80"),
    "mumbai_2": ("Elephanta Caves", "https://images.unsplash.com/photo-1600100397608-f010f445b95c?w=800&auto=format&fit=crop&q=80"),

    # Shimla
    "shimla_0": ("The Ridge & Mall Road", "https://images.unsplash.com/photo-1597074866923-dc0589150358?w=800&auto=format&fit=crop&q=80"),
    "shimla_1": ("Jakhoo Hill & Hanuman Temple", "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop&q=80"),
    "shimla_2": ("Kufri Adventure Valley", "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&auto=format&fit=crop&q=80"),

    # Srinagar
    "srinagar_0": ("Dal Lake Shikara Ride", "https://images.unsplash.com/photo-1595815771614-ade9d652a65d?w=800&auto=format&fit=crop&q=80"),
    "srinagar_1": ("Nishat & Shalimar Mughal Gardens", "https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?w=800&auto=format&fit=crop&q=80"),
    "srinagar_2": ("Gulmarg Gondola", "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&auto=format&fit=crop&q=80"),

    # Ladakh
    "ladakh_0": ("Pangong Tso Lake", "https://images.unsplash.com/photo-1581793745862-99fde7fa73d2?w=800&auto=format&fit=crop&q=80"),
    "ladakh_1": ("Thiksey Monastery", "https://images.unsplash.com/photo-1548013146-72479768bada?w=800&auto=format&fit=crop&q=80"),
    "ladakh_2": ("Khardung La Pass", "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop&q=80"),

    # Agra
    "agra_0": ("Taj Mahal", "https://images.unsplash.com/photo-1564507592333-c60657eea523?w=800&auto=format&fit=crop&q=80"),
    "agra_1": ("Agra Fort", "https://images.unsplash.com/photo-1599661046827-dacff0c0f09a?w=800&auto=format&fit=crop&q=80"),
    "agra_2": ("Mehtab Bagh", "https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?w=800&auto=format&fit=crop&q=80"),

    # Varanasi
    "varanasi_0": ("Dashashwamedh Ghat Evening Aarti", "https://images.unsplash.com/photo-1561361513-2d000a50f0dc?w=800&auto=format&fit=crop&q=80"),
    "varanasi_1": ("Kashi Vishwanath Temple", "https://images.unsplash.com/photo-1548013146-72479768bada?w=800&auto=format&fit=crop&q=80"),
    "varanasi_2": ("Ganges Sunrise Boat Ride", "https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?w=800&auto=format&fit=crop&q=80"),

    # Amritsar
    "amritsar_0": ("Golden Temple", "https://images.unsplash.com/photo-1514222134-b57cbb8ce073?w=800&auto=format&fit=crop&q=80"),
    "amritsar_1": ("Wagah Border Beating Retreat", "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=800&auto=format&fit=crop&q=80"),
    "amritsar_2": ("Jallianwala Bagh Memorial", "https://images.unsplash.com/photo-1548013146-72479768bada?w=800&auto=format&fit=crop&q=80"),

    # Kyoto
    "kyoto_0": ("Fushimi Inari Taisha", "https://images.unsplash.com/photo-1478436127897-769e00d0c715?w=800&auto=format&fit=crop&q=80"),
    "kyoto_1": ("Kinkaku-ji (Golden Pavilion)", "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=800&auto=format&fit=crop&q=80"),
    "kyoto_2": ("Kiyomizu-dera", "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&auto=format&fit=crop&q=80"),
    "kyoto_3": ("Arashiyama Bamboo Grove", "https://images.unsplash.com/photo-1528164344705-475426879c0d?w=800&auto=format&fit=crop&q=80"),
    "kyoto_4": ("Gion district", "https://images.unsplash.com/photo-1517824806704-9040b037703b?w=800&auto=format&fit=crop&q=80"),

    # Bali
    "bali_0": ("Pura Ulun Danu Beratan", "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&auto=format&fit=crop&q=80"),
    "bali_1": ("Tegallalang Rice Terrace", "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=800&auto=format&fit=crop&q=80"),
    "bali_2": ("Sacred Monkey Forest Sanctuary", "https://images.unsplash.com/photo-1511497584788-87676104235f?w=800&auto=format&fit=crop&q=80"),
    "bali_3": ("Tanah Lot", "https://images.unsplash.com/photo-1555400038-63f5ba517a47?w=800&auto=format&fit=crop&q=80"),

    # Cappadocia
    "cappadocia_0": ("Goreme Open Air Museum", "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=800&auto=format&fit=crop&q=80"),
    "cappadocia_1": ("Uchisar Castle", "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop&q=80"),
    "cappadocia_2": ("Pigeon Valley walk", "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80"),

    # Paris
    "paris_0": ("Eiffel Tower", "https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?w=800&auto=format&fit=crop&q=80"),
    "paris_1": ("Louvre Museum", "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=800&auto=format&fit=crop&q=80"),
    "paris_2": ("Notre-Dame Cathedral & Seine", "https://images.unsplash.com/photo-1478860409698-8707f313ee8b?w=800&auto=format&fit=crop&q=80"),

    # Swiss Alps
    "swiss-alps_0": ("Mount Titlis", "https://images.unsplash.com/photo-1502784444187-359ac186c5bb?w=800&auto=format&fit=crop&q=80"),
    "swiss-alps_1": ("Chapel Bridge Lucerne", "https://images.unsplash.com/photo-1527631746610-bca00a040d60?w=800&auto=format&fit=crop&q=80"),
    "swiss-alps_2": ("Lake Lucerne Cruise", "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80"),

    # Dubai
    "dubai_0": ("Burj Khalifa", "https://images.unsplash.com/photo-1580674684081-7617fbf3d745?w=800&auto=format&fit=crop&q=80"),
    "dubai_1": ("Desert Safari & Dune Bashing", "https://images.unsplash.com/photo-1451337516015-6b6e9a44a8a3?w=800&auto=format&fit=crop&q=80"),
    "dubai_2": ("Dubai Mall & Fountain Show", "https://images.unsplash.com/photo-1518684079-3c830dcef090?w=800&auto=format&fit=crop&q=80"),

    # Rome
    "rome_0": ("Colosseum", "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800&auto=format&fit=crop&q=80"),
    "rome_1": ("Vatican Museums", "https://images.unsplash.com/photo-1531572753322-ad063cecc140?w=800&auto=format&fit=crop&q=80"),
    "rome_2": ("Trevi Fountain", "https://images.unsplash.com/photo-1525874684015-58379d421a52?w=800&auto=format&fit=crop&q=80"),

    # New York
    "new-york_0": ("Times Square", "https://images.unsplash.com/photo-1506146332389-18140dc7b2fb?w=800&auto=format&fit=crop&q=80"),
    "new-york_1": ("Central Park", "https://images.unsplash.com/photo-1534430480872-3498386e7856?w=800&auto=format&fit=crop&q=80"),
    "new-york_2": ("Statue of Liberty", "https://images.unsplash.com/photo-1605130284535-11dd9eedc5b3?w=800&auto=format&fit=crop&q=80"),

    # Bangkok
    "bangkok_0": ("Grand Palace", "https://images.unsplash.com/photo-1563492065561-36d319a84a61?w=800&auto=format&fit=crop&q=80"),
    "bangkok_1": ("Wat Arun", "https://images.unsplash.com/photo-1528181304800-259b08848526?w=800&auto=format&fit=crop&q=80"),
    "bangkok_2": ("Chatuchak Weekend Market", "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80"),
}

def main():
    target_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "public", "images", "attractions"))
    os.makedirs(target_dir, exist_ok=True)
    print(f"Target directory for attractions: {target_dir}")

    success = 0
    for key, (name, url) in ATTRACTION_IMAGES.items():
        file_path = os.path.join(target_dir, f"{key}.jpg")
        if os.path.exists(file_path) and os.path.getsize(file_path) > 1000:
            print(f"[SKIP] {key}.jpg exists ({os.path.getsize(file_path)} bytes)")
            success += 1
            continue
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=10) as resp, open(file_path, "wb") as f:
                f.write(resp.read())
            print(f"[OK] Downloaded {key}.jpg ({name}) - {os.path.getsize(file_path)} bytes")
            success += 1
        except Exception as e:
            print(f"[ERR] Failed {key} ({name}): {e}")

    print(f"\nDone! {success}/{len(ATTRACTION_IMAGES)} attraction photos saved locally.")

if __name__ == "__main__":
    main()
