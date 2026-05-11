(function() {
    const script = document.currentScript;
    const apiKey = script.getAttribute('data-key');
    const apiUrl = 'https://' + window.location.host + '/api/v1/leads'; // Default to same host

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
                alert('Error: ' + err.message);
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
