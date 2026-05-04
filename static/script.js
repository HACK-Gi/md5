// static/script.js
(function() {
    const md5Input = document.getElementById('md5Input');
    const checkBtn = document.getElementById('checkBtn');
    const resultBox = document.getElementById('resultBox');
    const statusBadge = document.getElementById('statusBadge');

    let isRequesting = false;

    function setLoading(state) {
        isRequesting = state;
        if (state) {
            checkBtn.disabled = true;
            checkBtn.style.opacity = '0.7';
            statusBadge.textContent = '🔄 LOADING';
            statusBadge.style.background = 'rgba(255, 200, 0, 0.3)';
            resultBox.textContent = '⏳ កំពុងពិនិត្យ... checking MD5 hash via secure proxy...';
        } else {
            checkBtn.disabled = false;
            checkBtn.style.opacity = '1';
            if (statusBadge.textContent === '🔄 LOADING') {
                statusBadge.textContent = '';
                statusBadge.style.background = '';
            }
        }
    }

    function displayError(message, statusCode = null) {
        const errorObj = {
            status: 'error',
            message: message,
            timestamp: new Date().toISOString(),
            hint: 'Verify MD5 input or try again later'
        };
        if (statusCode) errorObj.http_code = statusCode;
        resultBox.textContent = JSON.stringify(errorObj, null, 2);
        statusBadge.textContent = statusCode ? `⚠️ ERROR ${statusCode}` : '⚠️ FAILED';
        statusBadge.style.background = 'rgba(255, 50, 50, 0.4)';
        statusBadge.style.color = '#ffb5b5';
    }

    function displayJsonResult(data, httpStatus) {
        try {
            let prettyJson;
            if (typeof data === 'object') {
                prettyJson = JSON.stringify(data, null, 2);
            } else {
                prettyJson = JSON.stringify({ raw_response: data, note: 'non-object response' }, null, 2);
            }
            resultBox.textContent = prettyJson;
            if (httpStatus >= 200 && httpStatus < 300) {
                statusBadge.textContent = `✅ SUCCESS (${httpStatus})`;
                statusBadge.style.background = 'rgba(0, 255, 170, 0.3)';
                statusBadge.style.color = '#b5ffdd';
            } else if (data && data.error) {
                statusBadge.textContent = `⚠️ API ERROR (${httpStatus})`;
                statusBadge.style.background = 'rgba(255, 100, 70, 0.35)';
            } else {
                statusBadge.textContent = `📡 RESPONSE (${httpStatus})`;
                statusBadge.style.background = 'rgba(0, 180, 255, 0.25)';
            }
        } catch (e) {
            resultBox.textContent = String(data);
            statusBadge.textContent = `⚠️ FORMAT ERROR`;
        }
    }

    async function performCheck() {
        if (isRequesting) return;
        
        const md5Value = md5Input.value.trim();
        if (md5Value === '') {
            displayError('MD5 hash cannot be empty. Please enter a valid 32-character hexadecimal string.', 400);
            resultBox.style.borderColor = '#ff4d4d80';
            setTimeout(() => { resultBox.style.borderColor = ''; }, 800);
            return;
        }
        
        if (!/^[a-fA-F0-9]{32}$/.test(md5Value)) {
            displayError('Invalid MD5 format. MD5 must be 32 hexadecimal characters (0-9, a-f).', 422);
            resultBox.style.borderColor = '#ffaa33';
            return;
        }
        
        setLoading(true);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        try {
            const response = await fetch(`/api/check?md5=${encodeURIComponent(md5Value)}`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            
            let responseData;
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                responseData = await response.json();
            } else {
                const rawText = await response.text();
                responseData = { raw_text: rawText, warning: 'non-JSON response from proxy' };
            }
            
            displayJsonResult(responseData, response.status);
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                displayError('Request timeout — backend proxy took too long to respond.', 504);
            } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                displayError('Network error: cannot reach the proxy server. Check if backend is running.', 0);
            } else {
                displayError(`Request failed: ${error.message}`, 500);
            }
        } finally {
            setLoading(false);
        }
    }

    checkBtn.addEventListener('click', performCheck);
    md5Input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !isRequesting) performCheck();
    });
    
    md5Input.addEventListener('input', () => {
        if (resultBox.textContent.includes('error') || statusBadge.textContent.includes('ERROR')) {
            statusBadge.textContent = '';
            statusBadge.style.background = '';
            if (!isRequesting) {
                resultBox.textContent = '{\n  "ready": "Enter an MD5 hash and click the button"\n}';
            }
        }
    });
})();