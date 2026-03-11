// ============================
// Submit Form JavaScript
// ============================

console.log('✅ submit.js loaded');

document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ DOM ready, initializing form...');

    // ============================
    // Variables
    // ============================

    let toolCount = 0;
    const uploadedFiles = {
        'receipts-list': [],
        'supporting-docs-list': [],
        'likeness-docs-list': [],
        'ip-docs-list': []
    };

    // Cloudinary uploaded URLs (store URLs instead of files)
    const cloudinaryUrls = {
        'receipts-list': [],
        'supporting-docs-list': [],
        'likeness-docs-list': [],
        'ip-docs-list': [],
        'catalog-thumbnail': null
    };

    // Cloudinary configuration
    const CLOUDINARY_CLOUD_NAME = 'de9xcgbbw'; // SI8 cloud name
    const CLOUDINARY_UPLOAD_PRESET = 'si8_catalog'; // Unsigned preset

    // ============================
    // Cloudinary Upload
    // ============================

    async function uploadToCloudinary(file, folder = 'si8-submissions') {
        console.log(`🔵 Uploading to Cloudinary: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        formData.append('folder', folder);

        try {
            const response = await fetch(
                `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`,
                {
                    method: 'POST',
                    body: formData
                }
            );

            if (!response.ok) {
                throw new Error(`Cloudinary upload failed: ${response.statusText}`);
            }

            const data = await response.json();
            console.log(`✅ Uploaded to Cloudinary: ${data.secure_url}`);
            return data.secure_url;

        } catch (error) {
            console.error('🔴 Cloudinary upload error:', error);
            throw error;
        }
    }

    // ============================
    // Initialize
    // ============================

    initializeForm();
    initializeToolRows();
    initializeFileUploads();
    setupThumbnailUpload(); // Initialize catalog thumbnail upload
    initializeWordCounter();
    initializeProgressTracking();
    initializeConditionalFields();
    initializeFormValidation();
    // setupTestDataButton(); // DISABLED for production - see line ~1040 for re-enable instructions

    console.log('✅ All initializations complete');

    // ============================
    // Form Initialization
    // ============================

    function initializeForm() {
        const form = document.getElementById('submitForm');

        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            console.log('🔵 Form submit event triggered');

            const isValid = validateForm();
            console.log('🔵 Form validation result:', isValid);

            if (isValid) {
                console.log('🔵 Starting form submission...');
                await submitForm();
            } else {
                console.log('🔴 Form validation failed');
            }
        });
    }

    // ============================
    // Dynamic Tool Rows
    // ============================

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

        // Catalog thumbnail upload (with preview)
        setupThumbnailUpload();
    }

    function setupThumbnailUpload() {
        const zone = document.getElementById('catalog-thumbnail-upload');
        const input = document.getElementById('catalog_thumbnail');
        const preview = document.getElementById('catalog-thumbnail-preview');

        if (!zone || !input || !preview) return;

        // Click to browse
        zone.addEventListener('click', () => input.click());

        // File input change
        input.addEventListener('change', async function(e) {
            if (this.files && this.files[0]) {
                const file = this.files[0];

                // Display preview with "uploading" status
                displayThumbnailPreview(file, preview, 'uploading');

                try {
                    // Upload to Cloudinary
                    const cloudinaryUrl = await uploadToCloudinary(file, 'si8-catalog-thumbnails');

                    // Store URL
                    cloudinaryUrls['catalog-thumbnail'] = cloudinaryUrl;

                    // Update preview to "uploaded" status
                    displayThumbnailPreview(file, preview, 'uploaded');

                    // Trigger validation update
                    this.dispatchEvent(new Event('blur'));

                } catch (error) {
                    console.error('Failed to upload thumbnail:', error);
                    displayThumbnailPreview(file, preview, 'error');
                    alert('Failed to upload thumbnail. Please try again.');
                }
            }
        });

        // Drag and drop
        zone.addEventListener('dragover', (e) => {
            e.preventDefault();
            zone.classList.add('drag-over');
        });

        zone.addEventListener('dragleave', () => {
            zone.classList.remove('drag-over');
        });

        zone.addEventListener('drop', async (e) => {
            e.preventDefault();
            zone.classList.remove('drag-over');
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                const file = e.dataTransfer.files[0];

                // Set files using DataTransfer (proper way)
                const dt = new DataTransfer();
                dt.items.add(file);
                input.files = dt.files;

                // Show uploading preview
                displayThumbnailPreview(file, preview, 'uploading');

                try {
                    // Upload to Cloudinary
                    const cloudinaryUrl = await uploadToCloudinary(file, 'si8-catalog-thumbnails');
                    cloudinaryUrls['catalog-thumbnail'] = cloudinaryUrl;
                    console.log('✅ Catalog thumbnail uploaded to Cloudinary:', cloudinaryUrl);

                    // Update preview to show success
                    displayThumbnailPreview(file, preview, 'uploaded');

                    // Trigger validation update
                    input.dispatchEvent(new Event('blur'));
                } catch (error) {
                    console.error('❌ Catalog thumbnail upload failed:', error);
                    displayThumbnailPreview(file, preview, 'error');
                    alert(`Failed to upload thumbnail: ${error.message}`);
                }
            }
        });
    }

    function displayThumbnailPreview(file, preview, status = 'uploading') {
        // Validate file type
        if (!file.type.match('image/(jpeg|jpg|png)')) {
            alert('Please upload a JPG or PNG image.');
            return;
        }

        // Validate file size (5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('Image must be under 5MB.');
            return;
        }

        // Status indicators
        const statusIcon = status === 'uploading' ? '⏳' : status === 'uploaded' ? '✅' : '❌';
        const statusText = status === 'uploading' ? 'Uploading...' : status === 'uploaded' ? 'Uploaded' : 'Upload failed';
        const statusColor = status === 'uploading' ? '#818cf8' : status === 'uploaded' ? '#10b981' : '#ef4444';

        // Create preview
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.innerHTML = `
                <img src="${e.target.result}" alt="Catalog thumbnail preview" style="opacity: ${status === 'uploading' ? '0.6' : '1'};">
                <p style="margin-top: 8px; font-size: 0.875rem; color: #666;">
                    ${file.name} (${(file.size / 1024).toFixed(0)} KB)
                </p>
                <p style="margin-top: 4px; font-size: 0.875rem; color: ${statusColor}; font-weight: 500;">
                    ${statusIcon} ${statusText}
                </p>
            `;
        };
        reader.readAsDataURL(file);
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

    async function handleFiles(files, listId) {
        const fileArray = Array.from(files);

        for (const file of fileArray) {
            // Validate file
            if (!validateFile(file)) {
                continue;
            }

            // Add to uploaded files (for display)
            uploadedFiles[listId].push(file);

            // Display in list with "uploading" status
            const fileId = displayFile(file, listId, 'uploading');

            try {
                // Upload to Cloudinary
                const cloudinaryUrl = await uploadToCloudinary(file, 'si8-submissions');

                // Store Cloudinary URL
                cloudinaryUrls[listId].push({
                    filename: file.name,
                    url: cloudinaryUrl
                });

                // Update display to "uploaded" status
                updateFileStatus(fileId, 'uploaded');

            } catch (error) {
                console.error(`Failed to upload ${file.name}:`, error);
                updateFileStatus(fileId, 'error');
                alert(`Failed to upload ${file.name}. Please try again.`);
            }
        }
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

    function displayFile(file, listId, status = 'uploading') {
        const list = document.getElementById(listId);
        const fileItem = document.createElement('div');
        const fileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        fileItem.className = 'file-item';
        fileItem.id = fileId;
        fileItem.dataset.fileName = file.name;
        fileItem.dataset.status = status;

        const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);

        const statusIcon = status === 'uploading' ? '⏳' : status === 'uploaded' ? '✅' : '❌';
        const statusText = status === 'uploading' ? 'Uploading...' : status === 'uploaded' ? 'Uploaded' : 'Failed';

        fileItem.innerHTML = `
            <div class="file-item-name">
                <span class="file-status-icon">${statusIcon}</span>
                <span>${file.name}</span>
                <span class="file-item-size">(${sizeInMB} MB)</span>
                <span class="file-status-text" style="font-size: 0.875rem; color: ${status === 'error' ? '#ef4444' : '#666'};">${statusText}</span>
            </div>
            <button type="button" class="file-item-remove" onclick="removeFile('${fileId}', '${file.name}', '${listId}')" ${status === 'uploading' ? 'disabled' : ''}>×</button>
        `;

        list.appendChild(fileItem);
        return fileId;
    }

    function updateFileStatus(fileId, status) {
        const fileItem = document.getElementById(fileId);
        if (!fileItem) return;

        const statusIcon = status === 'uploading' ? '⏳' : status === 'uploaded' ? '✅' : '❌';
        const statusText = status === 'uploading' ? 'Uploading...' : status === 'uploaded' ? 'Uploaded' : 'Failed';

        const statusIconEl = fileItem.querySelector('.file-status-icon');
        const statusTextEl = fileItem.querySelector('.file-status-text');
        const removeBtn = fileItem.querySelector('.file-item-remove');

        if (statusIconEl) statusIconEl.textContent = statusIcon;
        if (statusTextEl) {
            statusTextEl.textContent = statusText;
            statusTextEl.style.color = status === 'error' ? '#ef4444' : '#666';
        }
        if (removeBtn && status !== 'uploading') {
            removeBtn.disabled = false;
        }

        fileItem.dataset.status = status;
    }

    window.removeFile = function(fileId, fileName, listId) {
        // Remove from uploaded files array
        uploadedFiles[listId] = uploadedFiles[listId].filter(f => f.name !== fileName);

        // Remove from Cloudinary URLs array
        cloudinaryUrls[listId] = cloudinaryUrls[listId].filter(f => f.filename !== fileName);

        // Remove from display
        const fileItem = document.getElementById(fileId);
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

        console.log(`🔵 Progress: ${completedSections.length}/${allSections.length} sections complete`);

        if (completedSections.length === allSections.length) {
            submitBtn.disabled = false;
            console.log('✅ Submit button ENABLED');
        } else {
            submitBtn.disabled = true;
            console.log('🔴 Submit button DISABLED');
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

        // NEW: Show/hide underlying rights details
        const underlyingRights = document.getElementById('underlying_rights');
        if (underlyingRights) {
            // Initialize on page load
            const initialValue = underlyingRights.value;
            if (initialValue === 'original') {
                document.getElementById('underlying_rights_source').required = false;
                document.getElementById('underlying_rights_holder').required = false;
                document.getElementById('underlying_rights_permission').required = false;
            }

            underlyingRights.addEventListener('change', function() {
                const container = document.getElementById('underlying_rights_details_container');
                const isAdapted = this.value === 'adapted';
                container.style.display = isAdapted ? 'block' : 'none';

                // Update required status
                document.getElementById('underlying_rights_source').required = isAdapted;
                document.getElementById('underlying_rights_holder').required = isAdapted;
                document.getElementById('underlying_rights_permission').required = isAdapted;
            });
        }

        // NEW: Show/hide third-party asset details
        const thirdPartyCheckboxes = document.querySelectorAll('[name^="third_party_"]');

        // Initialize on page load - if no boxes checked, field not required
        const initiallyChecked = Array.from(thirdPartyCheckboxes).some(cb => cb.checked);
        if (!initiallyChecked) {
            document.getElementById('third_party_details').required = false;
        }

        thirdPartyCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                const anyChecked = Array.from(thirdPartyCheckboxes).some(cb => cb.checked);
                const container = document.getElementById('third_party_details_container');
                container.style.display = anyChecked ? 'block' : 'none';
                document.getElementById('third_party_details').required = anyChecked;
            });
        });

        // NEW: Show/hide licensed likenesses container
        const likenessRadios = document.querySelectorAll('[name="likeness_status"]');

        // Initialize on page load - set required to false if "none" is selected
        const selectedLikenessRadio = document.querySelector('[name="likeness_status"]:checked');
        if (selectedLikenessRadio && selectedLikenessRadio.value === 'none') {
            document.getElementById('licensed_likenesses_details').required = false;
            document.getElementById('licensed_likenesses_docs').required = false;
        }

        likenessRadios.forEach(radio => {
            radio.addEventListener('change', function() {
                const container = document.getElementById('licensed_likenesses_container');
                const isLicensed = this.value === 'licensed';
                container.style.display = isLicensed ? 'block' : 'none';

                // Update required status
                document.getElementById('licensed_likenesses_details').required = isLicensed;
                document.getElementById('licensed_likenesses_docs').required = isLicensed;
            });
        });

        // NEW: Show/hide licensed IP containers
        const ipRadios = document.querySelectorAll('[name="ip_status"]');

        // Initialize on page load - set required to false if "none" is selected
        const selectedIpRadio = document.querySelector('[name="ip_status"]:checked');
        if (selectedIpRadio && selectedIpRadio.value === 'none') {
            document.getElementById('licensed_ip_details').required = false;
            document.getElementById('licensed_ip_docs').required = false;
            document.getElementById('fair_use_reasoning').required = false;
        }

        ipRadios.forEach(radio => {
            radio.addEventListener('change', function() {
                const licensedContainer = document.getElementById('licensed_ip_container');
                const fairUseContainer = document.getElementById('fair_use_container');
                const isLicensed = this.value === 'licensed';
                const isFairUse = this.value === 'fair_use';

                licensedContainer.style.display = isLicensed ? 'block' : 'none';
                fairUseContainer.style.display = isFairUse ? 'block' : 'none';

                // Update required status
                if (document.getElementById('licensed_ip_details')) {
                    document.getElementById('licensed_ip_details').required = isLicensed;
                }
                if (document.getElementById('licensed_ip_docs')) {
                    document.getElementById('licensed_ip_docs').required = isLicensed;
                }
                if (document.getElementById('fair_use_reasoning')) {
                    document.getElementById('fair_use_reasoning').required = isFairUse;
                }
            });
        });

        // NEW: Show/hide existing brand placement details
        const brandPlacementRadios = document.querySelectorAll('[name="existing_brand_placements"]');

        // Initialize on page load - set required to false if "none" is selected
        const selectedBrandRadio = document.querySelector('[name="existing_brand_placements"]:checked');
        if (selectedBrandRadio && selectedBrandRadio.value === 'none') {
            document.getElementById('existing_brand_details').required = false;
        }

        brandPlacementRadios.forEach(radio => {
            radio.addEventListener('change', function() {
                const container = document.getElementById('existing_brand_details_container');
                const hasPlacement = this.value === 'yes';
                container.style.display = hasPlacement ? 'block' : 'none';
                document.getElementById('existing_brand_details').required = hasPlacement;
            });
        });

        // NEW: File upload handlers for new documentation fields
        setupFileUpload('likeness-docs-upload-zone', 'licensed_likenesses_docs', 'likeness-docs-list');
        setupFileUpload('ip-docs-upload-zone', 'licensed_ip_docs', 'ip-docs-list');
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
        if (!formGroup) return true; // No form group, skip validation

        // Remove existing error/success classes
        formGroup.classList.remove('error', 'success');

        // Remove existing error message
        const existingError = formGroup.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }

        // Handle checkboxes and radio buttons differently
        if (field.type === 'checkbox' || field.type === 'radio') {
            if (field.hasAttribute('required')) {
                // For checkboxes: check if THIS checkbox is checked
                if (field.type === 'checkbox') {
                    if (!field.checked) {
                        console.log(`🔴 Checkbox not checked: ${field.name}`);
                        showFieldError(formGroup, 'This field is required');
                        return false;
                    }
                }
                // For radio: check if ANY radio in the group is checked
                if (field.type === 'radio') {
                    const name = field.name;
                    const anyChecked = document.querySelector(`input[name="${name}"]:checked`);
                    if (!anyChecked) {
                        console.log(`🔴 No radio selected in group: ${name}`);
                        showFieldError(formGroup, 'Please select an option');
                        return false;
                    }
                }
            }
            formGroup.classList.add('success');
            return true;
        }

        // Validate text inputs, textareas, selects
        if (field.hasAttribute('required') && !field.value.trim()) {
            console.log(`🔴 Required field empty: ${field.name || field.id}`);
            showFieldError(formGroup, 'This field is required');
            return false;
        }

        if (field.type === 'email' && field.value) {
            if (!validateEmail(field.value)) {
                console.log(`🔴 Invalid email: ${field.value}`);
                showFieldError(formGroup, 'Please enter a valid email address');
                return false;
            }
        }

        if (field.type === 'url' && field.value) {
            if (!validateURL(field.value)) {
                console.log(`🔴 Invalid URL: ${field.value}`);
                showFieldError(formGroup, 'Please enter a valid URL');
                return false;
            }
        }

        // Word count validation for authorship
        if (field.id === 'authorship_declaration') {
            const words = field.value.trim().split(/\s+/).length;
            if (words < 150) {
                console.log(`🔴 Word count too low: ${words}/150`);
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
        console.log('🔵 Starting form validation...');
        let isValid = true;
        const form = document.getElementById('submitForm');
        const inputs = form.querySelectorAll('input[required], textarea[required], select[required]');

        console.log(`🔵 Validating ${inputs.length} required fields...`);
        let failedFields = [];

        inputs.forEach(input => {
            if (!validateField(input)) {
                isValid = false;
                failedFields.push({
                    name: input.name || input.id,
                    type: input.type,
                    value: input.value
                });
            }
        });

        if (failedFields.length > 0) {
            console.log('🔴 Failed fields:', failedFields);
        } else {
            console.log('✅ All required fields valid');
        }

        // Check if at least one tool is added
        console.log(`🔵 Tool count: ${toolCount}`);
        if (toolCount === 0) {
            console.log('🔴 No tools added');
            alert('Please add at least one AI tool used in production');
            isValid = false;
        } else {
            console.log('✅ Tools added');
        }

        // Check if receipts are uploaded
        console.log(`🔵 Receipts uploaded: ${uploadedFiles['receipts-list'].length}`);
        if (uploadedFiles['receipts-list'].length === 0) {
            console.log('🔴 No receipts uploaded');
            alert('Please upload at least one tool receipt');
            isValid = false;
        } else {
            console.log('✅ Receipts uploaded');
        }

        console.log(`🔵 Final validation result: ${isValid}`);
        return isValid;
    }

    // ============================
    // Form Submission
    // ============================

    async function submitForm() {
        console.log('🔵 submitForm() called');
        const submitBtn = document.getElementById('submit-btn');
        const btnText = submitBtn.querySelector('.btn-text');
        const btnSpinner = submitBtn.querySelector('.btn-spinner');

        console.log('🔵 Submit button found:', !!submitBtn);
        console.log('🔵 Button text found:', !!btnText);
        console.log('🔵 Button spinner found:', !!btnSpinner);

        // Show loading state
        submitBtn.disabled = true;
        btnText.style.display = 'none';
        btnSpinner.style.display = 'inline';

        try {
            // Collect form data
            console.log('🔵 Collecting form data...');
            const formData = await collectFormData();
            console.log('🔵 Form data collected:', formData);

            // Send to API endpoint
            console.log('🔵 Sending to /api/submit...');
            const response = await fetch('/api/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            console.log('🔵 Response status:', response.status);
            console.log('🔵 Response statusText:', response.statusText);
            console.log('🔵 Response headers:', Object.fromEntries(response.headers.entries()));

            // Get the raw response text first
            const responseText = await response.text();
            console.log('🔵 Raw response body:', responseText);

            // Try to parse as JSON
            let result;
            try {
                result = JSON.parse(responseText);
                console.log('🔵 Parsed JSON result:', result);
            } catch (parseError) {
                console.error('🔴 Failed to parse response as JSON:', parseError);
                console.error('🔴 Response was:', responseText.substring(0, 500));
                throw new Error(`API returned non-JSON response (status ${response.status}): ${responseText.substring(0, 200)}`);
            }

            if (!response.ok) {
                throw new Error(result.error || 'Submission failed');
            }

            // Store email in localStorage for confirmation page
            localStorage.setItem('submitterEmail', formData.filmmaker.email);

            // Success! Redirect to confirmation page
            window.location.href = `confirmation?id=${result.submissionId}`;

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

        // Use Cloudinary URLs instead of base64 data URLs
        // Files have already been uploaded during selection - just use the stored URLs
        console.log('📦 Cloudinary URLs:', cloudinaryUrls);

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
                existingAgreements: formData.get('existing_agreements'),
                underlyingRights: {
                    status: formData.get('underlying_rights'),
                    source: formData.get('underlying_rights_source') || '',
                    rightsHolder: formData.get('underlying_rights_holder') || '',
                    permission: formData.get('underlying_rights_permission') || ''
                }
            },
            tools: tools,
            thirdPartyAssets: {
                stockFootage: formData.get('third_party_stock_footage') === 'yes',
                fonts: formData.get('third_party_fonts') === 'yes',
                sfx: formData.get('third_party_sfx') === 'yes',
                overlays: formData.get('third_party_overlays') === 'yes',
                other: formData.get('third_party_other') === 'yes',
                details: formData.get('third_party_details') || ''
            },
            authorship: {
                declaration: formData.get('authorship_declaration')
            },
            likeness: {
                status: formData.get('likeness_status'),
                details: formData.get('licensed_likenesses_details') || '',
                docsUrls: cloudinaryUrls['likeness-docs-list'] || []
            },
            ip: {
                status: formData.get('ip_status'),
                details: formData.get('licensed_ip_details') || formData.get('fair_use_reasoning') || '',
                docsUrls: cloudinaryUrls['ip-docs-list'] || []
            },
            audio: {
                musicSource: formData.get('audio_music_source'),
                musicTool: formData.get('audio_music_tool'),
                soundDesign: formData.get('audio_sound_design'),
                voiceover: formData.get('audio_voiceover')
            },
            tier2: {
                enrollment: formData.get('tier2_enrollment'),
                scenes: formData.get('tier2_scenes'),
                existingBrandPlacements: {
                    status: formData.get('existing_brand_placements'),
                    details: formData.get('existing_brand_details') || ''
                }
            },
            territory: {
                preference: formData.get('territory_preference'),
                restrictions: formData.get('territory_restrictions'),
                exclusivity: formData.get('exclusivity_preference')
            },
            catalog: {
                title: formData.get('catalog_title'),
                description: formData.get('catalog_description'),
                thumbnailUrl: cloudinaryUrls['catalog-thumbnail']
            },
            terms: {
                consent: formData.get('terms_consent') === 'on'
            },
            files: {
                videoUrl: formData.get('video_url'),
                videoPassword: formData.get('video_password'),
                receiptsUrls: cloudinaryUrls['receipts-list'] || [],
                supportingDocsUrls: cloudinaryUrls['supporting-docs-list'] || []
            }
        };

        console.log('🔍 Catalog data:', {
            title: data.catalog.title,
            description: data.catalog.description,
            thumbnailUrl: data.catalog.thumbnailUrl || 'NULL'
        });

        return data;
    }

    // Note: File upload functions removed - files now uploaded directly to Cloudinary
    // when selected, and only URLs are sent to backend (not base64 data)

    // ============================
    // Test Data Auto-Fill
    // ============================
    // Test Data Auto-Fill Button
    // ============================
    //
    // STATUS: DISABLED for production (March 11, 2026)
    //
    // This floating button auto-fills all form fields with realistic test data
    // to speed up development and testing. It was used extensively during
    // Rights Verified v0.1 development and successful end-to-end testing.
    //
    // HOW TO RE-ENABLE FOR TESTING:
    // 1. Uncomment the function call on line ~82: setupTestDataButton();
    // 2. Save and deploy
    // 3. Button will appear as orange floating button in bottom-right corner
    // 4. Click button to auto-fill all fields (except file uploads)
    // 5. Manually upload test files (receipts + thumbnail)
    // 6. Submit form
    //
    // WHAT IT FILLS:
    // - Section 1: Filmmaker Profile (Jane Chen, Singapore)
    // - Section 2: Production Overview (Neon Dreams - sci-fi short)
    // - Section 3: Tools (3 tools: Runway, ElevenLabs, Udio)
    // - Section 4: Authorship Declaration (150+ word sample)
    // - Section 5: Likeness Status (none - all checkboxes)
    // - Section 6: IP Status (none - all checkboxes)
    // - Section 7: Audio (Original AI music, Udio tool)
    // - Section 8: Tier 2 (Yes scenes, sample scenes listed)
    // - Section 9: Territory (Global, Exclusive)
    // - Section 10: Catalog (Title + Description)
    // - Section 11: Supporting Materials (Vimeo URL + password)
    // - Section 12: Terms (Consent checkbox)
    //
    // DOES NOT FILL (must upload manually):
    // - Tool Receipts (Section 3 - file upload)
    // - Catalog Thumbnail (Section 10 - file upload)
    // - Likeness Docs (if "licensed" is selected)
    // - IP Docs (if "licensed" is selected)
    // - Supporting Docs (optional)
    //
    // LAST USED: March 11, 2026 during final production testing
    // COMMIT: d9ec895 (Rights Verified v0.1 fully operational)
    //
    // ============================

    function setupTestDataButton() {
        // Create a floating test button (same as old implementation)
        const testBtn = document.createElement('button');
        testBtn.textContent = '🧪 Load Test Data';
        testBtn.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index: 9999; background: #f59e0b; color: white; padding: 12px 20px; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 6px rgba(0,0,0,0.1);';
        document.body.appendChild(testBtn);

        // Helper function to safely set values
        const safeSet = (selector, value, prop = 'value') => {
            const el = document.querySelector(selector);
            if (el) {
                el[prop] = value;
                return el;
            } else {
                console.warn(`⚠️ Element not found: ${selector}`);
                return null;
            }
        };

        testBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('🧪 Loading test data...');

            // Section 1: Filmmaker Profile
            safeSet('input[name="filmmaker_name"]', 'Jane Chen');
            safeSet('input[name="filmmaker_email"]', 'jdchangmedia@gmail.com');
            safeSet('input[name="filmmaker_location"]', 'Singapore, Singapore');
            safeSet('input[name="filmmaker_portfolio"]', 'https://janechen.art');
            safeSet('textarea[name="prior_works"]', 'https://vimeo.com/123456789\nhttps://youtube.com/watch?v=test123\nhttps://vimeo.com/987654321');

            // Section 2: Production Overview
            safeSet('input[name="title"]', 'Neon Dreams');
            safeSet('input[name="runtime"]', '02:30');
            safeSet('input[name="genre"]', 'Sci-fi narrative short');
            safeSet('textarea[name="logline"]', 'A solitary robot discovers an abandoned garden in a neon-lit megacity and learns the meaning of growth through caring for a single flower.');
            safeSet('input[name="intended_use"][value="Both"]', true, 'checked');
            safeSet('input[name="production_start"]', 'Jan 2026');
            safeSet('input[name="production_end"]', 'Feb 2026');
            safeSet('textarea[name="existing_agreements"]', 'None');

            // NEW: Underlying Rights
            const underlyingRights = safeSet('select[name="underlying_rights"]', 'original');
            if (underlyingRights) underlyingRights.dispatchEvent(new Event('change'));

            // Section 3: Tools (3 tools)
            // Tools are already added dynamically, so we need to fill them
            const toolNames = document.querySelectorAll('input[name^="tool_name_"]');
            const toolVersions = document.querySelectorAll('input[name^="tool_version_"]');
            const toolPlans = document.querySelectorAll('input[name^="tool_plan_"]');

            if (toolNames.length < 3) {
                // Add more tools if needed
                while (toolCount < 3) {
                    addToolRow();
                }
            }

            // Fill tool data
            const toolData = [
                { name: 'Runway', version: 'Gen-3 Alpha Turbo', plan: 'Paid - Unlimited Plan' },
                { name: 'ElevenLabs', version: 'Voice Design', plan: 'Paid - Creator Plan' },
                { name: 'Udio', version: 'v1.5', plan: 'Paid - Standard Plan' }
            ];

            toolData.forEach((tool, idx) => {
                const nameInput = document.querySelector(`input[name="tool_name_${idx + 1}"]`);
                const versionInput = document.querySelector(`input[name="tool_version_${idx + 1}"]`);
                const planInput = document.querySelector(`input[name="tool_plan_${idx + 1}"]`);

                if (nameInput) nameInput.value = tool.name;
                if (versionInput) versionInput.value = tool.version;
                if (planInput) planInput.value = tool.plan;
            });

            // NEW: Third-Party Assets (leave unchecked for clean test)
            // Don't check any third-party asset boxes for a clean submission test

            // Section 4: Authorship
            safeSet('textarea[name="authorship_declaration"]', `I directed every creative decision in this film through iterative prompting and editorial selection. The production process involved over 200 individual generation attempts across 15 distinct scenes.

For the opening sequence, I experimented with 30+ prompt variations to achieve the specific neon color palette and cyberpunk atmosphere. Each shot required careful consideration of camera movement, lighting direction, and compositional balance. I rejected approximately 70% of generated outputs that didn't match my creative vision.

The robot character design went through 12 iterations before I landed on the final aesthetic that balanced mechanical precision with emotional expressiveness. I manually selected and sequenced every shot, paying close attention to pacing, rhythm, and emotional arc.

Post-generation, I performed extensive editorial work: color grading all footage for tonal consistency, compositing multiple generated elements into unified shots, timing cuts to the musical score I commissioned, and adding subtle VFX enhancements.

The final film represents my authorial vision executed through AI tools, not the AI's autonomous output. Every frame exists because I chose it from many alternatives.`);

            // Section 5: Likeness Status (NEW radio button approach)
            const likenessRadio = safeSet('input[name="likeness_status"][value="none"]', true, 'checked');
            if (likenessRadio) likenessRadio.dispatchEvent(new Event('change'));

            // Section 5: Likeness confirmation checkboxes
            safeSet('input[name="no_unlicensed_voices"]', true, 'checked');
            safeSet('input[name="no_unlicensed_lookalikes"]', true, 'checked');
            safeSet('input[name="synthetic_faces_check"]', true, 'checked');

            // Section 6: IP Status (NEW radio button approach)
            const ipRadio = safeSet('input[name="ip_status"][value="none"]', true, 'checked');
            if (ipRadio) ipRadio.dispatchEvent(new Event('change'));

            // Section 6: IP confirmation checkboxes
            safeSet('input[name="no_unlicensed_characters"]', true, 'checked');
            safeSet('input[name="no_unlicensed_brands"]', true, 'checked');
            safeSet('input[name="no_unlicensed_trademarks"]', true, 'checked');

            // Section 7: Audio
            const musicRadio = safeSet('input[name="audio_music_source"][value="Original AI"]', true, 'checked');
            if (musicRadio) musicRadio.dispatchEvent(new Event('change'));

            setTimeout(() => {
                safeSet('input[name="audio_music_tool"]', 'Udio v1.5 (Paid - Standard Plan)');
            }, 100);

            safeSet('input[name="audio_sound_design"][value="Original AI"]', true, 'checked');
            safeSet('input[name="audio_voiceover"][value="AI voice"]', true, 'checked');

            // Section 8: Tier 2
            const tier2Radio = safeSet('input[name="tier2_enrollment"][value="Yes scenes"]', true, 'checked');
            if (tier2Radio) tier2Radio.dispatchEvent(new Event('change'));

            setTimeout(() => {
                safeSet('textarea[name="tier2_scenes"]', 'Scene 3 (robot in garden), Scene 7 (cityscape establishing shot), Scene 12 (final shot with flower)');
            }, 100);

            // NEW: Existing Brand Placements
            const brandPlacementRadio = safeSet('input[name="existing_brand_placements"][value="none"]', true, 'checked');
            if (brandPlacementRadio) brandPlacementRadio.dispatchEvent(new Event('change'));

            // Section 9: Territory
            safeSet('select[name="territory_preference"]', 'Global');
            safeSet('input[name="exclusivity_preference"][value="Exclusive"]', true, 'checked');

            // Section 10: Catalog Submission
            safeSet('input[name="catalog_title"]', 'Neon Dreams');
            safeSet('textarea[name="catalog_description"]', 'A contemplative sci-fi short about connection and growth in a neon-lit cyberpunk world.');

            // Section 11: Supporting Materials
            safeSet('input[name="video_url"]', 'https://vimeo.com/testsubmission123');
            safeSet('input[name="video_password"]', 'testpass123');

            // Section 12: Terms
            safeSet('input[name="terms_consent"]', true, 'checked');

            console.log('✅ Test data loaded! Now trigger progress tracking...');

            // Trigger change events to update progress
            document.querySelectorAll('input, textarea, select').forEach(el => {
                el.dispatchEvent(new Event('change'));
                el.dispatchEvent(new Event('blur'));
            });

            setTimeout(() => {
                console.log('✅ Form should now be ready to submit (except file uploads - do those manually)');
                alert('✅ Test data loaded!\n\nManually upload these files to complete the form:\n\n1. Tool Receipts (Section 3) - at least 1 file\n2. Catalog Thumbnail (Section 10) - required\n\nThen submit the form.');
            }, 500);
        });
    }

});
