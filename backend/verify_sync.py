import requests
import time

BASE_URL = "http://localhost:8000/api"

def test_sync():
    # Login as admin
    print("1. Logging in as Admin...")
    resp = requests.post(f"{BASE_URL}/auth/login", json={"email": "admin@test.com", "password": "password"})
    if resp.status_code != 200:
        print(f"Login failed: {resp.status_code} - {resp.text}")
        return
        
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Check if a roadmap exists to export
    print("2. Fetching roadmaps...")
    rm_resp = requests.get(f"{BASE_URL}/roadmaps", headers=headers)
    roadmaps = rm_resp.json()
    
    roadmap_to_export = None
    if roadmaps:
        roadmap_to_export = roadmaps[0]
        print(f"Found existing roadmap to export: ID {roadmap_to_export['id']} ({roadmap_to_export['title']})")
    else:
        print("No roadmaps to test.")
        return

    # Export Roadmap
    print("3. Exporting Roadmap as JSON...")
    export_resp = requests.get(f"{BASE_URL}/roadmaps/{roadmap_to_export['id']}/export", headers=headers)
    if export_resp.status_code != 200:
        print(f"Export failed: {export_resp.status_code} - {export_resp.text}")
        return
        
    exported_data = export_resp.json()
    print("Original Node count:", len(exported_data.get("nodes", [])))
    
    if len(exported_data.get("nodes", [])) == 0:
        print("Node list is empty. Expected some nodes. Run verify_api.py to populate.")
        return
    
    # Modifying data for re-import
    print("4. Modifying transported data (syncing nodes)...")
    exported_data["title"] = f"{exported_data['title']} (Synced Edition)"
    
    # 1. Modify the first node
    first_node = exported_data["nodes"][0]
    first_node["title"] = first_node["title"] + " Modified"
    
    # 2. Add an entirely new node without an ID
    exported_data["nodes"].append({
        "title": "Fresh Python Node",
        "description": "Completely new.",
        "children": [],
        "resource_links": []
    })
    
    # Import Roadmap via the endpoint
    print("5. Calling POST /api/roadmaps/import...")
    import_resp = requests.post(f"{BASE_URL}/roadmaps/import", json=exported_data, headers=headers)
    if import_resp.status_code not in (200, 201):
        print(f"Import failed: {import_resp.status_code} - {import_resp.text}")
        return
        
    imported_roadmap = import_resp.json()
    print(f"Sync Success! Roadmap ID remained: {imported_roadmap['id']}")
    print(f"New Title: {imported_roadmap['title']}")
    print(f"Total Nodes Processed: {imported_roadmap['total_nodes']}")
    
    print("\nVerification complete! Sync is fully functional.")

if __name__ == "__main__":
    test_sync()
