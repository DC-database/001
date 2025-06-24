// Enhanced device detection
function detectDeviceType() {
    const screenWidth = window.innerWidth;
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    if (isTouchDevice) {
        document.body.classList.add('touch-device');
        
        if (screenWidth <= 576) {
            document.body.classList.add('mobile-device');
            document.body.classList.remove('tablet-device', 'desktop-device');
        } else if (screenWidth <= 992) {
            document.body.classList.add('tablet-device');
            document.body.classList.remove('mobile-device', 'desktop-device');
        } else {
            document.body.classList.add('desktop-device');
            document.body.classList.remove('mobile-device', 'tablet-device');
        }
    } else {
        document.body.classList.add('desktop-device');
        document.body.classList.remove('mobile-device', 'tablet-device', 'touch-device');
    }
}

// Environment detection
const isLocal = window.location.protocol === 'file:' || 
                window.location.hostname === 'localhost' || 
                window.location.hostname.endsWith('.local');

// Path configurations
const PDF_BASE_PATH = isLocal ? "L:/Files/INVOICE/" : null;
const SRV_BASE_PATH = isLocal ? "L:/Files/SRV/" : null;

// GitHub CSV URLs
const GITHUB_CSV_URLS = {
    '2025': "https://raw.githubusercontent.com/DC-database/Invoice/main/records_2025.csv",
    '2022-2024': "https://raw.githubusercontent.com/DC-database/Invoice/main/records_2022-2024.csv"
};

// Application state
let records = [];
let activeFilter = 'all';
let usingGitHub = false;
let isLoading = false;

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
        'For SRV': 25,
        'For IPC': 50,
        'No Invoice': 50,
        'Report': 50,
        'Under Review': 60,
        'CEO Approval': 80,
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
    const selectedYear = document.querySelector('input[name="dataSource"]:checked').value;
    const url = GITHUB_CSV_URLS[selectedYear];
    const fileInfo = document.getElementById('fileInfo');
    
    try {
        const lastUpdated = await getGitHubFileLastUpdated(url);
        const lastFetch = localStorage.getItem(`lastGitHubFetch_${selectedYear}`);
        
        let infoHTML = `<strong>File Source:</strong> ${selectedYear} CSV<br>`;
        
        if (lastUpdated) {
            infoHTML += `<strong>Last Updated on Main Server:</strong> ${formatDateForDisplay(lastUpdated)}<br>`;
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

// Report section functions
function toggleReportSection() {
    const reportSection = document.getElementById('statementOfAccountSection');
    reportSection.style.display = reportSection.style.display === 'none' ? 'block' : 'none';
    
    // Scroll to report section on mobile
    if (window.innerWidth <= 768 && reportSection.style.display === 'block') {
        reportSection.scrollIntoView({ behavior: 'smooth' });
    }
}

function closeReportSection() {
    document.getElementById('statementOfAccountSection').style.display = 'none';
}

function clearReportSearch() {
    document.getElementById('reportSearchTerm').value = '';
    document.getElementById('reportType').selectedIndex = 0;
    document.getElementById('reportTable').style.display = 'none';
    document.getElementById('reportHeader').innerHTML = '';
    document.getElementById('poTotal').textContent = '0.00';
    document.getElementById('grandTotal').textContent = '0.00';
    document.getElementById('accountsTotal').textContent = '0.00';
    document.getElementById('balanceTotal').textContent = '0.00';
    document.querySelector('#reportTable tbody').innerHTML = '';
    document.getElementById('reportTotalAmount').textContent = '0.00';
}

// Connection status
function updateConnectionStatus(connected) {
    const indicator = document.getElementById('statusIndicator');
    const statusText = document.getElementById('connectionStatus');
    const connectBtn = document.getElementById('connectBtn');
    const selectedYear = document.querySelector('input[name="dataSource"]:checked').value;

    if (connected) {
        indicator.className = 'status-indicator connected';
        statusText.textContent = `Connected to: ${selectedYear} CSV`;
        connectBtn.innerHTML = `
            <svg class="excel-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            Data Updated (${selectedYear})
        `;
        usingGitHub = true;
    } else {
        indicator.className = 'status-indicator disconnected';
        statusText.textContent = 'Not connected to data source';
        connectBtn.innerHTML = `
            <svg class="excel-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            Click to Refresh Data
        `;
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
    const selectedYear = document.querySelector('input[name="dataSource"]:checked').value;
    const url = GITHUB_CSV_URLS[selectedYear] + (forceRefresh ? `?timestamp=${new Date().getTime()}` : '');
    
    try {
        showLoading();
        const response = await fetch(url);
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
                    
                    localStorage.setItem(`recordsData_${selectedYear}`, JSON.stringify(records));
                    localStorage.setItem(`lastGitHubFetch_${selectedYear}`, new Date().toISOString());
                    
                    refreshTable();
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
        throw error;
    } finally {
        hideLoading();
    }
}

function loadFromLocalStorage() {
    const selectedYear = document.querySelector('input[name="dataSource"]:checked').value;
    const savedData = localStorage.getItem(`recordsData_${selectedYear}`);
    
    if (savedData) {
        try {
            records = JSON.parse(savedData);
            records = migrateStatus(records);
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
    const selectedYear = document.querySelector('input[name="dataSource"]:checked').value;
    localStorage.setItem(`recordsData_${selectedYear}`, JSON.stringify(records));
}

function clearLocalStorage() {
    if (confirm('Are you sure you want to clear all locally cached data? This cannot be undone.')) {
        const previousSelection = document.querySelector('input[name="dataSource"]:checked').value;
        document.querySelector('input[value="2025"]').checked = true;
        
        loadFromGitHub(true).then(() => {
            document.querySelector(`input[value="${previousSelection}"]`).checked = true;
            if (previousSelection !== '2025') {
                loadFromGitHub(true);
            }
        }).catch(() => {
            location.reload(true);
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
                        <div class="step step-1 ${percentage >= 25 ? 'active' : ''}"></div>
                        <div class="step-connector ${percentage >= 25 ? 'active' : ''}"></div>
                        <div class="step step-2 ${percentage >= 50 ? 'active' : ''}"></div>
                        <div class="step-connector ${percentage >= 50 ? 'active' : ''}"></div>
                        <div class="step step-3 ${percentage >= 60 ? 'active' : ''}"></div>
                        <div class="step-connector ${percentage >= 60 ? 'active' : ''}"></div>
                        <div class="step step-4 ${percentage >= 80 ? 'active' : ''}"></div>
                        <div class="step-connector ${percentage >= 80 ? 'active' : ''}"></div>
                        <div class="step step-5 ${percentage >= 100 ? 'active' : ''}"></div>
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
                  ${!record.fileName ? 'disabled' : ''}>INV</button>
                <button class="btn btn-srv ${!record.details ? 'disabled' : ''}" 
                  onclick="viewSRV('${record.details || ''}')" 
                  ${!record.details ? 'disabled' : ''}>SRV</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
    
    // Apply responsive adjustments after table refresh
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
            (record.fileName && record.fileName.toLowerCase().includes(term))
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

// Export functions
function showPreview() {
    const modal = document.getElementById('previewModal');
    modal.style.display = 'block';
    
    const previewContainer = document.getElementById('previewTableContainer');
    previewContainer.innerHTML = '';
    
    const table = document.createElement('table');
    table.className = 'preview-table';
    
    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th>ID</th>
            <th>Date</th>
            <th>Site</th>
            <th>PO Number</th>
            <th>Vendor</th>
            <th>Invoice</th>
            <th>Amount</th>
            <th>Status</th>
        </tr>
    `;
    table.appendChild(thead);
    
    const tbody = document.createElement('tbody');
    let total = 0;
    
    document.querySelectorAll('#recordsTable tbody tr').forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 10) {
            const value = parseFloat(cells[6].textContent.replace(/,/g, '')) || 0;
            total += value;
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${cells[0].textContent.trim()}</td>
                <td>${cells[1].textContent.trim()}</td>
                <td>${cells[2].textContent.trim()}</td>
                <td>${cells[3].textContent.trim()}</td>
                <td>${cells[4].textContent.trim()}</td>
                <td>${cells[5].textContent.trim()}</td>
                <td class="numeric">${formatNumber(value)}</td>
                <td>${cells[8].textContent.trim()}</td>
            `;
            tbody.appendChild(tr);
        }
    });
    
    const totalRow = document.createElement('tr');
    totalRow.className = 'total-row';
    totalRow.innerHTML = `
        <td colspan="6" style="text-align: right;">TOTAL</td>
        <td class="numeric">${formatNumber(total)}</td>
        <td></td>
    `;
    tbody.appendChild(totalRow);
    
    table.appendChild(tbody);
    previewContainer.appendChild(table);
    
    document.querySelector('.close').onclick = function() {
        modal.style.display = 'none';
    };
    
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    };
}

function exportPreviewToExcel() {
    const tableRows = document.querySelectorAll('#recordsTable tbody tr');
    const exportData = [];
    let total = 0;

    tableRows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 10) {
            const value = parseFloat(cells[6].textContent.replace(/,/g, '')) || 0;
            total += value;

            exportData.push({
                'ID': cells[0].textContent.trim(),
                'Date': cells[1].textContent.trim(),
                'Site': cells[2].textContent.trim(),
                'PO Number': cells[3].textContent.trim(),
                'Vendor': cells[4].textContent.trim(),
                'Invoice': cells[5].textContent.trim(),
                'Amount': value.toFixed(2),
                'Status': cells[8].textContent.trim()
            });
        }
    });

    exportData.push({ 'Invoice': 'TOTAL', 'Amount': total.toFixed(2) });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "InvoiceRecords");
    
    const companyInfo = [
        ["IBA Trading Invoice Management System"],
        ["Export Date: " + new Date().toLocaleDateString()],
        [""]
    ];
    
    XLSX.utils.sheet_add_aoa(ws, companyInfo, { origin: "A1" });
    
    if (!ws['!merges']) ws['!merges'] = [];
    ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } });
    ws['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 1, c: 7 } });
    
    XLSX.writeFile(wb, "invoice_records.xlsx");
    document.getElementById('previewModal').style.display = 'none';
}

function exportPreviewToPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const tableRows = document.querySelectorAll('#recordsTable tbody tr');
    const data = [];
    let total = 0;

    doc.setFontSize(16);
    doc.setTextColor(40);
    doc.text('IBA Trading Invoice Management System', 105, 15, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text('Export Date: ' + new Date().toLocaleDateString(), 105, 22, { align: 'center' });
    
    doc.setDrawColor(74, 111, 165);
    doc.setLineWidth(0.5);
    doc.line(20, 25, 190, 25);

    tableRows.forEach((row, index) => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 10) {
            const value = parseFloat(cells[6].textContent.replace(/,/g, '')) || 0;
            total += value;

            data.push([
                index + 1,
                cells[1].textContent.trim(),
                cells[2].textContent.trim(),
                cells[3].textContent.trim(),
                cells[4].textContent.trim(),
                cells[5].textContent.trim(),
                formatNumber(value),
                cells[8].textContent.trim()
            ]);
        }
    });

    data.push(['', '', '', '', 'TOTAL', formatNumber(total), '', '']);

    doc.autoTable({
        head: [['ID', 'Date', 'Site', 'PO', 'Vendor', 'Invoice', 'Amount', 'Status']],
        body: data,
        startY: 30,
        headStyles: {
            fillColor: [74, 111, 165],
            textColor: 255,
            fontStyle: 'bold'
        },
        alternateRowStyles: {
            fillColor: [240, 240, 240]
        },
        margin: { top: 30 },
        styles: {
            cellPadding: 3,
            fontSize: 9,
            valign: 'middle'
        },
        columnStyles: {
            6: { halign: 'right' }
        }
    });

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.setTextColor(150);
        doc.text(`Page ${i} of ${pageCount}`, 105, doc.internal.pageSize.height - 10, { align: 'center' });
    }

    doc.save("invoice_records.pdf");
    document.getElementById('previewModal').style.display = 'none';
}

function exportToExcel() {
    showPreview();
}

function exportToPDF() {
    showPreview();
}

// Report functions
function generateReport() {
    const reportType = document.getElementById('reportType').value;
    const searchTerm = document.getElementById('reportSearchTerm').value.trim();
    
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
                    Site: ${filteredRecords[0].site || 'N/A'}`;
            }
            break;
            
        case 'vendor':
            filteredRecords = records.filter(record => 
                record.vendor && record.vendor.toLowerCase().includes(searchTerm.toLowerCase())
            );
            if (filteredRecords.length > 0) {
                headerText = `Vendor: ${filteredRecords[0].vendor}<br>
                    Records: ${filteredRecords.length}`;
            }
            break;
            
        case 'site':
            filteredRecords = records.filter(record => 
                record.site && record.site.toLowerCase().includes(searchTerm.toLowerCase())
            );
            if (filteredRecords.length > 0) {
                headerText = `Site: ${filteredRecords[0].site}<br>
                    Records: ${filteredRecords.length}`;
            }
            break;
    }
    
    if (filteredRecords.length === 0) {
        alert('No records found matching your search criteria');
        return;
    }
    
    const invoiceTotal = filteredRecords
        .reduce((sum, record) => sum + (parseFloat(record.value) || 0), 0);
        
    const poTotal = filteredRecords.length > 0 ? 
        parseFloat(filteredRecords[0].poValue) || 0 : 0;
    
    const withAccountsTotal = filteredRecords
        .filter(record => record.status === 'With Accounts')
        .reduce((sum, record) => sum + (parseFloat(record.value) || 0), 0);
    
    const balance = poTotal - invoiceTotal;

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
            <td>${formatDate(record.entryDate)}</td>
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
    document.getElementById('statementOfAccountSection').style.display = 'block';
    document.getElementById('reportTable').style.display = 'table';
    
    // Scroll to report section on mobile
    if (window.innerWidth <= 768) {
        document.querySelector('.report-section').scrollIntoView({ behavior: 'smooth' });
    }
}

function exportReport() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'pt', 'a4');
    const reportHeader = document.getElementById('reportHeader').textContent;
    const poTotal = document.getElementById('poTotal').textContent;
    const invoiceTotal = document.getElementById('grandTotal').textContent;
    const accountsTotal = document.getElementById('accountsTotal').textContent;
    const balance = document.getElementById('balanceTotal').textContent;
    
    const reportType = document.getElementById('reportType').value;
    const searchTerm = document.getElementById('reportSearchTerm').value.trim();
    let filteredRecords = [];
    
    switch(reportType) {
        case 'po':
            filteredRecords = records.filter(record => 
                record.poNumber && record.poNumber.toLowerCase().includes(searchTerm.toLowerCase())
            );
            break;
        case 'vendor':
            filteredRecords = records.filter(record => 
                record.vendor && record.vendor.toLowerCase().includes(searchTerm.toLowerCase())
            );
            break;
        case 'site':
            filteredRecords = records.filter(record => 
                record.site && record.site.toLowerCase().includes(searchTerm.toLowerCase())
            );
            break;
    }
    
    const data = filteredRecords.map((record, index) => [
        index + 1,
        formatDate(record.entryDate),
        record.poNumber || '-',
        record.vendor || '-',
        record.invoiceNumber || '-',
        record.value ? formatNumber(record.value) : '-',
        record.releaseDate ? formatDate(record.releaseDate) : '-',
        record.status
    ]);
    
    data.push(['', '', '', '', 'Total:', formatNumber(invoiceTotal), '', '']);
    
    doc.setFontSize(14);
    doc.setTextColor(40);
    doc.text('IBA Trading Statement of Account', 300, 30, { align: 'center' });
    
    doc.setFontSize(10);
    const splitHeader = doc.splitTextToSize(reportHeader, 500);
    doc.text(splitHeader, 40, 60);
    
    doc.setFontSize(10);
    doc.text(`PO Value: ${poTotal}`, 40, 90);
    doc.text(`Invoice Total: ${invoiceTotal}`, 150, 90);
    doc.text(`With Accounts Total: ${accountsTotal}`, 260, 90);
    doc.text(`Balance: ${balance}`, 370, 90);
    
    doc.autoTable({
        head: [['ID', 'Date', 'PO', 'Vendor', 'Invoice', 'Amount', 'Release Date', 'Status']],
        body: data,
        startY: 110,
        margin: { left: 40, right: 40 },
        headStyles: {
            fillColor: [74, 111, 165],
            textColor: 255,
            fontStyle: 'bold',
            fontSize: 8
        },
        bodyStyles: {
            fontSize: 8,
            cellPadding: 3
        },
        alternateRowStyles: {
            fillColor: [240, 240, 240]
        },
        columnStyles: {
            5: { halign: 'right' }
        },
        styles: {
            overflow: 'linebreak',
            cellWidth: 'wrap'
        }
    });
    
    doc.save('statement_of_account.pdf');
}

function printReport() {
    const reportHeader = document.getElementById('reportHeader').textContent;
    const poTotal = document.getElementById('poTotal').textContent;
    const invoiceTotal = document.getElementById('grandTotal').textContent;
    const accountsTotal = document.getElementById('accountsTotal').textContent;
    const balance = document.getElementById('balanceTotal').textContent;
    
    const printContent = `
        <style>
            @page { size: auto; margin: 5mm; }
            body { font-family: Arial, sans-serif; font-size: 10px; margin: 0; padding: 10px; }
            h2 { text-align: center; font-size: 14px; margin-bottom: 5px; }
            .report-info { text-align: center; font-size: 10px; margin-bottom: 10px; }
            .financial-summary { 
                display: grid; 
                grid-template-columns: repeat(4, 1fr); 
                gap: 5px; 
                margin-bottom: 10px; 
                padding: 5px; 
                border-bottom: 1px solid #ddd;
            }
            .financial-label { font-size: 9px; color: #666; }
            .financial-value { font-size: 10px; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; font-size: 9px; margin-top: 5px; }
            th { background-color: #4a6fa5; color: white; padding: 4px; text-align: left; }
            td { padding: 4px; border: 1px solid #ddd; }
            .numeric { text-align: right; font-family: 'Courier New', monospace; }
            .status-badge { 
                display: inline-block; 
                padding: 2px 5px; 
                border-radius: 10px; 
                font-size: 8px; 
                font-weight: bold;
            }
            tfoot td { font-weight: bold; border-top: 2px solid #4a6fa5; }
        </style>
        <h2>Statement of Account</h2>
        <div class="report-info">${reportHeader}</div>
        <div class="financial-summary">
            <div>
                <div class="financial-label">PO Value</div>
                <div class="financial-value">${poTotal}</div>
            </div>
            <div>
                <div class="financial-label">Invoice Total</div>
                <div class="financial-value">${invoiceTotal}</div>
            </div>
            <div>
                <div class="financial-label">With Accounts</div>
                <div class="financial-value">${accountsTotal}</div>
            </div>
            <div>
                <div class="financial-label">Balance</div>
                <div class="financial-value">${balance}</div>
            </div>
        </div>
        ${document.getElementById('reportTable').outerHTML}
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 500);
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
    
    // Adjust table columns based on screen size
    if (screenWidth <= 400) {
        // Very small screens - show minimal columns
        document.querySelectorAll('#recordsTable th:nth-child(2), #recordsTable td:nth-child(2), #recordsTable th:nth-child(3), #recordsTable td:nth-child(3), #recordsTable th:nth-child(4), #recordsTable td:nth-child(4), #recordsTable th:nth-child(5), #recordsTable td:nth-child(5), #recordsTable th:nth-child(6), #recordsTable td:nth-child(6), #recordsTable th:nth-child(7), #recordsTable td:nth-child(7), #recordsTable th:nth-child(8), #recordsTable td:nth-child(8)').forEach(el => {
            el.style.display = 'none';
        });
    } else if (screenWidth <= 576) {
        // Small mobile screens
        document.querySelectorAll('#recordsTable th:nth-child(2), #recordsTable td:nth-child(2), #recordsTable th:nth-child(3), #recordsTable td:nth-child(3), #recordsTable th:nth-child(4), #recordsTable td:nth-child(4), #recordsTable th:nth-child(6), #recordsTable td:nth-child(6), #recordsTable th:nth-child(7), #recordsTable td:nth-child(7), #recordsTable th:nth-child(8), #recordsTable td:nth-child(8)').forEach(el => {
            el.style.display = 'none';
        });
    } else if (screenWidth <= 768) {
        // Tablets and larger phones
        document.querySelectorAll('#recordsTable th:nth-child(2), #recordsTable td:nth-child(2), #recordsTable th:nth-child(3), #recordsTable td:nth-child(3), #recordsTable th:nth-child(7), #recordsTable td:nth-child(7), #recordsTable th:nth-child(8), #recordsTable td:nth-child(8)').forEach(el => {
            el.style.display = 'none';
        });
    } else if (screenWidth <= 992) {
        // Small desktop/laptop
        document.querySelectorAll('#recordsTable th:nth-child(3), #recordsTable td:nth-child(3), #recordsTable th:nth-child(8), #recordsTable td:nth-child(8)').forEach(el => {
            el.style.display = 'none';
        });
    } else {
        // Show all columns on larger screens
        document.querySelectorAll('#recordsTable th, #recordsTable td').forEach(el => {
            el.style.display = '';
        });
    }
}

// Initialization
window.onload = function() {
    detectDeviceType();
    updateConnectionStatus(false);
    
    // Add event listeners for responsive behavior
    window.addEventListener('resize', setupResponsiveElements);
    window.addEventListener('orientationchange', setupResponsiveElements);
    
    document.getElementById('connectBtn').addEventListener('click', async function() {
        const btn = this;
        const originalHTML = btn.innerHTML;
        
        btn.disabled = true;
        btn.innerHTML = `
            <div class="corporate-spinner" style="width: 20px; height: 20px; display: inline-block; margin-right: 10px;"></div>
            Loading...
        `;
        
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
    
    document.querySelectorAll('input[name="dataSource"]').forEach(radio => {
        radio.addEventListener('change', async function() {
            const selectedYear = this.value;
            const connectBtn = document.getElementById('connectBtn');
            const originalHTML = connectBtn.innerHTML;
            
            records = [];
            refreshTable();
            connectBtn.disabled = true;
            connectBtn.innerHTML = `
                <div class="corporate-spinner" style="width: 20px; height: 20px; display: inline-block; margin-right: 10px;"></div>
                Loading ${selectedYear} Data...
            `;
            
            try {
                const savedData = localStorage.getItem(`recordsData_${selectedYear}`);
                if (savedData) {
                    records = JSON.parse(savedData);
                    records = migrateStatus(records);
                    refreshTable();
                }
                
                await loadFromGitHub(true);
                refreshTable();
                updateConnectionStatus(true);
                
            } catch (error) {
                console.error('Error loading data:', error);
                updateConnectionStatus(false);
            } finally {
                connectBtn.disabled = false;
                connectBtn.innerHTML = originalHTML;
                setTimeout(() => refreshTable(), 100);
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
    
    document.querySelector('.close').onclick = function() {
        document.getElementById('previewModal').style.display = 'none';
    };
    
    window.onclick = function(event) {
        const modal = document.getElementById('previewModal');
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    };
    
    document.querySelector('input[value="2025"]').checked = true;
    loadFromLocalStorage();
    
    const selectedYear = '2025';
    const lastFetch = localStorage.getItem(`lastGitHubFetch_${selectedYear}`);
    if (!lastFetch || (new Date() - new Date(lastFetch)) > 3600000) {
        loadFromGitHub().catch(() => {
            updateConnectionStatus(false);
        });
    }
};