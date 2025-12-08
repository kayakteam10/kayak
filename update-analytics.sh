#!/bin/bash
cd /Users/spartan/Downloads/KayakSimulation/frontend/src/pages/admin

# Add the import
sed -i '' '7 a\
import ProviderAnalytics from '"'"'./ProviderAnalytics'"'"';\
' AdminAnalytics.js

# Add activeTab state after line 13
sed -i '' '13 a\
    const [activeTab, setActiveTab] = useState('"'"'revenue'"'"');\
' AdminAnalytics.js

# Add tabs after line 221 (adding 2 for the edits above = 223)
sed -i '' '$223 a\
\
            {/* Tab Navigation */}\
            <div className="analytics-tabs">\
                <button \
                    className={`analytics-tab ${activeTab === '"'"'revenue'"'"' ? '"'"'active'"'"' : '"'"''"'"'}`}\
                    onClick={() => setActiveTab('"'"'revenue'"'"')}\
                >\
                    💰 Revenue & Bookings\
                </button>\
                <button \
                    className={`analytics-tab ${activeTab === '"'"'provider'"'"' ? '"'"'active'"'"' : '"'"''"'"'}`}\
                    onClick={() => setActiveTab('"'"'provider'"'"')}\
                >\
                    📊 Provider Analytics\
                </button>\
            </div>\
\
            {activeTab === '"'"'revenue'"'"' && (\
            <>\
' AdminAnalytics.js

# Add closing tags and Provider Analytics before last closing div (line 479)
sed -i '' '479 i\
            </>\
            )}\
\
            {/* Provider Analytics Tab */}\
            {activeTab === '"'"'provider'"'"' && <ProviderAnalytics />}\
' AdminAnalytics.js

echo "✅ Updated AdminAnalytics.js with tabs!"
