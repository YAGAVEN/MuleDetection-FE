#!/bin/bash

echo "════════════════════════════════════════════════════════════════"
echo "  GitHub Repository Verification Checklist"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Check 1: Git initialized
echo "✓ Check 1: Git Repository Status"
if [ -d ".git" ]; then
    echo "  ✅ Git repository initialized"
    git status --short | head -5
    echo "  ..."
else
    echo "  ❌ Git not initialized. Run: git init"
fi
echo ""

# Check 2: Gitignore exists
echo "✓ Check 2: .gitignore Configuration"
if [ -f ".gitignore" ]; then
    echo "  ✅ .gitignore exists"
    echo "  Size: $(wc -c < .gitignore) bytes"
    echo "  Rules:"
    grep -v "^#" .gitignore | grep -v "^$" | head -5
    echo "  ... ($(grep -v '^#' .gitignore | grep -v '^$' | wc -l) total rules)"
else
    echo "  ❌ .gitignore not found"
fi
echo ""

# Check 3: Python files present
echo "✓ Check 3: Python Pipeline Scripts"
python_files=$(find Mule-data/ -name "*.py" -type f 2>/dev/null | wc -l)
echo "  Found $python_files Python files"
find Mule-data/ -name "*pipeline.py" -type f 2>/dev/null | sed 's/^/    - /'
echo ""

# Check 4: Documentation present
echo "✓ Check 4: Documentation Files"
doc_files=$(find . -maxdepth 1 -name "*.md" -o -name "*.txt" | grep -v "node_modules" | wc -l)
echo "  Found $doc_files documentation files"
ls -1 *.md *.txt 2>/dev/null | sed 's/^/    - /'
echo ""

# Check 5: Large files that should be ignored
echo "✓ Check 5: Large Files (Should NOT be pushed)"
echo "  CSV files:"
find Mule-data/ -name "*.csv" -type f 2>/dev/null | sed 's/^/    - /'
echo "  PKL files:"
find Mule-data/ -name "*.pkl" -type f 2>/dev/null | sed 's/^/    - /'
echo "  PT files:"
find Mule-data/ -name "*.pt" -type f 2>/dev/null | sed 's/^/    - /'
echo ""

# Check 6: Folder structure
echo "✓ Check 6: Required Folders"
folders=("Mule-data" "prompts" "reports" "scripts")
for folder in "${folders[@]}"; do
    if [ -d "$folder" ]; then
        echo "  ✅ $folder/ exists"
    else
        echo "  ❌ $folder/ missing"
    fi
done
echo ""

# Check 7: Key files present
echo "✓ Check 7: Key Files"
files=(
    "LICENSE"
    ".gitignore"
    "COMBINED_PIPELINES_README.md"
    "EXECUTION_SUMMARY.txt"
)
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✅ $file"
    else
        echo "  ❌ $file (missing)"
    fi
done
echo ""

# Check 8: Repository size estimate
echo "✓ Check 8: Repository Size Estimate"
echo "  Calculating..."
code_size=$(find . -name "*.py" -o -name "*.md" -o -name "*.txt" | xargs du -ch 2>/dev/null | tail -1)
echo "  Code/docs size: $code_size"
total_size=$(du -sh . 2>/dev/null | cut -f1)
echo "  Total directory: $total_size"
echo "  (After push: ~300 KB - 1 MB)"
echo ""

# Check 9: Git configuration
echo "✓ Check 9: Git Configuration"
user=$(git config user.name 2>/dev/null)
email=$(git config user.email 2>/dev/null)
if [ -n "$user" ] && [ -n "$email" ]; then
    echo "  ✅ User: $user"
    echo "  ✅ Email: $email"
else
    echo "  ⚠️  Git user not configured. Run:"
    echo "      git config user.name \"Your Name\""
    echo "      git config user.email \"your.email@example.com\""
fi
echo ""

# Check 10: Remote setup
echo "✓ Check 10: Remote Repository"
if git remote -v 2>/dev/null | grep -q origin; then
    echo "  ✅ Remote 'origin' configured:"
    git remote -v | grep origin
else
    echo "  ⚠️  No remote configured. Run:"
    echo "      git remote add origin https://github.com/YOUR-USERNAME/repo-name.git"
fi
echo ""

echo "════════════════════════════════════════════════════════════════"
echo "  ✅ Verification Complete"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "  Next Steps:"
echo "  1. pip freeze > requirements.txt"
echo "  2. git add ."
echo "  3. git commit -m 'Initial commit: ML pipelines'"
echo "  4. git push -u origin main"
echo ""
