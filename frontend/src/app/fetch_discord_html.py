import urllib.request
import ssl
import re
import os

url = "https://discord.com"
target_file = "/Users/shailmann/Documents/chatting-app/frontend/src/app/page.tsx"

print("Fetching live HTML from discord.com (ignoring SSL)...")
try:
    headers = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}
    req = urllib.request.Request(url, headers=headers)
    context = ssl._create_unverified_context()
    with urllib.request.urlopen(req, context=context) as response:
        html_content = response.read().decode('utf-8')
except Exception as e:
    print(f"Error fetching: {e}")
    exit(1)

print("Fetched HTML successfully. Length:", len(html_content))

# Make branding edits directly on the raw HTML string
modified_html = html_content

# 1. Replace brand name case-sensitive 'Discord' with 'Guildzee' (safely preserves lowercase 'discord' in CDNs)
modified_html = modified_html.replace("Discord", "Guildzee")

# 2. Replace primary download text in buttons
modified_html = modified_html.replace("Download for Mac", "Download for Android")
modified_html = modified_html.replace("Download for Windows", "Download for Android")
modified_html = modified_html.replace("Download for Linux", "Download for Android")

# 3. Replace the actual link attributes for download buttons to point to our APK endpoint
# Find download hrefs (e.g. href="https://discord.com/api/download?platform=osx" or similar)
modified_html = re.sub(
    r'href="https://[a-zA-Z0-9./?=-]*platform=[a-zA-Z0-9]*"',
    'href="http://localhost:4000/api/download-apk"',
    modified_html
)
modified_html = re.sub(
    r'href="/api/download[^"]*"',
    'href="http://localhost:4000/api/download-apk"',
    modified_html
)

# 4. Replace links in footer or other sections that have "/download"
modified_html = modified_html.replace('href="/download"', 'href="http://localhost:4000/api/download-apk"')

# 5. Replace login URLs to point to our login page
modified_html = modified_html.replace('href="/login"', 'href="/login"')
modified_html = modified_html.replace('href="https://discord.com/login"', 'href="/login"')

# Extract body contents
body_match = re.search(r'<body[^>]*>(.*?)</body>', modified_html, re.DOTALL | re.IGNORECASE)
if body_match:
    body_inner = body_match.group(1)
else:
    body_inner = modified_html

# Escape backticks and template string syntax for JSX literal compatibility
body_inner_escaped = body_inner.replace("`", "\\`").replace("${", "\\${")

react_code = f"""'use client';

import React from 'react';
import {{ useRouter }} from 'next/navigation';
import {{ useAuth }} from '../context/AuthContext';

export default function ExactLandingPage() {{
  const {{ token, loading }} = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {{
    setMounted(true);
  }}, []);

  React.useEffect(() => {{
    if (!mounted) return;

    // Unlock body scrolling
    document.body.style.overflow = 'auto';
    document.body.style.height = 'auto';
    document.body.style.width = 'auto';
    
    // Set custom body classes that the original Discord stylesheet relies on
    document.body.className = "body is-dark-blue";

    // Set page title
    document.title = "Guildzee - Group Chat That’s All Fun & Games";

    // Update login link dynamically to go to dashboard if token exists
    const links = document.querySelectorAll('a');
    links.forEach(link => {{
      const href = link.getAttribute('href') || '';
      if (href === '/login' || link.innerText.toLowerCase().includes('login') || link.innerText.toLowerCase().includes('open')) {{
        link.setAttribute('href', token ? '/dashboard' : '/login');
        link.addEventListener('click', (e) => {{
          e.preventDefault();
          router.push(token ? '/dashboard' : '/login');
        }});
      }}
      // Double check any missed download link is routed to our download endpoint
      if (link.innerText.toLowerCase().includes('download')) {{
        link.setAttribute('href', 'http://localhost:4000/api/download-apk');
      }}
    }});
  }}, [mounted, token, router]);

  if (!mounted) {{
    // Return placeholder matching original styling during SSR to avoid mismatch
    return (
      <div className="min-h-screen bg-[#404eed]" />
    );
  }}

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
        suppressHydrationWarning={{true}}
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
