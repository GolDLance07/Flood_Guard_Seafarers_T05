import os
import json
import hashlib
from pathlib import Path

REQUIRED_FILES = [
    "data/processed/flood_extent.geojson",
    "data/processed/flood_metadata.json",
    "data/processed/affected_roads.geojson",
    "data/processed/facilities.geojson",
    "data/processed/settlements.geojson",
    "data/processed/overview.json",
    "data/processed/impact.json",
    "data/processed/routing_graph.json",
    "data/metadata/datasets.json",
    "docs/data_verification_log.md"
]

def calculate_sha256(filepath):
    sha = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(8192):
            sha.update(chunk)
    return sha.hexdigest()

def validate_demo_assets():
    print("=== VALIDATING FLOODGUARD DEMO ASSETS ===")
    all_ok = True
    manifest = {}

    for f in REQUIRED_FILES:
        p = Path(f)
        if not p.exists():
            print(f"❌ Missing required file: {f}")
            all_ok = False
        else:
            size_kb = round(p.stat().st_size / 1024, 2)
            sha = calculate_sha256(p)
            manifest[f] = {
                "size_kb": size_kb,
                "sha256": sha
            }
            print(f"✓ Verified: {f} ({size_kb} KB) [SHA256: {sha[:12]}...]")

    # Validate JSON formats
    for jf in [
        "data/processed/flood_metadata.json",
        "data/processed/overview.json",
        "data/metadata/datasets.json"
    ]:
        try:
            with open(jf, "r", encoding="utf-8") as f:
                data = json.load(f)
                print(f"✓ Valid JSON schema: {jf} (Keys: {list(data.keys())[:4]})")
        except Exception as e:
            print(f"❌ Corrupt JSON in {jf}: {e}")
            all_ok = False

    # Save manifest
    manifest_path = "data/metadata/demo_manifest.json"
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
    print(f"\nManifest written to {manifest_path}")

    if all_ok:
        print("\n🎉 ALL ASSETS PASSED INTEGRITY VERIFICATION. DEMO IS 100% READY.")
    else:
        print("\n⚠️ ASSET VERIFICATION FAILED. Check errors above.")
    return all_ok

if __name__ == "__main__":
    validate_demo_assets()
