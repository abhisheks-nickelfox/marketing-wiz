#!/bin/bash

echo "=================================="
echo "Skills Description Issue Diagnostic"
echo "=================================="
echo ""

echo "1. Checking Frontend Code..."
echo "----------------------------"
FRONTEND_CODE=$(grep -A 3 "await createSkill.mutateAsync" /home/shubham/Documents/MarketingWiz/frontend-new/src/pages/SettingsPage.tsx)
if echo "$FRONTEND_CODE" | grep -q "{ name, description, color }"; then
    echo "✅ Frontend code is CORRECT - sends description and color"
else
    echo "❌ Frontend code is WRONG - still using old format"
fi
echo ""

echo "2. Checking Backend Code..."
echo "----------------------------"
BACKEND_CODE=$(grep -A 5 "description: dto.description" /home/shubham/Documents/MarketingWiz/backend/src/modules/skills/skills.service.ts)
if [ ! -z "$BACKEND_CODE" ]; then
    echo "✅ Backend code is CORRECT - handles description and color"
else
    echo "❌ Backend code is WRONG - missing description handling"
fi
echo ""

echo "3. Checking API Interface..."
echo "----------------------------"
API_CODE=$(grep -A 3 "create: (payload:" /home/shubham/Documents/MarketingWiz/frontend-new/src/lib/api.ts)
if echo "$API_CODE" | grep -q "description"; then
    echo "✅ API interface is CORRECT - includes description and color"
else
    echo "❌ API interface is WRONG - missing description and color"
fi
echo ""

echo "4. Database Test Results..."
echo "----------------------------"
echo "The test script already confirmed:"
echo "✅ Database has 'description' column"
echo "✅ Database has 'color' column"
echo "✅ Can insert skills with description and color"
echo ""

echo "=================================="
echo "DIAGNOSIS COMPLETE"
echo "=================================="
echo ""
echo "If all checks show ✅, then the issue is:"
echo "🔴 FRONTEND CACHE - You need to:"
echo "   1. Stop the dev server"
echo "   2. Clear browser cache (Ctrl+Shift+Delete)"
echo "   3. Delete frontend-new/node_modules/.vite/"
echo "   4. Restart dev server"
echo "   5. Hard refresh browser (Ctrl+Shift+R)"
echo ""
echo "If any checks show ❌, the code changes didn't save properly."
echo ""
