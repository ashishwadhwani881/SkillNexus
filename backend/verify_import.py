import requests
import json
import time

BASE_URL = "http://localhost:8000/api"

def test_import_export():
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
        # Create a dummy roadmap if none exists
        print("No roadmaps found. Creating a dummy roadmap to export...")
        create_resp = requests.post(
            f"{BASE_URL}/roadmaps", 
            json={"title": "Test Orig", "description": "Desc", "category": "Test"}, 
            headers=headers
        )
        roadmap_to_export = create_resp.json()
        
        # Add a node
        requests.post(
            f"{BASE_URL}/roadmaps/{roadmap_to_export['id']}/nodes",
            json={"title": "Test Node", "description": "Node Desc", "position": 0},
            headers=headers
        )
        print(f"Created roadmap ID {roadmap_to_export['id']}")

    # Export Roadmap
    print("3. Exporting Roadmap as JSON...")
    export_resp = requests.get(f"{BASE_URL}/roadmaps/{roadmap_to_export['id']}/export", headers=headers)
    if export_resp.status_code != 200:
        print(f"Export failed: {export_resp.status_code} - {export_resp.text}")
        return
        
    exported_data = export_resp.json()
    print("Exported Data Keys:", list(exported_data.keys()))
    print("Original Title:", exported_data.get("title"))
    
    # Modify data for re-import
    print("4. Modifying transported data (changing title)...")
    exported_data["title"] = f"{exported_data['title']} (Imported Copy {int(time.time())})"
    
    # Import Roadmap via the new endpoint
    print("5. Calling POST /api/roadmaps/import...")
    import_resp = requests.post(f"{BASE_URL}/roadmaps/import", json=exported_data, headers=headers)
    if import_resp.status_code != 201:
        print(f"Import failed: {import_resp.status_code} - {import_resp.text}")
        return
        
    imported_roadmap = import_resp.json()
    print(f"Import Success! New Roadmap ID: {imported_roadmap['id']}")
    print(f"New Title: {imported_roadmap['title']}")
    print(f"Total Nodes: {imported_roadmap['total_nodes']}")
    
    print("\nVerification complete! Backend import/export is fully functional.")

if __name__ == "__main__":
    test_import_export()
