// script.js
const md5Input = document.getElementById('md5Input');
const checkBtn = document.getElementById('checkBtn');
const statusMsgDiv = document.getElementById('statusMsg');
const jsonPreview = document.getElementById('jsonPreview');
const unlockZone = document.getElementById('unlockZone');
const loadingIndicator = document.getElementById('loadingIndicator');

// Helper: reset UI before request
function setLoading(isLoading) {
    if (isLoading) {
        loadingIndicator.classList.remove('hidden');
        checkBtn.disabled = true;
        checkBtn.style.opacity = '0.7';
        statusMsgDiv.innerHTML = '⏳ កំពុងពិនិត្យ...';
        jsonPreview.textContent = '{ "loading": "កំពុងទំនាក់ទំនងម៉ាស៊ីនមេ..." }';
        unlockZone.classList.add('hidden');
    } else {
        loadingIndicator.classList.add('hidden');
        checkBtn.disabled = false;
        checkBtn.style.opacity = '1';
    }
}

async function performCheck() {
    const md5Value = md5Input.value.trim();
    if (!md5Value) {
        statusMsgDiv.innerHTML = '⚠️ សូមបញ្ចូល MD5';
        jsonPreview.textContent = JSON.stringify({ error: 'MD5 is empty' }, null, 2);
        unlockZone.classList.add('hidden');
        return;
    }
    // Basic MD5 format hint (32 hex)
    const md5Regex = /^[a-fA-F0-9]{32}$/;
    if (!md5Regex.test(md5Value)) {
        statusMsgDiv.innerHTML = '❌ MD5 មិនត្រឹមត្រូវទេ (ត្រូវការ 32 តួ hex)';
        jsonPreview.textContent = JSON.stringify({ error: 'Invalid MD5 format (must be 32 hex chars)' }, null, 2);
        unlockZone.classList.add('hidden');
        return;
    }

    setLoading(true);
    try {
        const apiUrl = `/api/check?md5=${encodeURIComponent(md5Value)}`;
        const response = await fetch(apiUrl);
        let responseData;
        const rawText = await response.text();
        try {
            responseData = JSON.parse(rawText);
        } catch (e) {
            responseData = { error: 'Invalid JSON from server', raw: rawText };
        }

        // Display full JSON response
        jsonPreview.textContent = JSON.stringify(responseData, null, 2);

        // Determine payment status
        const isPaid = (responseData.status === 'paid');
        
        if (response.ok && isPaid) {
            // SUCCESS: paid
            statusMsgDiv.innerHTML = '✅ ការទូទាត់បានជោគជ័យ! 🎉';
            statusMsgDiv.className = 'status-message success-text';
            // Show unlock feature simulation
            unlockZone.classList.remove('hidden');
        } 
        else if (response.ok && responseData.status === 'pending') {
            statusMsgDiv.innerHTML = '⏳ កំពុងរង់ចាំការទូទាត់...';
            statusMsgDiv.className = 'status-message pending-text';
            unlockZone.classList.add('hidden');
        }
        else if (response.ok && !isPaid && responseData.status !== 'pending') {
            // other unknown status from API
            statusMsgDiv.innerHTML = '⏳ កំពុងរង់ចាំការទូទាត់ ឬស្ថានភាពមិនច្បាស់។';
            statusMsgDiv.className = 'status-message pending-text';
            unlockZone.classList.add('hidden');
        }
        else {
            // HTTP error or proxy error
            statusMsgDiv.innerHTML = `⚠️ កំហុស: ${responseData.error || 'សេវាកម្មមិនអាចប្រើប្រាស់បាន'}`;
            statusMsgDiv.className = 'status-message error-text';
            unlockZone.classList.add('hidden');
        }

        // Special case: If response status from external API is 'paid' but response.ok false? already handled
        if (responseData.status === 'paid' && !response.ok) {
            // Override: treat as success if paid flag despite HTTP error? improbable but safe
            statusMsgDiv.innerHTML = '✅ ការទូទាត់បានជោគជ័យ! (API warning)';
            statusMsgDiv.className = 'status-message success-text';
            unlockZone.classList.remove('hidden');
        }

    } catch (error) {
        console.error('Fetch error:', error);
        statusMsgDiv.innerHTML = '💥 កំហុសបណ្តាញ សូមព្យាយាមម្តងទៀត។';
        statusMsgDiv.className = 'status-message error-text';
        jsonPreview.textContent = JSON.stringify({ fatal: error.message, note: 'Connection to backend failed' }, null, 2);
        unlockZone.classList.add('hidden');
    } finally {
        setLoading(false);
    }
}

checkBtn.addEventListener('click', performCheck);
md5Input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') performCheck();
});