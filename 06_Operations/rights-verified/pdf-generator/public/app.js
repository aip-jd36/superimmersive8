// SI8 Chain of Title Generator - Client-Side JavaScript

// State
let approvedRecords = [];
let recentGenerations = [];

// DOM Elements
const recordSelect = document.getElementById('recordSelect');
const recordDetails = document.getElementById('recordDetails');
const generateBtn = document.getElementById('generateBtn');
const statusBanner = document.getElementById('statusBanner');
const successBanner = document.getElementById('successBanner');
const errorBanner = document.getElementById('errorBanner');
const recentLog = document.getElementById('recentLog');

// Detail fields
const detailTitle = document.getElementById('detailTitle');
const detailFilmmaker = document.getElementById('detailFilmmaker');
const detailCatalogId = document.getElementById('detailCatalogId');
const detailReviewDate = document.getElementById('detailReviewDate');

// Button elements
const btnText = document.getElementById('btnText');
const btnSpinner = document.getElementById('btnSpinner');

// ============================
// Initialization
// ============================

async function init() {
    showStatus('Loading approved records...');
    try {
        await loadApprovedRecords();
        hideStatus();
    } catch (error) {
        showError(`Failed to load records: ${error.message}`);
    }
}

// ============================
// API Functions
// ============================

async function loadApprovedRecords() {
    const response = await fetch('/api/records');
    const data = await response.json();

    if (!data.success) {
        throw new Error(data.error || 'Failed to load records');
    }

    approvedRecords = data.records;
    populateRecordDropdown();
}

async function generatePDF(recordId) {
    // Open HTML preview in new window
    const url = `/api/generate`;
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = url;
    form.target = '_blank';

    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'recordId';
    input.value = recordId;

    form.appendChild(input);
    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);

    // Get record data for success message
    const selectedOption = recordSelect.selectedOptions[0];
    const record = JSON.parse(selectedOption.dataset.record);

    // Return metadata for success message
    return {
        success: true,
        data: {
            title: record.title,
            filmmaker: record.filmmaker,
            catalogId: record.catalogId,
            filename: `${record.catalogId}-chain-of-title-v1.0.pdf`,
            path: 'Opens in new window - use Print to PDF'
        }
    };
}

// ============================
// UI Functions
// ============================

function populateRecordDropdown() {
    recordSelect.innerHTML = '';

    if (approvedRecords.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'No approved records found';
        recordSelect.appendChild(option);
        recordSelect.disabled = true;
        return;
    }

    // Default option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = `Select a record (${approvedRecords.length} approved)`;
    recordSelect.appendChild(defaultOption);

    // Add records
    approvedRecords.forEach(record => {
        const option = document.createElement('option');
        option.value = record.id;
        option.textContent = `${record.title} — ${record.filmmaker} (${record.catalogId})`;
        option.dataset.record = JSON.stringify(record);
        recordSelect.appendChild(option);
    });

    recordSelect.disabled = false;
}

function showRecordDetails(record) {
    detailTitle.textContent = record.title;
    detailFilmmaker.textContent = record.filmmaker;
    detailCatalogId.textContent = record.catalogId;
    detailReviewDate.textContent = record.reviewDate || 'Not set';

    recordDetails.classList.remove('d-none');
    generateBtn.disabled = false;
}

function hideRecordDetails() {
    recordDetails.classList.add('d-none');
    generateBtn.disabled = true;
}

function showStatus(message) {
    document.getElementById('statusMessage').textContent = message;
    statusBanner.classList.remove('d-none');
    successBanner.classList.add('d-none');
    errorBanner.classList.add('d-none');
}

function hideStatus() {
    statusBanner.classList.add('d-none');
}

function showSuccess(data) {
    const message = `
        <strong>Title:</strong> ${data.title}<br>
        <strong>Filmmaker:</strong> ${data.filmmaker}<br>
        <strong>Catalog ID:</strong> ${data.catalogId}<br>
        <strong>Filename:</strong> <code>${data.filename}</code><br>
        <strong>Location:</strong> <code>${data.path}</code>
    `;

    document.getElementById('successMessage').innerHTML = message;
    successBanner.classList.remove('d-none');
    statusBanner.classList.add('d-none');
    errorBanner.classList.add('d-none');

    // Add to recent log
    addToRecentLog(data);

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showError(message) {
    document.getElementById('errorMessage').textContent = message;
    errorBanner.classList.remove('d-none');
    statusBanner.classList.add('d-none');
    successBanner.classList.add('d-none');

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setGenerating(isGenerating) {
    generateBtn.disabled = isGenerating;
    recordSelect.disabled = isGenerating;

    if (isGenerating) {
        btnText.textContent = 'Generating...';
        btnSpinner.classList.remove('d-none');
    } else {
        btnText.textContent = 'Generate PDF';
        btnSpinner.classList.add('d-none');
    }
}

function addToRecentLog(data) {
    const entry = {
        timestamp: new Date(),
        ...data
    };

    recentGenerations.unshift(entry);

    // Keep only last 10
    if (recentGenerations.length > 10) {
        recentGenerations = recentGenerations.slice(0, 10);
    }

    updateRecentLog();
}

function updateRecentLog() {
    if (recentGenerations.length === 0) {
        recentLog.innerHTML = '<p class="text-muted">No PDFs generated yet in this session.</p>';
        return;
    }

    const html = recentGenerations.map(entry => {
        const time = entry.timestamp.toLocaleTimeString();
        return `
            <div class="log-entry">
                <div class="log-entry-time">${time}</div>
                <div class="log-entry-info">
                    <strong>${entry.title}</strong> — ${entry.filmmaker}
                </div>
                <div class="log-entry-path">${entry.filename}</div>
            </div>
        `;
    }).join('');

    recentLog.innerHTML = html;
}

// ============================
// Event Handlers
// ============================

recordSelect.addEventListener('change', (e) => {
    const selectedOption = e.target.selectedOptions[0];

    if (!selectedOption || !selectedOption.value) {
        hideRecordDetails();
        return;
    }

    const record = JSON.parse(selectedOption.dataset.record);
    showRecordDetails(record);
});

generateBtn.addEventListener('click', async () => {
    const recordId = recordSelect.value;

    if (!recordId) {
        showError('Please select a record first');
        return;
    }

    setGenerating(true);
    showStatus('Generating PDF... This may take 5-10 seconds');

    try {
        const result = await generatePDF(recordId);
        setGenerating(false);
        showSuccess(result.data);
    } catch (error) {
        setGenerating(false);
        showError(error.message);
        console.error('Generation error:', error);
    }
});

// ============================
// Start
// ============================

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);
