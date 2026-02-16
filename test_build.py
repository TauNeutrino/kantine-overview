import os
import sys

DIST_DIR = os.path.join(os.path.dirname(__file__), 'dist')
INSTALL_HTML = os.path.join(DIST_DIR, 'install.html')
BOOKMARKLET_TXT = os.path.join(DIST_DIR, 'bookmarklet.txt')
STANDALONE_HTML = os.path.join(DIST_DIR, 'kantine-standalone.html')

def check_file_exists(path, description):
    if not os.path.exists(path):
        print(f"❌ MISSING: {description} ({path})")
        return False
    # Check if not empty
    if os.path.getsize(path) == 0:
        print(f"❌ EMPTY: {description} ({path})")
        return False
    print(f"✅ FOUND: {description}")
    return True

def check_content(path, must_contain=[], must_not_contain=[]):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    success = True
    for item in must_contain:
        if item not in content:
            print(f"❌ MISSING CONTENT: '{item}' in {os.path.basename(path)}")
            success = False
    
    for item in must_not_contain:
        if item in content:
            print(f"❌ FORBIDDEN CONTENT: '{item}' in {os.path.basename(path)}")
            success = False
            
    if success:
        print(f"✅ CONTENT VERIFIED: {os.path.basename(path)}")
    return success

def main():
    print("=== Running Build Tests ===")
    
    # 1. Existence Check
    if not all([
        check_file_exists(INSTALL_HTML, "Installer HTML"),
        check_file_exists(BOOKMARKLET_TXT, "Bookmarklet Text"),
        check_file_exists(STANDALONE_HTML, "Standalone HTML")
    ]):
        sys.exit(1)

    # 2. Bookmarklet Logic Check
    # Must have the CSS injection fix from the external AI
    # Must have correct versioning
    # Must be properly URL encoded (checking for common issues)
    
    # Read bookmarklet code (decoded mostly by being in txt? No, txt is usually the raw URL)
    with open(BOOKMARKLET_TXT, 'r') as f:
        bm_code = f.read().strip()

    if not bm_code.startswith("javascript:"):
        print("❌ Bookmarklet does not start with 'javascript:'")
        sys.exit(1)

    # Check for placeholder leftovers
    if not check_content(BOOKMARKLET_TXT, 
                         must_contain=["document.createElement('style')", "M1", "M2"], 
                         must_not_contain=["{{VERSION}}", "{{CSS_ESCAPED}}"]):
        sys.exit(1)

    # Check for CSS injection specific logic
    if "document.head.appendChild(s)" not in bm_code and "appendChild(s)" not in bm_code: # URL encoded might mask this, strictly checking decoded would be better but simple check first
         # Actually bm_code is URL encoded. We should decode it to verify logic.
         import urllib.parse
         decoded = urllib.parse.unquote(bm_code)
         if "document.createElement('style')" not in decoded:
             print("❌ CSS Injection logic missing in bookmarklet")
             sys.exit(1)
         print("✅ CSS Injection logic confirmed")

    # 3. Installer Check
    if not check_content(INSTALL_HTML, 
                         must_contain=["Kantine Wrapper", "So funktioniert's", "changelog-container"],
                         must_not_contain=["CHANGELOG_HTML_PLACEHOLDER"]): # If we used that
        sys.exit(1)
        
    print("🎉 ALL TESTS PASSED")
    sys.exit(0)

if __name__ == "__main__":
    main()
