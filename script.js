// Enhanced device detection with touch support
function detectDeviceType() {
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    document.body.classList.toggle('touch-device', isTouchDevice);
}

// Environment detection
const isLocal = window.location.protocol === 'file:' || 
                window.location.hostname === 'localhost' || 
                window.location.hostname.endsWith('.local');

// Path configurations
const PDF_BASE_PATH = isLocal ? "L:/Files/INVOICE/" : null;
const SRV_BASE_PATH = isLocal ? "L:/Files/SRV/" : null;

// GitHub CSV URLs with cache-busting
const GITHUB_CSV_URLS = {
    '2025': "https://raw.githubusercontent.com/DC-database/Invoice/main/records_2025.csv",
    '2022-2024': "https://raw.githubusercontent.com/DC-database/Invoice/main/records_2022-2024.csv"
};

// Application state
let records = [];
let activeFilter = 'all';
let usingGitHub = false;
let isLoading = false;
let currentYear = '2025';

// Cache for GitHub data
const dataCache = {
    '2025': { data: null, lastUpdated: null },
    '2022-2024': { data: null, lastUpdated: null }
};

// Mobile menu functions
function toggleMobileMenu() {
    const mobileMenu = document.getElementById('mobileMenu');
    if (mobileMenu.classList.contains('show')) {
        mobileMenu.classList.remove('show');
    } else {
        mobileMenu.classList.add('show');
    }
}

function showSection(sectionId) {
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(sectionId).classList.add('active');
    document.getElementById('mobileMenu').classList.remove('show');
    
    if (sectionId === 'pettyCashSection') {
        updateNoteSuggestions();
    }
    
    if (sectionId === 'statementSection') {
        updateVendorSuggestions();
        updateSiteSuggestions();
    }
    
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    
    if (sectionId === 'invoiceSection') {
        document.querySelector('.menu-item:nth-child(1)').classList.add('active');
    } else if (sectionId === 'statementSection') {
        document.querySelector('.menu-item:nth-child(2)').classList.add('active');
    } else if (sectionId === 'pettyCashSection') {
        document.querySelector('.menu-item:nth-child(3)').classList.add('active');
    }
}

function toggleFilterDropdown() {
    document.getElementById('filterDropdown').classList.toggle('show');
}

// Close the dropdown if clicked outside
window.onclick = function(event) {
    if (!event.target.matches('.filter-dropbtn')) {
        const dropdowns = document.getElementsByClassName("filter-dropdown-content");
        for (let i = 0; i < dropdowns.length; i++) {
            const openDropdown = dropdowns[i];
            if (openDropdown.classList.contains('show')) {
                openDropdown.classList.remove('show');
            }
        }
    }
};

// View PDF file
function viewPDF(fileName) {
    if (!fileName) {
        alert("No PDF file linked to this record.");
        return;
    }
    
    if (isLocal) {
        window.open(`${PDF_BASE_PATH}${fileName}`);
    } else {
        alert("Invoice files are only accessible when using the system on the local network.");
    }
}

// View SRV file
function viewSRV(fileName) {
    if (!fileName) {
        alert("No SRV file linked to this record.");
        return;
    }
    
    if (isLocal) {
        window.open(`${SRV_BASE_PATH}${fileName}`);
    } else {
        alert("SRV files are only accessible when using the system on the local network.");
    }
}

// Loading overlay functions
function showLoading() {
    isLoading = true;
    document.getElementById('loadingOverlay').style.display = 'flex';
}

function hideLoading() {
    isLoading = false;
    document.getElementById('loadingOverlay').style.display = 'none';
}

// Status progress calculation
function getStatusPercentage(status) {
    const statusProgress = {
        'Open': 0,
        'For SRV': 10,
        'For IPC': 25,
        'No Invoice': 25,
        'Report': 25,
        'Under Review': 50,
        'CEO Approval': 75,
        'With Accounts': 100
    };
    return statusProgress[status] || 0;
}

// GitHub API functions
async function getGitHubFileLastUpdated(url) {
    try {
        const apiUrl = url
            .replace('https://raw.githubusercontent.com/', 'https://api.github.com/repos/')
            .replace('/main/', '/commits?path=');
        
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error('Failed to fetch commit data');
        
        const commits = await response.json();
        if (commits.length > 0) {
            return new Date(commits[0].commit.committer.date);
        }
        return null;
    } catch (error) {
        console.error('Error fetching last update date:', error);
        return null;
    }
}

async function updateFileInfo() {
    const url = GITHUB_CSV_URLS[currentYear];
    const fileInfo = document.getElementById('fileInfo');
    
    try {
        const lastUpdated = await getGitHubFileLastUpdated(url);
        const lastFetch = localStorage.getItem(`lastGitHubFetch_${currentYear}`);
        
        let infoHTML = `<strong>File Source:</strong> ${currentYear} CSV<br>`;
        
        if (lastUpdated) {
            infoHTML += `<strong>Last Updated:</strong> ${formatDateForDisplay(lastUpdated)}<br>`;
        }
        
        if (lastFetch) {
            infoHTML += `<strong>Last Fetched:</strong> ${formatDateForDisplay(new Date(lastFetch))}<br>`;
        }
        
        infoHTML += `<strong>Records Loaded:</strong> ${records.length}`;
        
        fileInfo.innerHTML = infoHTML;
    } catch (error) {
        console.error('Error updating file info:', error);
    }
}

function formatDateForDisplay(date) {
    if (!date) return 'Unknown';
    return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Connection status
function updateConnectionStatus(connected) {
    const indicator = document.getElementById('statusIndicator');
    const statusText = document.getElementById('connectionStatus');
    const connectBtn = document.getElementById('connectBtn');

    if (connected) {
        indicator.className = 'status-indicator connected';
        statusText.textContent = `Connected to: ${currentYear} CSV`;
        connectBtn.innerHTML = `<i class="fas fa-sync-alt"></i> Data Updated (${currentYear})`;
        usingGitHub = true;
    } else {
        indicator.className = 'status-indicator disconnected';
        statusText.textContent = 'Not connected to data source';
        connectBtn.innerHTML = `<i class="fas fa-sync-alt"></i> Refresh Data`;
        usingGitHub = false;
    }
    
    updateFileInfo();
}

// Data processing
function processCSVData(data) {
    return data.map(item => ({
        entryDate: item['Entered Date'] || new Date().toISOString().split('T')[0],
        site: item['Site'] || '',
        poNumber: item['PO Number'] || '',
        poValue: item['PO Value'] || '',
        vendor: item['Vendor'] || '',
        invoiceNumber: item['Invoice Number'] || '',
        value: item['Value'] || '',
        details: item['Details'] || '',
        releaseDate: item['Release Date'] || '',
        status: item['Status'] || 'For SRV',
        fileName: item['FileName'] || '',
        note: item['Note'] || item['Notes'] || item['Description'] || '',
        lastUpdated: new Date().toISOString()
    }));
}

function migrateStatus(records) {
    return records.map(record => {
        if (record.status === 'Under Process') {
            record.status = 'CEO Approval';
        }
        return record;
    });
}

// Data loading
async function loadFromGitHub(forceRefresh = false) {
    const url = GITHUB_CSV_URLS[currentYear];
    const cacheKey = `githubData_${currentYear}`;
    
    if (!forceRefresh && dataCache[currentYear].data) {
        records = dataCache[currentYear].data;
        updateNoteSuggestions();
        updateVendorSuggestions();
        updateSiteSuggestions();
        updateUI();
        return;
    }

    showLoading();
    
    try {
        const response = await fetch(`${url}?t=${Date.now()}`);
        if (!response.ok) throw new Error('Failed to fetch CSV');
        
        const csvData = await response.text();
        
        return new Promise((resolve) => {
            Papa.parse(csvData, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    if (results.data.length === 0) {
                        records = [];
                    } else {
                        records = processCSVData(results.data);
                        records = migrateStatus(records);
                    }
                    
                    dataCache[currentYear] = {
                        data: records,
                        lastUpdated: new Date()
                    };
                    
                    localStorage.setItem(`recordsData_${currentYear}`, JSON.stringify(records));
                    localStorage.setItem(`lastGitHubFetch_${currentYear}`, new Date().toISOString());
                    
                    updateNoteSuggestions();
                    updateVendorSuggestions();
                    updateSiteSuggestions();
                    updateConnectionStatus(true);
                    updateFileInfo();
                    resolve();
                },
                error: (error) => {
                    console.error('Error parsing CSV:', error);
                    throw error;
                }
            });
        });
    } catch (error) {
        console.error('Error loading from GitHub:', error);
        updateConnectionStatus(false);
        if (dataCache[currentYear].data) {
            records = dataCache[currentYear].data;
            updateNoteSuggestions();
            updateVendorSuggestions();
            updateSiteSuggestions();
            updateUI();
        }
    } finally {
        hideLoading();
    }
}

// Optimized UI updates
function updateUI() {
    updateConnectionStatus(true);
    updateFileInfo();
    searchRecords();
}

function loadFromLocalStorage() {
    const savedData = localStorage.getItem(`recordsData_${currentYear}`);
    
    if (savedData) {
        try {
            records = JSON.parse(savedData);
            records = migrateStatus(records);
            updateNoteSuggestions();
            updateVendorSuggestions();
            updateSiteSuggestions();
            document.getElementById('recordsTable').style.display = 'none';
            updateConnectionStatus(true);
            updateFileInfo();
        } catch (e) {
            console.error('Error parsing localStorage data:', e);
            records = [];
            updateConnectionStatus(false);
        }
    } else {
        loadFromGitHub().catch(() => updateConnectionStatus(false));
    }
}

function saveData() {
    localStorage.setItem(`recordsData_${currentYear}`, JSON.stringify(records));
}

function clearLocalStorage() {
    if (confirm('Are you sure you want to clear all locally cached data? This cannot be undone.')) {
        const previousYear = currentYear;
        currentYear = '2025';
        document.querySelector('input[value="2025"]').checked = true;
        
        loadFromGitHub(true).then(() => {
            if (previousYear !== '2025') {
                currentYear = previousYear;
                document.querySelector(`input[value="${previousYear}"]`).checked = true;
                loadFromGitHub(true);
            }
        }).catch(() => {
            location.reload();
        });
    }
}

// Table functions
function refreshTable(filteredRecords = null) {
    const tableBody = document.querySelector('#recordsTable tbody');
    tableBody.innerHTML = '';
    
    const displayRecords = filteredRecords || records;
    const recordsTable = document.getElementById('recordsTable');
    
    if (displayRecords.length === 0) {
        recordsTable.style.display = 'none';
        return;
    }
    
    recordsTable.style.display = 'table';
    
    displayRecords.forEach((record, index) => {
        const percentage = getStatusPercentage(record.status);
        const statusSteps = {
            'Open': 0,
            'For SRV': 1,
            'For IPC': 2,
            'No Invoice': 2,
            'Report': 2,
            'Under Review': 3,
            'CEO Approval': 4,
            'With Accounts': 5
        };
        const currentStep = statusSteps[record.status] || 0;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${formatDate(record.entryDate)}</td>
            <td>${record.site || '-'}</td>
            <td>${record.poNumber || '-'}</td>
            <td>${record.vendor || '-'}</td>
            <td>${record.invoiceNumber || '-'}</td>
            <td class="numeric">${record.value ? formatNumber(record.value) : '-'}</td>
            <td>${record.releaseDate ? formatDate(record.releaseDate) : '-'}</td>
            <td class="status-cell">
                <div class="step-progress-container">
                    <div class="step-progress" data-percentage="${percentage}">
                        <div class="step step-1 ${currentStep > 1 ? 'active' : ''} ${currentStep === 1 ? 'current' : ''}"></div>
                        <div class="step-connector ${currentStep > 1 ? 'active' : ''}"></div>
                        <div class="step step-2 ${currentStep > 2 ? 'active' : ''} ${currentStep === 2 ? 'current' : ''}"></div>
                        <div class="step-connector ${currentStep > 2 ? 'active' : ''}"></div>
                        <div class="step step-3 ${currentStep > 3 ? 'active' : ''} ${currentStep === 3 ? 'current' : ''}"></div>
                        <div class="step-connector ${currentStep > 3 ? 'active' : ''}"></div>
                        <div class="step step-4 ${currentStep > 4 ? 'active' : ''} ${currentStep === 4 ? 'current' : ''}"></div>
                        <div class="step-connector ${currentStep > 4 ? 'active' : ''}"></div>
                        <div class="step step-5 ${currentStep > 5 ? 'active' : ''} ${currentStep === 5 ? 'current' : ''}"></div>
                    </div>
                    <div class="step-labels">
                        <span class="step-label">SRV</span>
                        <span class="step-label">IPC/Report</span>
                        <span class="step-label">Review</span>
                        <span class="step-label">CEO</span>
                        <span class="step-label">Accounts</span>
                    </div>
                    <div class="status-tooltip">${record.status} - ${percentage}%</div>
                </div>
            </td>
            <td class="action-btns">
                <button class="btn btn-inv ${!record.fileName ? 'disabled' : ''}" 
                  onclick="viewPDF('${record.fileName || ''}')" 
                  ${!record.fileName ? 'disabled' : ''}>
                  <i class="fas fa-file-pdf"></i>
                </button>
                <button class="btn btn-srv ${!record.details ? 'disabled' : ''}" 
                  onclick="viewSRV('${record.details || ''}')" 
                  ${!record.details ? 'disabled' : ''}>
                  <i class="fas fa-file-alt"></i>
                </button>
            </td>
        `;
        
        row.addEventListener('click', function(e) {
            if (!e.target.closest('.action-btns')) {
                showInvoicePreview(record);
            }
        });
        
        tableBody.appendChild(row);
    });
    
    setupResponsiveElements();
}

// Utility functions
function formatDate(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatNumber(value) {
    return parseFloat(value).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function getStatusClass(status) {
    const statusClasses = {
        'For SRV': 'status-srv',
        'Report': 'status-report',
        'Under Review': 'status-review',
        'Pending': 'status-pending',
        'With Accounts': 'status-accounts',
        'CEO Approval': 'status-process',
        'For IPC': 'status-ipc',
        'NO Invoice': 'status-Invoice',
        'Open': 'status-Open'
    };
    return statusClasses[status] || '';
}

// Search and filter
function searchRecords() {
    const term = document.getElementById('searchTerm').value.toLowerCase();
    const releaseDateInput = document.getElementById('releaseDateFilter').value;
    let filtered = records;

    if (term) {
        filtered = filtered.filter(record =>
            (record.site && record.site.toLowerCase().includes(term)) ||
            (record.poNumber && record.poNumber.toLowerCase().includes(term)) ||
            (record.vendor && record.vendor.toLowerCase().includes(term)) ||
            (record.invoiceNumber && record.invoiceNumber.toLowerCase().includes(term)) ||
            (record.details && record.details.toLowerCase().includes(term)) ||
            (record.fileName && record.fileName.toLowerCase().includes(term)) ||
            (record.note && record.note.toLowerCase().includes(term))
        );
    }

    if (activeFilter !== 'all') {
        filtered = filtered.filter(record => record.status === activeFilter);
    }

    if (releaseDateInput) {
        const filterDate = new Date(releaseDateInput);
        filtered = filtered.filter(record => {
            if (!record.releaseDate) return false;
            const recordDate = new Date(record.releaseDate);
            return recordDate.toDateString() === filterDate.toDateString();
        });
    }

    refreshTable(filtered);
}

function filterRecords(status) {
    activeFilter = status;

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent === (status === 'all' ? 'All' : status)) {
            btn.classList.add('active');
        }
    });

    searchRecords();
}

function clearSearch() {
    document.getElementById('searchTerm').value = '';
    document.getElementById('releaseDateFilter').value = '';
    activeFilter = 'all';
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent === 'All') {
            btn.classList.add('active');
        }
    });
    
    document.getElementById('recordsTable').style.display = 'none';
}

function clearDate() {
    document.getElementById('releaseDateFilter').value = '';
    searchRecords();
}

// Report functions
function generateReport() {
    const reportType = document.getElementById('reportType').value;
    const searchTerm = document.getElementById('reportSearchTerm').value.trim();
    const statusFilter = document.getElementById('reportStatusFilter').value;
    
    if (!searchTerm) {
        alert('Please enter a search term');
        return;
    }
    
    let filteredRecords = [];
    let headerText = '';
    
    switch(reportType) {
        case 'po':
            filteredRecords = records.filter(record => 
                record.poNumber && record.poNumber.toLowerCase().includes(searchTerm.toLowerCase())
            );
            if (filteredRecords.length > 0) {
                headerText = `PO: ${filteredRecords[0].poNumber}<br>
                    Vendor: ${filteredRecords[0].vendor || 'N/A'}<br>
                    Site: ${filteredRecords[0].site || 'N/A'}<br>
                    Note: ${filteredRecords[0].note || 'N/A'}`;
            }
            document.getElementById('poTotalContainer').style.display = 'flex';
            break;
            
        case 'vendor':
            filteredRecords = records.filter(record => 
                record.vendor && record.vendor.toLowerCase().includes(searchTerm.toLowerCase())
            );
            if (filteredRecords.length > 0) {
                headerText = `Vendor: ${filteredRecords[0].vendor}<br>
                    Records: ${filteredRecords.length}`;
            }
            document.getElementById('poTotalContainer').style.display = 'none';
            break;
            
        case 'site':
            filteredRecords = records.filter(record => 
                record.site && record.site.toLowerCase().includes(searchTerm.toLowerCase())
            );
            if (filteredRecords.length > 0) {
                headerText = `Site: ${filteredRecords[0].site}<br>
                    Records: ${filteredRecords.length}`;
            }
            document.getElementById('poTotalContainer').style.display = 'none';
            break;
    }
    
    if (statusFilter !== 'all') {
        filteredRecords = filteredRecords.filter(record => record.status === statusFilter);
    }
    
    if (filteredRecords.length === 0) {
        alert('No records found matching your search criteria');
        return;
    }
    
    const invoiceTotal = filteredRecords
        .reduce((sum, record) => sum + (parseFloat(record.value) || 0), 0);
        
    const poTotal = reportType === 'po' && filteredRecords.length > 0 ? 
        parseFloat(filteredRecords[0].poValue) || 0 : 0;
    
    const withAccountsTotal = filteredRecords
        .filter(record => record.status === 'With Accounts')
        .reduce((sum, record) => sum + (parseFloat(record.value) || 0), 0);
    
    const balance = invoiceTotal - withAccountsTotal;

    document.getElementById('reportHeader').innerHTML = headerText;
    document.getElementById('poTotal').textContent = formatNumber(poTotal);
    document.getElementById('grandTotal').textContent = formatNumber(invoiceTotal);
    document.getElementById('accountsTotal').textContent = formatNumber(withAccountsTotal);
    document.getElementById('balanceTotal').textContent = formatNumber(balance);
    
    const reportTableBody = document.querySelector('#reportTable tbody');
    reportTableBody.innerHTML = '';
    
    filteredRecords.forEach((record, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${record.poNumber || '-'}</td>
            <td>${record.vendor || '-'}</td>
            <td>${record.invoiceNumber || '-'}</td>
            <td class="numeric">${record.value ? formatNumber(record.value) : '-'}</td>
            <td>${record.releaseDate ? formatDate(record.releaseDate) : '-'}</td>
            <td><span class="status-badge ${getStatusClass(record.status)}">${record.status}</span></td>
        `;
        reportTableBody.appendChild(row);
    });
    
    document.getElementById('reportTotalAmount').textContent = formatNumber(invoiceTotal);
    document.getElementById('reportTable').style.display = 'table';
}

// NOTE SUGGESTIONS FUNCTIONALITY
function updateNoteSuggestions() {
    try {
        const noteSuggestions = document.getElementById('noteSuggestions');
        if (!noteSuggestions) return;
        
        noteSuggestions.innerHTML = '';
        
        const allNotes = records
            .filter(record => record.note && record.note.trim() !== '')
            .map(record => record.note.trim());
        
        const uniqueNotes = [...new Set(allNotes)].sort();
        
        uniqueNotes.forEach(note => {
            const option = document.createElement('option');
            option.value = note;
            noteSuggestions.appendChild(option);
        });
    } catch (error) {
        console.error('Error updating note suggestions:', error);
    }
}

// Vendor suggestions functionality
function updateVendorSuggestions() {
    try {
        const vendorSuggestions = document.getElementById('vendorSuggestions');
        if (!vendorSuggestions) return;
        
        vendorSuggestions.innerHTML = '';
        
        const allVendors = records
            .filter(record => record.vendor && record.vendor.trim() !== '')
            .map(record => record.vendor.trim());
        
        const uniqueVendors = [...new Set(allVendors)].sort();
        
        uniqueVendors.forEach(vendor => {
            const option = document.createElement('option');
            option.value = vendor;
            vendorSuggestions.appendChild(option);
        });
    } catch (error) {
        console.error('Error updating vendor suggestions:', error);
    }
}

// Site suggestions functionality
function updateSiteSuggestions() {
    try {
        const siteSuggestions = document.getElementById('siteSuggestions');
        if (!siteSuggestions) return;
        
        siteSuggestions.innerHTML = '';
        
        const allSites = records
            .filter(record => record.site && record.site.trim() !== '')
            .map(record => record.site.trim());
        
        const uniqueSites = [...new Set(allSites)].sort();
        
        uniqueSites.forEach(site => {
            const option = document.createElement('option');
            option.value = site;
            siteSuggestions.appendChild(option);
        });
    } catch (error) {
        console.error('Error updating site suggestions:', error);
    }
}

function generatePettyCashReport() {
    const searchTerm = document.getElementById('pettyCashSearchTerm').value.trim();
    
    if (!searchTerm) {
        alert('Please enter a search term for the notes field');
        return;
    }
    
    const filteredRecords = records.filter(record => 
        record.note && record.note.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    if (filteredRecords.length === 0) {
        alert('No petty cash records found matching your search criteria');
        return;
    }
    
    const totalValue = filteredRecords
        .reduce((sum, record) => sum + (parseFloat(record.value) || 0), 0);
    
    document.getElementById('pettyCashTotal').textContent = formatNumber(totalValue);
    document.getElementById('pettyCashCount').textContent = filteredRecords.length;
    
    const pettyCashTableBody = document.querySelector('#pettyCashTable tbody');
    pettyCashTableBody.innerHTML = '';
    
    filteredRecords.forEach((record, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${record.poNumber || '-'}</td>
            <td>${record.site || '-'}</td>
            <td>${record.vendor || '-'}</td>
            <td class="numeric">${record.value ? formatNumber(record.value) : '-'}</td>
            <td><span class="status-badge ${getStatusClass(record.status)}">${record.status}</span></td>
        `;
        pettyCashTableBody.appendChild(row);
    });
    
    document.getElementById('pettyCashTableTotal').textContent = formatNumber(totalValue);
    document.getElementById('pettyCashTable').style.display = 'table';
    
    if (window.innerWidth <= 768) {
        document.getElementById('pettyCashSection').scrollIntoView({ behavior: 'smooth' });
    }
}

// Invoice Preview Functions
function showInvoicePreview(record) {
    document.getElementById('previewPoNumber').textContent = record.poNumber || '-';
    document.getElementById('previewInvoiceNumber').textContent = record.invoiceNumber || '-';
    document.getElementById('previewAmount').textContent = record.value ? formatNumber(record.value) : '-';
    document.getElementById('previewStatus').textContent = record.status || '-';
    document.getElementById('previewNotes').textContent = record.note || '-';
    
    const statusSteps = {
        'Open': 0,
        'For SRV': 1,
        'For IPC': 2,
        'No Invoice': 2,
        'Report': 2,
        'Under Review': 3,
        'CEO Approval': 4,
        'With Accounts': 5
    };
    const currentStep = statusSteps[record.status] || 0;
    
    document.querySelectorAll('#invoicePreviewModal .step').forEach((step, index) => {
        step.classList.remove('current');
        if (index < currentStep) {
            step.classList.add('active');
        } else {
            step.classList.remove('active');
        }
    });
    
    if (currentStep > 0) {
        const currentStepElement = document.querySelector(`#invoicePreviewModal .step-${currentStep}`);
        if (currentStepElement) {
            currentStepElement.classList.add('current');
        }
    }
    
    document.querySelectorAll('#invoicePreviewModal .step-connector').forEach((connector, index) => {
        if (index < currentStep - 1) {
            connector.classList.add('active');
        } else {
            connector.classList.remove('active');
        }
    });
    
    document.getElementById('invoicePreviewModal').style.display = 'block';
}

function closeInvoicePreview() {
    document.getElementById('invoicePreviewModal').style.display = 'none';
}

// Contact function
function contactAboutMissingData() {
    const searchTerm = document.getElementById('searchTerm').value;
    const releaseDate = document.getElementById('releaseDateFilter').value;
    const activeFilter = document.querySelector('.filter-btn.active').textContent;
    
    let message = `Hi, I couldn't find the data I was looking for in the Invoice Management System.\n\n`;
    message += `*Search Details:*\n`;
    message += `- Search Term: ${searchTerm || 'None'}\n`;
    message += `- Release Date: ${releaseDate || 'None'}\n`;
    message += `- Filter: ${activeFilter}\n\n`;
    message += `Could you please help me locate this information?`;
    
    const encodedMessage = encodeURIComponent(message);
    const whatsappNumber = '+97450992023';
    
    window.open(`https://wa.me/${whatsappNumber}?text=${encodedMessage}`, '_blank');
}

// Responsive setup
function setupResponsiveElements() {
    detectDeviceType();
    const screenWidth = window.innerWidth;
    
    const allTh = document.querySelectorAll('#recordsTable th');
    const allTd = document.querySelectorAll('#recordsTable td');
    
    allTh.forEach(th => th.style.display = '');
    allTd.forEach(td => td.style.display = '');
    
    if (screenWidth <= 400) {
        document.querySelectorAll('#recordsTable th:nth-child(2), #recordsTable td:nth-child(2), #recordsTable th:nth-child(4), #recordsTable td:nth-child(4), #recordsTable th:nth-child(6), #recordsTable td:nth-child(6), #recordsTable th:nth-child(8), #recordsTable td:nth-child(8)').forEach(el => {
            el.style.display = 'none';
        });
    } else if (screenWidth <= 576) {
        document.querySelectorAll('#recordsTable th:nth-child(2), #recordsTable td:nth-child(2), #recordsTable th:nth-child(3), #recordsTable td:nth-child(3), #recordsTable th:nth-child(7), #recordsTable td:nth-child(7), #recordsTable th:nth-child(8), #recordsTable td:nth-child(8)').forEach(el => {
            el.style.display = 'none';
        });
    } else if (screenWidth <= 768) {
        document.querySelectorAll('#recordsTable th:nth-child(2), #recordsTable td:nth-child(2), #recordsTable th:nth-child(3), #recordsTable td:nth-child(3), #recordsTable th:nth-child(7), #recordsTable td:nth-child(7), #recordsTable th:nth-child(8), #recordsTable td:nth-child(8)').forEach(el => {
            el.style.display = 'none';
        });
    } else if (screenWidth <= 992) {
        document.querySelectorAll('#recordsTable th:nth-child(3), #recordsTable td:nth-child(3), #recordsTable th:nth-child(8), #recordsTable td:nth-child(8)').forEach(el => {
            el.style.display = 'none';
        });
    }
}

// Initialization
document.addEventListener('DOMContentLoaded', function() {
    detectDeviceType();
    updateConnectionStatus(false);
    
    window.addEventListener('resize', setupResponsiveElements);
    
    document.getElementById('connectBtn').addEventListener('click', async function() {
        const btn = this;
        const originalHTML = btn.innerHTML;
        
        btn.disabled = true;
        btn.innerHTML = `<div class="corporate-spinner" style="width: 20px; height: 20px; display: inline-block; margin-right: 10px;"></div> Loading...`;
        
        try {
            await loadFromGitHub(true);
        } catch (error) {
            console.error('Error loading data:', error);
            updateConnectionStatus(false);
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalHTML;
        }
    });
    
    document.querySelectorAll('.mobile-menu input[name="dataSource"]').forEach(radio => {
        radio.addEventListener('change', async function() {
            currentYear = this.value;
            const connectBtn = document.getElementById('connectBtn');
            const originalHTML = connectBtn.innerHTML;
            
            records = [];
            document.getElementById('recordsTable').style.display = 'none';
            connectBtn.disabled = true;
            connectBtn.innerHTML = `<div class="corporate-spinner" style="width: 20px; height: 20px; display: inline-block; margin-right: 10px;"></div> Loading ${currentYear} Data...`;
            
            try {
                const savedData = localStorage.getItem(`recordsData_${currentYear}`);
                if (savedData) {
                    records = JSON.parse(savedData);
                    records = migrateStatus(records);
                    updateNoteSuggestions();
                    updateVendorSuggestions();
                    updateSiteSuggestions();
                }
                
                await loadFromGitHub(true);
                updateConnectionStatus(true);
                
            } catch (error) {
                console.error('Error loading data:', error);
                updateConnectionStatus(false);
            } finally {
                connectBtn.disabled = false;
                connectBtn.innerHTML = originalHTML;
            }
        });
    });
    
    document.getElementById('searchTerm').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            searchRecords();
        }
    });
    
    document.getElementById('reportSearchTerm').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            generateReport();
        }
    });
    
    document.getElementById('pettyCashSearchTerm').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            generatePettyCashReport();
        }
    });
    
    document.querySelector('input[value="2025"]').checked = true;
    loadFromLocalStorage();
    
    const lastFetch = localStorage.getItem(`lastGitHubFetch_${currentYear}`);
    if (!lastFetch || (new Date() - new Date(lastFetch)) > 3600000) {
        loadFromGitHub().catch(() => {
            updateConnectionStatus(false);
        });
    }
});

// Close modal when clicking outside of it
window.addEventListener('click', function(event) {
    const modal = document.getElementById('invoicePreviewModal');
    if (event.target === modal) {
        closeInvoicePreview();
    }
});