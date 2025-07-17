// Firebase configuration - REPLACE WITH YOUR CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyC5zP-voHzrdOxhCzwxoRbUGjcRFNK5cFM",
  authDomain: "invoice-b736b.firebaseapp.com",
  projectId: "invoice-b736b",
  storageBucket: "invoice-b736b.firebasestorage.app",
  messagingSenderId: "1020406824152",
  appId: "1:1020406824152:web:ef195ba58598b1a4d56bad",
  measurementId: "G-GGZWQQ55LD"
};
        
        // Initialize Firebase
        firebase.initializeApp(firebaseConfig);
        const database = firebase.database();
        const auth = firebase.auth();
        
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
        
        // Site WhatsApp numbers mapping
        const SITE_WHATSAPP_NUMBERS = {
            '169': '50992040',
            '174': '50992040',
            '175': '50992040',
            '176': '50992067',
            '166': '50992049',
            '161': '50992040',
            'M161': '50992040',
            'M17': '50992049',
            '168': '39937600',
            '1061': '39964504',
            '1009': '50992083',
            '100': '50992023',
            '173': '39937600',
            'M28': '50485111',
            '180': '50999203',
            '144': '50485111',
            '129': '50992083',
            '137.19': '50485111',
            '122': '50707183'
        };
        
        // Application state
        let records = [];
        let activeFilter = 'all';
        let isLoading = false;
        let currentYear = '2025';
        let currentFilteredRecords = null;
        
        // Chart instances
        let statusPieChart = null;
        let statusBarChart = null;
        
        // DOM Cache
        const domCache = {
            mobileMenu: null,
            siteSearchTerm: null,
            searchTerm: null,
            releaseDateFilter: null,
            pettyCashSearchTerm: null,
            reportSearchTerm: null,
            reportType: null,
            reportStatusFilter: null,
            connectBtn: null,
            statusIndicator: null,
            connectionStatus: null,
            fileInfo: null,
            recordsTable: null,
            siteRecordsTable: null,
            reportTable: null,
            pettyCashTable: null,
            loadingOverlay: null,
            authMessage: null,
            uploadStatus: null,
            manageStatus: null
        };
        
        // Initialize DOM cache
        function cacheDOM() {
            domCache.mobileMenu = document.getElementById('mobileMenu');
            domCache.siteSearchTerm = document.getElementById('siteSearchTerm');
            domCache.searchTerm = document.getElementById('searchTerm');
            domCache.releaseDateFilter = document.getElementById('releaseDateFilter');
            domCache.pettyCashSearchTerm = document.getElementById('pettyCashSearchTerm');
            domCache.reportSearchTerm = document.getElementById('reportSearchTerm');
            domCache.reportType = document.getElementById('reportType');
            domCache.reportStatusFilter = document.getElementById('reportStatusFilter');
            domCache.connectBtn = document.getElementById('connectBtn');
            domCache.statusIndicator = document.getElementById('statusIndicator');
            domCache.connectionStatus = document.getElementById('connectionStatus');
            domCache.fileInfo = document.getElementById('fileInfo');
            domCache.recordsTable = document.getElementById('recordsTable');
            domCache.siteRecordsTable = document.getElementById('siteRecordsTable');
            domCache.reportTable = document.getElementById('reportTable');
            domCache.pettyCashTable = document.getElementById('pettyCashTable');
            domCache.loadingOverlay = document.getElementById('loadingOverlay');
            domCache.authMessage = document.getElementById('authMessage');
            domCache.uploadStatus = document.getElementById('uploadStatus');
            domCache.manageStatus = document.getElementById('manageStatus');
        }
        
        // Mobile detection
        function isMobileDevice() {
            return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        }
        
        // Mobile menu functions
        function toggleMobileMenu() {
            domCache.mobileMenu.classList.toggle('show');
            document.body.style.overflow = domCache.mobileMenu.classList.contains('show') ? 'hidden' : '';
        }
        
        function showSection(sectionId) {
            document.querySelectorAll('.content-section').forEach(section => {
                section.classList.remove('active');
            });
            document.getElementById(sectionId).classList.add('active');
            domCache.mobileMenu.classList.remove('show');
            document.body.style.overflow = '';
            
            if (sectionId === 'pettyCashSection') {
                updateNoteSuggestions();
            }
            
            if (sectionId === 'statementSection') {
                updateVendorSuggestions();
                updateSiteSuggestions();
            }
            
            if (sectionId === 'mainPageSection') {
                searchSiteRecords();
            }
            
            document.querySelectorAll('.menu-item').forEach(item => {
                item.classList.remove('active');
            });
            
            if (sectionId === 'mainPageSection') {
                document.querySelector('.menu-item.main-page').classList.add('active');
            } else if (sectionId === 'invoiceSection') {
                document.querySelector('.menu-item:nth-child(2)').classList.add('active');
            } else if (sectionId === 'statementSection') {
                document.querySelector('.menu-item:nth-child(3)').classList.add('active');
            } else if (sectionId === 'pettyCashSection') {
                document.querySelector('.menu-item:nth-child(4)').classList.add('active');
            } else if (sectionId === 'dataManagementSection') {
                document.querySelector('.menu-item.admin').classList.add('active');
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
            domCache.loadingOverlay.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
        
        function hideLoading() {
            isLoading = false;
            domCache.loadingOverlay.style.display = 'none';
            document.body.style.overflow = '';
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
        
        // Connection status
        function updateConnectionStatus(connected) {
            if (connected) {
                domCache.statusIndicator.className = 'status-indicator connected';
                domCache.connectionStatus.textContent = `Connected to: Firebase (${currentYear})`;
                domCache.connectBtn.innerHTML = `<i class="fas fa-sync-alt"></i> <span class="btn-text">Data Updated (${currentYear})</span>`;
            } else {
                domCache.statusIndicator.className = 'status-indicator disconnected';
                domCache.connectionStatus.textContent = 'Not connected to data source';
                domCache.connectBtn.innerHTML = `<i class="fas fa-sync-alt"></i> <span class="btn-text">Refresh Data</span>`;
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
        
        // Firebase Functions
        function login() {
            const email = document.getElementById('emailInput').value;
            const password = document.getElementById('passwordInput').value;
            
            if (!email || !password) {
                domCache.authMessage.textContent = 'Please enter both email and password';
                return;
            }
            
            showLoading();
            
            auth.signInWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    hideLoading();
                    domCache.authMessage.textContent = '';
                    showSection('mainPageSection');
                    loadFromFirebase();
                })
                .catch((error) => {
                    hideLoading();
                    domCache.authMessage.textContent = error.message;
                });
        }
        
        function loadFromFirebase() {
            showLoading();
            
            const recordsRef = database.ref(`records/${currentYear}`);
            
            recordsRef.once('value')
                .then((snapshot) => {
                    const data = snapshot.val();
                    if (data) {
                        records = Object.values(data);
                        records = migrateStatus(records);
                        updateNoteSuggestions();
                        updateVendorSuggestions();
                        updateSiteSuggestions();
                        updateUI();
                        updateConnectionStatus(true);
                    } else {
                        records = [];
                        updateConnectionStatus(false);
                    }
                    hideLoading();
                })
                .catch((error) => {
                    console.error('Error loading data from Firebase:', error);
                    updateConnectionStatus(false);
                    hideLoading();
                });
        }
        
        function uploadCSV() {
            const fileInput = document.getElementById('csvFileInput');
            const year = document.getElementById('uploadYear').value;
            const file = fileInput.files[0];
            
            if (!file) {
                domCache.uploadStatus.textContent = 'Please select a CSV file';
                domCache.uploadStatus.className = 'upload-status error';
                return;
            }
            
            showLoading();
            domCache.uploadStatus.textContent = 'Processing file...';
            domCache.uploadStatus.className = 'upload-status';
            
            const reader = new FileReader();
            reader.onload = function(e) {
                const csvData = e.target.result;
                
                Papa.parse(csvData, {
                    header: true,
                    skipEmptyLines: true,
                    complete: (results) => {
                        if (results.data.length === 0) {
                            domCache.uploadStatus.textContent = 'No valid data found in CSV';
                            domCache.uploadStatus.className = 'upload-status error';
                            hideLoading();
                            return;
                        }
                        
                        const processedData = processCSVData(results.data);
                        const migratedData = migrateStatus(processedData);
                        
                        // Save to Firebase
                        const recordsRef = database.ref(`records/${year}`);
                        
                        // Convert array to object with keys
                        const recordsObj = {};
                        migratedData.forEach((record, index) => {
                            recordsObj[index] = record;
                        });
                        
                        recordsRef.set(recordsObj)
                            .then(() => {
                                domCache.uploadStatus.textContent = `Successfully uploaded ${migratedData.length} records to Firebase (${year})`;
                                domCache.uploadStatus.className = 'upload-status success';
                                hideLoading();
                                
                                // Reload data if current year matches
                                if (currentYear === year) {
                                    loadFromFirebase();
                                }
                            })
                            .catch((error) => {
                                domCache.uploadStatus.textContent = `Error uploading data: ${error.message}`;
                                domCache.uploadStatus.className = 'upload-status error';
                                hideLoading();
                            });
                    },
                    error: (error) => {
                        domCache.uploadStatus.textContent = `Error parsing CSV: ${error.message}`;
                        domCache.uploadStatus.className = 'upload-status error';
                        hideLoading();
                    }
                });
            };
            
            reader.readAsText(file);
        }
        
        function downloadTemplate() {
            // Create template CSV content
            const headers = [
                'Entered Date', 'Site', 'PO Number', 'PO Value', 'Vendor', 
                'Invoice Number', 'Value', 'Details', 'Release Date', 
                'Status', 'FileName', 'Note'
            ].join(',');
            
            const blob = new Blob([headers], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = 'invoice_template.csv';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
        
        function clearFirebaseData() {
            const year = document.getElementById('manageYear').value;
            
            if (!confirm(`Are you sure you want to clear all ${year} data? This cannot be undone.`)) {
                return;
            }
            
            showLoading();
            domCache.manageStatus.textContent = 'Clearing data...';
            domCache.manageStatus.className = 'upload-status';
            
            const recordsRef = database.ref(`records/${year}`);
            
            recordsRef.remove()
                .then(() => {
                    domCache.manageStatus.textContent = `Successfully cleared ${year} data`;
                    domCache.manageStatus.className = 'upload-status success';
                    hideLoading();
                    
                    // Clear local data if current year matches
                    if (currentYear === year) {
                        records = [];
                        updateUI();
                    }
                })
                .catch((error) => {
                    domCache.manageStatus.textContent = `Error clearing data: ${error.message}`;
                    domCache.manageStatus.className = 'upload-status error';
                    hideLoading();
                });
        }
        
        function updateFileInfo() {
            const timestamp = new Date().toLocaleString();
            let infoHTML = `<strong>Data Source:</strong> Firebase (${currentYear})<br>`;
            infoHTML += `<strong>Last Updated:</strong> ${timestamp}<br>`;
            infoHTML += `<strong>Records Loaded:</strong> ${records.length}`;
            
            domCache.fileInfo.innerHTML = infoHTML;
        }
        
        // Optimized UI updates
        function updateUI() {
            updateConnectionStatus(true);
            updateFileInfo();
            searchRecords();
        }
        
        // Table functions
        function refreshTable(filteredRecords = null) {
            const tableBody = document.querySelector('#recordsTable tbody');
            tableBody.innerHTML = '';
            
            const displayRecords = filteredRecords || records;
            currentFilteredRecords = displayRecords;
            
            if (displayRecords.length === 0) {
                domCache.recordsTable.style.display = 'none';
                return;
            }
            
            domCache.recordsTable.style.display = 'table';
            
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
            <i class="fas fa-file-pdf"></i> INV
          </button>
          <button class="btn btn-srv ${!record.details ? 'disabled' : ''}" 
            onclick="viewSRV('${record.details || ''}')" 
            ${!record.details ? 'disabled' : ''}>
            <i class="fas fa-file-alt"></i> SRV
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
        
        // Main Dashboard Functions
        function initializeCharts(filteredRecords = null) {
            const displayRecords = filteredRecords || records.filter(record => record.status !== 'With Accounts');
            
            // Prepare data for charts
            const statusCounts = {};
            displayRecords.forEach(record => {
                statusCounts[record.status] = (statusCounts[record.status] || 0) + 1;
            });
            
            const statusLabels = Object.keys(statusCounts);
            const statusData = Object.values(statusCounts);
            const backgroundColors = statusLabels.map(status => {
                const statusColors = {
                    'For SRV': '#4e73df',
                    'For IPC': '#1cc88a',
                    'Under Review': '#36b9cc',
                    'CEO Approval': '#f6c23e',
                    'Open': '#e74a3b',
                    'Pending': '#858796',
                    'Report': '#5a5c69',
                    'No Invoice': '#2c3e50'
                };
                return statusColors[status] || '#cccccc';
            });
            
            // Pie Chart
            const pieCtx = document.getElementById('statusPieChart').getContext('2d');
            if (statusPieChart) statusPieChart.destroy();
            statusPieChart = new Chart(pieCtx, {
                type: 'pie',
                data: {
                    labels: statusLabels,
                    datasets: [{
                        data: statusData,
                        backgroundColor: backgroundColors,
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                        },
                        title: {
                            display: true,
                            text: 'Invoice Status Distribution',
                            font: {
                                size: 16
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const label = context.label || '';
                                    const value = context.raw || 0;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = Math.round((value / total) * 100);
                                    return `${label}: ${value} (${percentage}%)`;
                                }
                            }
                        }
                    },
                    onClick: function(evt, elements) {
                        if (elements.length > 0) {
                            const clickedIndex = elements[0].index;
                            const status = statusLabels[clickedIndex];
                            filterSiteRecords(status);
                        }
                    }
                }
            });
            
            // Bar Chart
            const barCtx = document.getElementById('statusBarChart').getContext('2d');
            if (statusBarChart) statusBarChart.destroy();
            statusBarChart = new Chart(barCtx, {
                type: 'bar',
                data: {
                    labels: statusLabels,
                    datasets: [{
                        label: 'Count',
                        data: statusData,
                        backgroundColor: backgroundColors,
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                stepSize: 1
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        },
                        title: {
                            display: true,
                            text: 'Invoice Status Count',
                            font: {
                                size: 16
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const label = context.dataset.label || '';
                                    const value = context.raw || 0;
                                    return `${label}: ${value}`;
                                }
                            }
                        }
                    },
                    onClick: function(evt, elements) {
                        if (elements.length > 0) {
                            const clickedIndex = elements[0].index;
                            const status = statusLabels[clickedIndex];
                            filterSiteRecords(status);
                        }
                    }
                }
            });
        }
        
        function searchSiteRecords() {
            const term = domCache.siteSearchTerm.value.toLowerCase();
            let filtered = records.filter(record => record.status !== 'With Accounts');
            
            if (term) {
                filtered = filtered.filter(record => 
                    record.site && record.site.toLowerCase().includes(term)
                );
            }
            
            currentFilteredRecords = filtered;
            refreshSiteTable(filtered);
            initializeCharts(filtered);
        }
        
        function filterSiteRecords(status) {
            const term = domCache.siteSearchTerm.value.toLowerCase();
            let filtered = records.filter(record => record.status !== 'With Accounts');
            
            if (term) {
                filtered = filtered.filter(record => 
                    record.site && record.site.toLowerCase().includes(term)
                );
            }
            
            if (status !== 'all') {
                filtered = filtered.filter(record => record.status === status);
            }
            
            refreshSiteTable(filtered);
        }
        
        function refreshSiteTable(filteredRecords = null) {
            const tableBody = document.querySelector('#siteRecordsTable tbody');
            tableBody.innerHTML = '';
            
            const displayRecords = filteredRecords || records.filter(record => record.status !== 'With Accounts');
            currentFilteredRecords = displayRecords;
            
            if (displayRecords.length === 0) {
                domCache.siteRecordsTable.style.display = 'none';
                return;
            }
            
            domCache.siteRecordsTable.style.display = 'table';
            
            displayRecords.forEach((record, index) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${index + 1}</td>
                    <td>${record.releaseDate ? formatDate(record.releaseDate) : '-'}</td>
                    <td>${record.site || '-'}</td>
                    <td>${record.poNumber || '-'}</td>
                    <td>${record.vendor || '-'}</td>
                    <td>${record.invoiceNumber || '-'}</td>
                    <td class="numeric">${record.value ? formatNumber(record.value) : '-'}</td>
                    <td><span class="status-badge ${getStatusClass(record.status)}">${record.status}</span></td>
                    <td>${record.note || '-'}</td>
                `;
                
                row.addEventListener('click', function() {
                    showDashboardRecordPreview(record);
                });
                
                tableBody.appendChild(row);
            });
            
            setupResponsiveElements();
        }
        
        function showDashboardRecordPreview(record) {
            document.getElementById('dashboardPreviewPoNumber').textContent = record.poNumber || '-';
            document.getElementById('dashboardPreviewInvoiceNumber').textContent = record.invoiceNumber || '-';
            document.getElementById('dashboardPreviewAmount').textContent = record.value ? formatNumber(record.value) : '-';
            document.getElementById('dashboardPreviewStatus').textContent = record.status || '-';
            document.getElementById('dashboardPreviewNotes').textContent = record.note || '-';
            
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
            
            document.querySelectorAll('#dashboardPreviewModal .step').forEach((step, index) => {
                step.classList.remove('current');
                if (index < currentStep) {
                    step.classList.add('active');
                } else {
                    step.classList.remove('active');
                }
            });
            
            if (currentStep > 0) {
                const currentStepElement = document.querySelector(`#dashboardPreviewModal .step-${currentStep}`);
                if (currentStepElement) {
                    currentStepElement.classList.add('current');
                }
            }
            
            document.querySelectorAll('#dashboardPreviewModal .step-connector').forEach((connector, index) => {
                if (index < currentStep - 1) {
                    connector.classList.add('active');
                } else {
                    connector.classList.remove('active');
                }
            });
            
            // Update WhatsApp button with site-specific number
            const whatsappBtn = document.getElementById('dashboardWhatsappReminderBtn');
            let whatsappNumber = '50992023'; // Default number
            
            // Extract site number from the record's site
            if (record.site) {
                for (const [sitePattern, number] of Object.entries(SITE_WHATSAPP_NUMBERS)) {
                    if (record.site.includes(sitePattern)) {
                        whatsappNumber = number;
                        break;
                    }
                }
            }
            
            whatsappBtn.onclick = function() {
                sendWhatsAppReminder(record, whatsappNumber);
            };
            
            document.getElementById('dashboardPreviewModal').style.display = 'block';
            document.body.style.overflow = 'hidden';
        }
        
        function closeDashboardPreview() {
            document.getElementById('dashboardPreviewModal').style.display = 'none';
            document.body.style.overflow = '';
        }
        
        function clearSiteSearch() {
            domCache.siteSearchTerm.value = '';
            searchSiteRecords();
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
            const term = domCache.searchTerm.value.toLowerCase();
            const releaseDateInput = domCache.releaseDateFilter.value;
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
            activeFilter = status === 'all' ? 'all' : status;
        
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.classList.remove('active');
                if (btn.textContent === (status === 'all' ? 'All' : status)) {
                    btn.classList.add('active');
                }
            });
        
            if (document.getElementById('mainPageSection').classList.contains('active')) {
                let filtered = records.filter(record => record.status !== 'With Accounts');
                if (status !== 'all') {
                    filtered = filtered.filter(record => record.status === status);
                }
                refreshSiteTable(filtered);
            } else {
                searchRecords();
            }
        }
        
        function clearSearch() {
            domCache.searchTerm.value = '';
            domCache.releaseDateFilter.value = '';
            activeFilter = 'all';
            
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.classList.remove('active');
                if (btn.textContent === 'All') {
                    btn.classList.add('active');
                }
            });
            
            searchRecords();
        }
        
        function clearDate() {
            domCache.releaseDateFilter.value = '';
            searchRecords();
        }
        
        function clearReportSearch() {
            domCache.reportSearchTerm.value = '';
            domCache.reportType.value = 'po';
            domCache.reportStatusFilter.value = 'all';
            document.getElementById('reportHeader').innerHTML = '';
            domCache.reportTable.style.display = 'none';
            document.getElementById('poTotal').textContent = '0.00';
            document.getElementById('grandTotal').textContent = '0.00';
            document.getElementById('accountsTotal').textContent = '0.00';
            document.getElementById('balanceTotal').textContent = '0.00';
            document.querySelector('#reportTable tbody').innerHTML = '';
        }
        
        function clearPettyCashSearch() {
            domCache.pettyCashSearchTerm.value = '';
            document.getElementById('pettyCashTotal').textContent = '0.00';
            document.getElementById('pettyCashCount').textContent = '0';
            domCache.pettyCashTable.style.display = 'none';
            document.getElementById('pettyCashTableTotal').textContent = '0.00';
            document.querySelector('#pettyCashTable tbody').innerHTML = '';
        }
        
        // Report functions
        function generateReport() {
            const reportType = domCache.reportType.value;
            const searchTerm = domCache.reportSearchTerm.value.trim();
            const statusFilter = domCache.reportStatusFilter.value;
            
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
            domCache.reportTable.style.display = 'table';
        }
        
        // Enhanced print functions
        function handleMobilePrint() {
            if (isMobileDevice()) {
                return true;
            }
            return false;
        }
        
        async function generatePDF(contentElementId, title = 'Report') {
            try {
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF();
                
                // Add title
                doc.setFontSize(18);
                doc.text(title, 105, 15, { align: 'center' });
                
                // Get the HTML content
                const contentElement = document.getElementById(contentElementId);
                const printContent = contentElement.cloneNode(true);
                
                // Remove elements that shouldn't be printed
                const elementsToRemove = printContent.querySelectorAll('.report-controls, .report-actions, .back-btn');
                elementsToRemove.forEach(el => el.remove());
                
                // Add content to PDF
                await doc.html(printContent, {
                    margin: [20, 15, 20, 15],
                    width: 170,
                    windowWidth: 800,
                    autoPaging: 'text',
                    x: 20,
                    y: 25
                });
                
                // Open the PDF in new tab for preview
                const pdfUrl = doc.output('bloburl');
                window.open(pdfUrl, '_blank');
                
                return true;
            } catch (error) {
                console.error('PDF generation error:', error);
                alert('Failed to generate PDF. Please try again or use the print option.');
                return false;
            }
        }
        
        function printReport() {
            const contentElement = document.getElementById('statementSection');
            const printContent = contentElement.cloneNode(true);
            
            // Remove elements that shouldn't be printed
            const elementsToRemove = printContent.querySelectorAll('.report-controls, .report-actions, .back-btn');
            elementsToRemove.forEach(el => el.remove());
            
            // Create a new window for printing
            const printWindow = window.open('', '_blank');
            
            // Add CSS for printing
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Print Report</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 0; padding: 15px; }
                        table { width: 100%; border-collapse: collapse; }
                        th, td { padding: 8px; border: 1px solid #ddd; }
                        th { background-color: #4a6fa5 !important; color: white !important; -webkit-print-color-adjust: exact; }
                        .total-row { font-weight: bold; background-color: #e9f7fe; }
                        .numeric { text-align: right; }
                        @page { size: auto; margin: 5mm; }
                        @media print {
                            body { padding: 0; margin: 0; }
                            .financial-summary { page-break-inside: avoid; }
                            table { page-break-inside: auto; }
                            tr { page-break-inside: avoid; page-break-after: auto; }
                        }
                    </style>
                </head>
                <body>
                    ${printContent.innerHTML}
                    <script>
                        window.onload = function() {
                            setTimeout(function() {
                                window.print();
                                window.close();
                            }, 200);
                        }
                    </script>
                </body>
                </html>
            `);
            printWindow.document.close();
        }
        
        function printPettyCashReport() {
            const contentElement = document.getElementById('pettyCashSection');
            const printContent = contentElement.cloneNode(true);
            
            // Remove elements that shouldn't be printed
            const elementsToRemove = printContent.querySelectorAll('.report-controls, .report-actions, .back-btn');
            elementsToRemove.forEach(el => el.remove());
            
            // Create a new window for printing
            const printWindow = window.open('', '_blank');
            
            // Add CSS for printing
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Print Petty Cash Report</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 0; padding: 15px; }
                        table { width: 100%; border-collapse: collapse; }
                        th, td { padding: 8px; border: 1px solid #ddd; }
                        th { background-color: #4a6fa5 !important; color: white !important; -webkit-print-color-adjust: exact; }
                        .total-row { font-weight: bold; background-color: #e9f7fe; }
                        .numeric { text-align: right; }
                        @page { size: auto; margin: 5mm; }
                        @media print {
                            body { padding: 0; margin: 0; }
                            .financial-summary { page-break-inside: avoid; }
                            table { page-break-inside: auto; }
                            tr { page-break-inside: avoid; page-break-after: auto; }
                        }
                    </style>
                </head>
                <body>
                    ${printContent.innerHTML}
                    <script>
                        window.onload = function() {
                            setTimeout(function() {
                                window.print();
                                window.close();
                            }, 200);
                        }
                    </script>
                </body>
                </html>
            `);
            printWindow.document.close();
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
                const siteSuggestionsMain = document.getElementById('siteSuggestionsMain');
                if (!siteSuggestions || !siteSuggestionsMain) return;
                
                siteSuggestions.innerHTML = '';
                siteSuggestionsMain.innerHTML = '';
                
                const allSites = records
                    .filter(record => record.site && record.site.trim() !== '')
                    .map(record => record.site.trim());
                
                const uniqueSites = [...new Set(allSites)].sort();
                
                uniqueSites.forEach(site => {
                    const option = document.createElement('option');
                    option.value = site;
                    siteSuggestions.appendChild(option);
                    siteSuggestionsMain.appendChild(option.cloneNode(true));
                });
            } catch (error) {
                console.error('Error updating site suggestions:', error);
            }
        }
        
        function generatePettyCashReport() {
            const searchTerm = domCache.pettyCashSearchTerm.value.trim();
            
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
            domCache.pettyCashTable.style.display = 'table';
            
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
            
            // Update WhatsApp button with site-specific number
            const whatsappBtn = document.getElementById('whatsappReminderBtn');
            let whatsappNumber = '50992023'; // Default number
            
            // Extract site number from the record's site
            if (record.site) {
                for (const [sitePattern, number] of Object.entries(SITE_WHATSAPP_NUMBERS)) {
                    if (record.site.includes(sitePattern)) {
                        whatsappNumber = number;
                        break;
                    }
                }
            }
            
            whatsappBtn.onclick = function() {
                sendWhatsAppReminder(record, whatsappNumber);
            };
            
            document.getElementById('invoicePreviewModal').style.display = 'block';
            document.body.style.overflow = 'hidden';
        }
        
        function closeInvoicePreview() {
            document.getElementById('invoicePreviewModal').style.display = 'none';
            document.body.style.overflow = '';
        }
        
        // WhatsApp reminder function
        function sendWhatsAppReminder(record, whatsappNumber) {
            let message = `*Invoice Reminder*\n\n`;
            message += `PO: ${record.poNumber || 'N/A'}\n`;
            message += `Invoice: ${record.invoiceNumber || 'N/A'}\n`;
            message += `Vendor: ${record.vendor || 'N/A'}\n`;
            message += `Amount: ${record.value ? formatNumber(record.value) : 'N/A'}\n`;
            message += `Status: ${record.status || 'N/A'}\n\n`;
            message += `Please provide an update on this invoice.`;
            
            const encodedMessage = encodeURIComponent(message);
            window.open(`https://wa.me/${whatsappNumber}?text=${encodedMessage}`, '_blank');
        }
        
        // Contact function
        function contactAboutMissingData() {
            const searchTerm = domCache.searchTerm.value;
            const releaseDate = domCache.releaseDateFilter.value;
            const activeFilter = document.querySelector('.filter-btn.active').textContent;
            
            let message = `Hi, Irwin.\n\n`;
            
            const encodedMessage = encodeURIComponent(message);
            const whatsappNumber = '+97450992023';
            
            window.open(`https://wa.me/${whatsappNumber}?text=${encodedMessage}`, '_blank');
        }
        
        // Share functions
        function shareReportViaWhatsApp() {
            const reportHeader = document.getElementById('reportHeader').textContent;
            const totalAmount = document.getElementById('grandTotal').textContent;
            
            let message = `*Report Summary*\n\n`;
            message += `${reportHeader}\n\n`;
            message += `*Total Amount:* ${totalAmount}\n\n`;
            message += `Generated from IBA Trading Invoice Management System`;
            
            const encodedMessage = encodeURIComponent(message);
            const whatsappNumber = '+97450992023';
            
            window.open(`https://wa.me/${whatsappNumber}?text=${encodedMessage}`, '_blank');
        }
        
        function sharePettyCashViaWhatsApp() {
            const totalAmount = document.getElementById('pettyCashTotal').textContent;
            const recordCount = document.getElementById('pettyCashCount').textContent;
            const searchTerm = domCache.pettyCashSearchTerm.value;
            
            let message = `*Petty Cash Summary*\n\n`;
            message += `Search Term: ${searchTerm}\n`;
            message += `Records Found: ${recordCount}\n`;
            message += `Total Amount: ${totalAmount}\n\n`;
            message += `Generated from IBA Trading Invoice Management System`;
            
            const encodedMessage = encodeURIComponent(message);
            const whatsappNumber = '+97450992023';
            
            window.open(`https://wa.me/${whatsappNumber}?text=${encodedMessage}`, '_blank');
        }
        
        // Responsive setup
        function setupResponsiveElements() {
            detectDeviceType();
            const screenWidth = window.innerWidth;
            
            // Reset all hidden columns first
            document.querySelectorAll('#recordsTable th, #recordsTable td, #siteRecordsTable th, #siteRecordsTable td').forEach(el => {
                el.style.display = '';
            });
            
            // Records table responsiveness
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
                
                // Site records table responsiveness
                document.querySelectorAll('#siteRecordsTable th:nth-child(2), #siteRecordsTable td:nth-child(2), #siteRecordsTable th:nth-child(9), #siteRecordsTable td:nth-child(9)').forEach(el => {
                    el.style.display = 'none';
                });
            } else if (screenWidth <= 992) {
                document.querySelectorAll('#recordsTable th:nth-child(3), #recordsTable td:nth-child(3), #recordsTable th:nth-child(8), #recordsTable td:nth-child(8)').forEach(el => {
                    el.style.display = 'none';
                });
            }
            
            // Extra small screens
            if (screenWidth <= 480) {
                document.querySelectorAll('#siteRecordsTable th:nth-child(4), #siteRecordsTable td:nth-child(4), #siteRecordsTable th:nth-child(5), #siteRecordsTable td:nth-child(5), #siteRecordsTable th:nth-child(6), #siteRecordsTable td:nth-child(6)').forEach(el => {
                    el.style.display = 'none';
                });
            }
        }
        
        // Initialization
        document.addEventListener('DOMContentLoaded', function() {
            cacheDOM();
            detectDeviceType();
            updateConnectionStatus(false);
            
            window.addEventListener('resize', setupResponsiveElements);
            
            domCache.connectBtn.addEventListener('click', async function() {
                const btn = this;
                const originalHTML = btn.innerHTML;
                
                btn.disabled = true;
                btn.innerHTML = `<div class="corporate-spinner" style="width: 20px; height: 20px; display: inline-block; margin-right: 10px;"></div> Loading...`;
                
                try {
                    await loadFromFirebase();
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
                    const connectBtn = domCache.connectBtn;
                    const originalHTML = connectBtn.innerHTML;
                    
                    records = [];
                    domCache.recordsTable.style.display = 'none';
                    connectBtn.disabled = true;
                    connectBtn.innerHTML = `<div class="corporate-spinner" style="width: 20px; height: 20px; display: inline-block; margin-right: 10px;"></div> Loading ${currentYear} Data...`;
                    
                    try {
                        await loadFromFirebase();
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
            
            domCache.searchTerm.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    searchRecords();
                }
            });
            
            domCache.reportSearchTerm.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    generateReport();
                }
            });
            
            domCache.pettyCashSearchTerm.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    generatePettyCashReport();
                }
            });
            
            domCache.siteSearchTerm.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    searchSiteRecords();
                }
            });
            
            document.querySelector('input[value="2025"]').checked = true;
        });
        
        // Close modal when clicking outside of it
        window.addEventListener('click', function(event) {
            const modal = document.getElementById('invoicePreviewModal');
            const dashboardModal = document.getElementById('dashboardPreviewModal');
            
            if (event.target === modal) {
                closeInvoicePreview();
            }
            
            if (event.target === dashboardModal) {
                closeDashboardPreview();
            }
        });