(function() {
    const script = document.currentScript;
    const apiKey = script.getAttribute('data-key');
    const apiUrl = 'https://' + window.location.host + '/api/v1/leads'; // Default to same host

    const showToast = (message, type = 'success') => {
        let container = document.getElementById('leadsmind-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'leadsmind-toast-container';
            container.style.cssText = 'position: fixed; bottom: 24px; right: 24px; z-index: 9999; display: flex; flex-direction: column; gap: 12px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        const bgColor = type === 'success' ? '#10B981' : '#EF4444';
        toast.style.cssText = 'background-color: #0c1020; color: #dde4ff; border: 1px solid ' + bgColor + '; padding: 14px 20px; border-radius: 12px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5); display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 500; min-width: 250px; transform: translateY(20px); opacity: 0; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);';

        const icon = document.createElement('span');
        icon.style.cssText = 'display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 50%; background-color: ' + bgColor + '; color: #fff; font-size: 12px; font-weight: bold; flex-shrink: 0;';
        icon.innerHTML = type === 'success' ? '&#10003;' : '&#10007;';

        const text = document.createElement('span');
        text.innerText = message;

        toast.appendChild(icon);
        toast.appendChild(text);
        container.appendChild(toast);

        requestAnimationFrame(() => {
            toast.style.transform = 'translateY(0)';
            toast.style.opacity = '1';
        });

        setTimeout(() => {
            toast.style.transform = 'translateY(-20px)';
            toast.style.opacity = '0';
            setTimeout(() => {
                toast.remove();
                if (container.children.length === 0) {
                    container.remove();
                }
            }, 300);
        }, 4000);
    };

    // Support for multiple forms on one page
    const initForm = (form) => {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(form);
            const data = {
                email: formData.get('email'),
                first_name: formData.get('first_name') || formData.get('firstName'),
                last_name: formData.get('last_name') || formData.get('lastName'),
                phone: formData.get('phone') || formData.get('phoneNumber'),
                source: window.location.origin,
                metadata: {
                    url: window.location.href,
                    userAgent: navigator.userAgent,
                    referrer: document.referrer
                }
            };

            const submitBtn = form.querySelector('[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.dataset.originalText = submitBtn.innerText;
                submitBtn.innerText = 'Processing...';
            }

            try {
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': apiKey
                    },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (result.success) {
                    // Custom success event
                    const event = new CustomEvent('leadsmind-success', { detail: result });
                    form.dispatchEvent(event);
                    
                    if (submitBtn) {
                        submitBtn.innerText = 'Success!';
                        submitBtn.style.backgroundColor = '#10b981';
                    }
                    
                    // Reset form after delay
                    setTimeout(() => {
                        form.reset();
                        if (submitBtn) {
                            submitBtn.disabled = false;
                            submitBtn.innerText = submitBtn.dataset.originalText;
                            submitBtn.style.backgroundColor = '';
                        }
                    }, 2000);
                } else {
                    throw new Error(result.error || 'Failed to submit lead');
                }
            } catch (err) {
                console.error('LeadsMind Error:', err);
                showToast('Error: ' + err.message, 'error');
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerText = submitBtn.dataset.originalText;
                }
            }
        });
    };

    // Find all forms with data-leadsmind-form attribute
    const forms = document.querySelectorAll('[data-leadsmind-form]');
    forms.forEach(initForm);

    console.log('LeadsMind CRM Integration Active');
})();
