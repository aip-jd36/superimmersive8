// ============================
// Submit Form JavaScript
// ============================

document.addEventListener('DOMContentLoaded', function() {

    // Initialize
    initializeForm();
    initializeToolRows();
    initializeFileUploads();
    initializeWordCounter();
    initializeProgressTracking();
    initializeConditionalFields();
    initializeFormValidation();

    // ============================
    // Form Initialization
    // ============================

    function initializeForm() {
        const form = document.getElementById('submitForm');

        form.addEventListener('submit', async function(e) {
            e.preventDefault();

            if (validateForm()) {
                await submitForm();
            }
        });
    }

    // ============================
    // Dynamic Tool Rows
    // ============================

    let toolCount = 0;

    function initializeToolRows() {
        const addToolBtn = document.getElementById('add-tool-btn');
        const toolsContainer = document.getElementById('tools-container');

        // Add first tool row by default
        addToolRow();

        addToolBtn.addEventListener('click', addToolRow);
    }

    function addToolRow() {
        toolCount++;
        const toolsContainer = document.getElementById('tools-container');

        const toolRow = document.createElement('div');
        toolRow.className = 'tool-row';
        toolRow.dataset.toolId = toolCount;

        toolRow.innerHTML = `
            <div>
                <label>Tool Name <span class="required">*</span></label>
                <input type="text" name="tool_name_${toolCount}" placeholder="e.g., Runway, Sora, Kling" required>
            </div>
            <div>
                <label>Version/Model <span class="required">*</span></label>
                <input type="text" name="tool_version_${toolCount}" placeholder="e.g., Gen-3 Alpha" required>
            </div>
            <div>
                <label>Plan Type <span class="required">*</span></label>
                <input type="text" name="tool_plan_${toolCount}" placeholder="e.g., Paid - Unlimited Plan" required>
            </div>
            <button type="button" class="remove-tool-btn" onclick="removeToolRow(${toolCount})">×</button>
        `;

        toolsContainer.appendChild(toolRow);
    }

    window.removeToolRow = function(toolId) {
        const toolRow = document.querySelector(`[data-tool-id="${toolId}"]`);
        if (toolRow && toolCount > 1) {
            toolRow.remove();
        } else {
            alert('You must have at least one tool listed.');
        }
    };

    // ============================
    // File Upload Handling
    // ============================

    function initializeFileUploads() {
        // Receipts upload
        setupFileUpload('receipts-upload', 'receipts', 'receipts-list');

        // Supporting docs upload
        setupFileUpload('supporting-docs-upload', 'supporting_docs', 'supporting-docs-list');
    }

    function setupFileUpload(zoneId, inputId, listId) {
        const zone = document.getElementById(zoneId);
        const input = document.getElementById(inputId);
        const list = document.getElementById(listId);

        // Click to browse
        zone.addEventListener('click', () => input.click());

        // File input change
        input.addEventListener('change', function(e) {
            handleFiles(this.files, listId);
        });

        // Drag and drop
        zone.addEventListener('dragover', (e) => {
            e.preventDefault();
            zone.classList.add('drag-over');
        });

        zone.addEventListener('dragleave', () => {
            zone.classList.remove('drag-over');
        });

        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.classList.remove('drag-over');
            handleFiles(e.dataTransfer.files, listId);
        });
    }

    const uploadedFiles = {
        'receipts-list': [],
        'supporting-docs-list': []
    };

    function handleFiles(files, listId) {
        const fileArray = Array.from(files);

        fileArray.forEach(file => {
            // Validate file
            if (!validateFile(file)) {
                return;
            }

            // Add to uploaded files
            uploadedFiles[listId].push(file);

            // Display in list
            displayFile(file, listId);
        });
    }

    function validateFile(file) {
        const maxSize = 50 * 1024 * 1024; // 50MB
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];

        if (file.size > maxSize) {
            alert(`File "${file.name}" is too large. Maximum size is 50MB.`);
            return false;
        }

        if (!allowedTypes.includes(file.type)) {
            alert(`File "${file.name}" has invalid type. Only PDF, JPG, and PNG files are allowed.`);
            return false;
        }

        return true;
    }

    function displayFile(file, listId) {
        const list = document.getElementById(listId);
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.dataset.fileName = file.name;

        const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);

        fileItem.innerHTML = `
            <div class="file-item-name">
                <span>📎</span>
                <span>${file.name}</span>
                <span class="file-item-size">(${sizeInMB} MB)</span>
            </div>
            <button type="button" class="file-item-remove" onclick="removeFile('${file.name}', '${listId}')">×</button>
        `;

        list.appendChild(fileItem);
    }

    window.removeFile = function(fileName, listId) {
        // Remove from uploaded files array
        uploadedFiles[listId] = uploadedFiles[listId].filter(f => f.name !== fileName);

        // Remove from display
        const fileItem = document.querySelector(`[data-file-name="${fileName}"]`);
        if (fileItem) {
            fileItem.remove();
        }
    };

    // ============================
    // Word Counter
    // ============================

    function initializeWordCounter() {
        const textarea = document.getElementById('authorship_declaration');
        const counter = document.getElementById('word-count');

        textarea.addEventListener('input', function() {
            const text = this.value.trim();
            const words = text ? text.split(/\s+/).length : 0;

            counter.textContent = words;

            const wordCountDiv = counter.parentElement;
            if (words >= 150) {
                wordCountDiv.classList.add('valid');
                wordCountDiv.classList.remove('invalid');
            } else {
                wordCountDiv.classList.add('invalid');
                wordCountDiv.classList.remove('valid');
            }
        });
    }

    // ============================
    // Progress Tracking
    // ============================

    function initializeProgressTracking() {
        const sections = document.querySelectorAll('.form-section');

        sections.forEach((section, index) => {
            const inputs = section.querySelectorAll('input[required], textarea[required], select[required]');

            inputs.forEach(input => {
                input.addEventListener('change', () => updateProgress());
                input.addEventListener('blur', () => updateProgress());
            });
        });
    }

    function updateProgress() {
        const sections = document.querySelectorAll('.form-section');

        sections.forEach((section, index) => {
            const sectionNum = index + 1;
            const requiredInputs = section.querySelectorAll('input[required], textarea[required], select[required]');
            const progressItem = document.querySelector(`[data-section="${sectionNum}"]`);

            let allFilled = true;
            requiredInputs.forEach(input => {
                if (input.type === 'radio' || input.type === 'checkbox') {
                    const name = input.name;
                    const checked = section.querySelector(`input[name="${name}"]:checked`);
                    if (!checked) allFilled = false;
                } else {
                    if (!input.value.trim()) allFilled = false;
                }
            });

            if (allFilled) {
                progressItem.classList.add('complete');
                progressItem.querySelector('.progress-icon').textContent = '✓';
            } else {
                progressItem.classList.remove('complete');
                progressItem.querySelector('.progress-icon').textContent = '○';
            }
        });

        // Enable/disable submit button
        updateSubmitButton();
    }

    function updateSubmitButton() {
        const submitBtn = document.getElementById('submit-btn');
        const allSections = document.querySelectorAll('.progress-list li');
        const completedSections = document.querySelectorAll('.progress-list li.complete');

        if (completedSections.length === allSections.length) {
            submitBtn.disabled = false;
        } else {
            submitBtn.disabled = true;
        }
    }

    // ============================
    // Conditional Fields
    // ============================

    function initializeConditionalFields() {
        // Show music tool field when "Original AI" is selected
        const musicSourceRadios = document.querySelectorAll('input[name="audio_music_source"]');
        musicSourceRadios.forEach(radio => {
            radio.addEventListener('change', function() {
                const toolGroup = document.getElementById('audio_music_tool_group');
                if (this.value === 'Original AI') {
                    toolGroup.style.display = 'block';
                } else {
                    toolGroup.style.display = 'none';
                }
            });
        });

        // Show tier 2 scenes field when "Yes scenes" is selected
        const tier2Radios = document.querySelectorAll('input[name="tier2_enrollment"]');
        tier2Radios.forEach(radio => {
            radio.addEventListener('change', function() {
                const scenesGroup = document.getElementById('tier2_scenes_group');
                if (this.value === 'Yes scenes') {
                    scenesGroup.style.display = 'block';
                } else {
                    scenesGroup.style.display = 'none';
                }
            });
        });
    }

    // ============================
    // Form Validation
    // ============================

    function initializeFormValidation() {
        const form = document.getElementById('submitForm');
        const inputs = form.querySelectorAll('input, textarea, select');

        inputs.forEach(input => {
            input.addEventListener('blur', function() {
                validateField(this);
            });
        });
    }

    function validateField(field) {
        const formGroup = field.closest('.form-group');
        if (!formGroup) return;

        // Remove existing error/success classes
        formGroup.classList.remove('error', 'success');

        // Remove existing error message
        const existingError = formGroup.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }

        // Validate
        if (field.hasAttribute('required') && !field.value.trim()) {
            showFieldError(formGroup, 'This field is required');
            return false;
        }

        if (field.type === 'email' && field.value) {
            if (!validateEmail(field.value)) {
                showFieldError(formGroup, 'Please enter a valid email address');
                return false;
            }
        }

        if (field.type === 'url' && field.value) {
            if (!validateURL(field.value)) {
                showFieldError(formGroup, 'Please enter a valid URL');
                return false;
            }
        }

        // Word count validation for authorship
        if (field.id === 'authorship_declaration') {
            const words = field.value.trim().split(/\s+/).length;
            if (words < 150) {
                showFieldError(formGroup, `Minimum 150 words required (current: ${words})`);
                return false;
            }
        }

        // Show success
        formGroup.classList.add('success');
        return true;
    }

    function showFieldError(formGroup, message) {
        formGroup.classList.add('error');
        const errorMsg = document.createElement('span');
        errorMsg.className = 'error-message';
        errorMsg.textContent = message;
        formGroup.appendChild(errorMsg);
    }

    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    function validateURL(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    function validateForm() {
        let isValid = true;
        const form = document.getElementById('submitForm');
        const inputs = form.querySelectorAll('input[required], textarea[required], select[required]');

        inputs.forEach(input => {
            if (!validateField(input)) {
                isValid = false;
            }
        });

        // Check if at least one tool is added
        if (toolCount === 0) {
            alert('Please add at least one AI tool used in production');
            isValid = false;
        }

        // Check if receipts are uploaded
        if (uploadedFiles['receipts-list'].length === 0) {
            alert('Please upload at least one tool receipt');
            isValid = false;
        }

        return isValid;
    }

    // ============================
    // Form Submission
    // ============================

    async function submitForm() {
        const submitBtn = document.getElementById('submit-btn');
        const btnText = submitBtn.querySelector('.btn-text');
        const btnSpinner = submitBtn.querySelector('.btn-spinner');

        // Show loading state
        submitBtn.disabled = true;
        btnText.style.display = 'none';
        btnSpinner.style.display = 'inline';

        try {
            // Collect form data
            const formData = await collectFormData();

            // Send to API endpoint
            const response = await fetch('/api/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Submission failed');
            }

            // Store email in localStorage for confirmation page
            localStorage.setItem('submitterEmail', formData.filmmaker.email);

            // Success! Redirect to confirmation page
            window.location.href = `confirmation.html?id=${result.submissionId}`;

        } catch (error) {
            console.error('Submission error:', error);
            alert(`Submission error: ${error.message}\n\nPlease try again or contact jd@superimmersive8.com if the problem persists.`);
        } finally {
            // Reset button state
            submitBtn.disabled = false;
            btnText.style.display = 'inline';
            btnSpinner.style.display = 'none';
        }
    }

    async function collectFormData() {
        const form = document.getElementById('submitForm');
        const formData = new FormData(form);

        // Collect tools data
        const tools = [];
        for (let i = 1; i <= toolCount; i++) {
            const toolRow = document.querySelector(`[data-tool-id="${i}"]`);
            if (toolRow) {
                tools.push({
                    name: formData.get(`tool_name_${i}`),
                    version: formData.get(`tool_version_${i}`),
                    plan: formData.get(`tool_plan_${i}`)
                });
            }
        }

        // Convert files to base64 data URLs
        const receiptsDataUrls = await convertFilesToDataUrls(uploadedFiles['receipts-list']);
        const supportingDocsDataUrls = await convertFilesToDataUrls(uploadedFiles['supporting-docs-list']);

        // Collect all form fields
        const data = {
            filmmaker: {
                name: formData.get('filmmaker_name'),
                email: formData.get('filmmaker_email'),
                location: formData.get('filmmaker_location'),
                portfolio: formData.get('filmmaker_portfolio'),
                priorWorks: formData.get('prior_works'),
                firstSubmission: formData.get('first_submission') === 'on'
            },
            production: {
                title: formData.get('title'),
                runtime: formData.get('runtime'),
                genre: formData.get('genre'),
                logline: formData.get('logline'),
                intendedUse: formData.get('intended_use'),
                productionStart: formData.get('production_start'),
                productionEnd: formData.get('production_end'),
                existingAgreements: formData.get('existing_agreements')
            },
            tools: tools,
            authorship: {
                declaration: formData.get('authorship_declaration')
            },
            likeness: {
                notes: formData.get('likeness_notes')
            },
            ip: {
                notes: formData.get('ip_notes')
            },
            audio: {
                musicSource: formData.get('audio_music_source'),
                musicTool: formData.get('audio_music_tool'),
                soundDesign: formData.get('audio_sound_design'),
                voiceover: formData.get('audio_voiceover')
            },
            tier2: {
                enrollment: formData.get('tier2_enrollment'),
                scenes: formData.get('tier2_scenes')
            },
            territory: {
                preference: formData.get('territory_preference'),
                restrictions: formData.get('territory_restrictions'),
                exclusivity: formData.get('exclusivity_preference')
            },
            files: {
                videoUrl: formData.get('video_url'),
                videoPassword: formData.get('video_password'),
                receipts: receiptsDataUrls,
                supportingDocs: supportingDocsDataUrls
            }
        };

        return data;
    }

    // Convert files to base64 data URLs for Airtable
    async function convertFilesToDataUrls(files) {
        const dataUrls = [];

        for (const file of files) {
            const dataUrl = await fileToDataUrl(file);
            dataUrls.push({ dataUrl: dataUrl, name: file.name });
        }

        return dataUrls;
    }

    function fileToDataUrl(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

});
