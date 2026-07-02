import json
import re
import os

log_path = "/Users/shailmann/.gemini/antigravity/brain/52c2bd70-1755-4e35-881e-77c0d0b6f176/.system_generated/logs/transcript_full.jsonl"
target_file = "/Users/shailmann/Documents/chatting-app/frontend/src/app/page.tsx"

print("Reading transcript logs...")
html_content = ""
with open(log_path, 'r', encoding='utf-8') as f:
    for line in f:
        if "JUST COPY PASTE THIS" in line:
            try:
                data = json.loads(line)
                content = data.get("content", "")
                # Find the HTML string starting after "JUST COPY PASTE THIS"
                idx = content.find("JUST COPY PASTE THIS")
                if idx != -1:
                    raw_html = content[idx + len("JUST COPY PASTE THIS"):].strip()
                    # Strip any surrounding user request wrapper tags
                    raw_html = raw_html.replace("<USER_REQUEST>", "").replace("</USER_REQUEST>", "").strip()
                    if raw_html:
                        html_content = raw_html
            except Exception as e:
                print(f"Error parsing line: {e}")

if not html_content:
    print("Error: Could not find raw HTML block in transcript.")
    exit(1)

print("Found raw HTML block. Length:", len(html_content))

# Replace Discord branding and links to adapt for our app
# We replace the download button and open browser buttons so they lead to Guildzee services
# Let's see: download button link in Discord: usually contains "/download" or similar.
# We replace references of "Discord" with "Guildzee" and brand name adjustments where necessary.
# Also change the logo text and links:
modified_html = html_content

# Let's inspect the body tag
body_match = re.search(r'<body[^>]*>(.*?)</body>', modified_html, re.DOTALL | re.IGNORECASE)
if body_match:
    body_inner = body_match.group(1)
else:
    body_inner = modified_html

# Let's escape backticks in the HTML string so it doesn't break JSX backtick literals
body_inner_escaped = body_inner.replace("`", "\\`").replace("${", "\\${")

# We will inject a script into layout or dynamic client-side bindings to override links and names
# so that the exact HTML structure remains 100% untouched as requested by the user, but works in our app!
# For example, we can run a useEffect that finds links and replaces them:
# a[href*="discord.com"] -> local links, button actions -> download APK or open dashboard.

react_code = f"""'use client';

import React from 'react';
import {{ useRouter }} from 'next/navigation';
import {{ useAuth }} from '../context/AuthContext';

export default function ExactLandingPage() {{
  const {{ token, loading }} = useAuth();
  const router = useRouter();

  React.useEffect(() => {{
    // Unlock body scrolling
    document.body.style.overflow = 'auto';
    document.body.style.height = 'auto';
    document.body.style.width = 'auto';
    
    // Set custom body classes that the original Discord stylesheet relies on
    document.body.className = "body is-dark-blue";

    // Set page title
    document.title = "Guildzee - Group Chat That’s All Fun & Games";

    // Re-route links dynamically to keep the HTML EXACTLY matching while keeping functionality
    const links = document.querySelectorAll('a');
    links.forEach(link => {{
      const href = link.getAttribute('href') || '';
      
      // If download link, point to download-apk
      if (href.includes('/download') || href.includes('download-apk') || link.innerText.toLowerCase().includes('download')) {{
        link.setAttribute('href', 'http://localhost:4000/api/download-apk');
        // Prevent default click and download directly
        link.addEventListener('click', (e) => {{
          e.preventDefault();
          window.location.href = 'http://localhost:4000/api/download-apk';
        }});
      }}
      // If login/open in browser, point to login or dashboard
      else if (href.includes('login') || link.innerText.toLowerCase().includes('login') || link.innerText.toLowerCase().includes('open')) {{
        link.setAttribute('href', token ? '/dashboard' : '/login');
        link.addEventListener('click', (e) => {{
          e.preventDefault();
          router.push(token ? '/dashboard' : '/login');
        }});
      }}
    }});
    
    // Replace Discord logo text and references with Guildzee dynamically
    const walkNodes = (node: Node) => {{
      if (node.nodeType === Node.TEXT_NODE) {{
        if (node.nodeValue) {{
          node.nodeValue = node.nodeValue.replace(/Discord/g, 'Guildzee');
        }}
      }} else {{
        node.childNodes.forEach(walkNodes);
      }}
    }};
    walkNodes(document.body);
  }}, [token, router]);

  return (
    <>
      {{/* Load Discord Webflow and shared stylesheet directly */}}
      <link 
        href="https://cdn.prod.website-files.com/6257adef93867e50d84d30e2/css/discord-2022.shared.54d73652e.min.css" 
        rel="stylesheet" 
        type="text/css" 
      />
      <link href="https://fonts.googleapis.com" rel="preconnect" />
      <link href="https://fonts.gstatic.com" rel="preconnect" crossOrigin="anonymous" />
      
      {{/* Raw Discord layout body content */}}
      <div 
        className="page-wrapper"
        dangerouslySetInnerHTML={{{{ __html: `{body_inner_escaped}` }}}} 
      />
    </>
  );
}}
"""

print("Writing exact page component to:", target_file)
with open(target_file, 'w', encoding='utf-8') as f:
    f.write(react_code)

print("Operation completed successfully!")
