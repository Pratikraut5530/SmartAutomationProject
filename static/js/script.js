let currentSortColumn = null;
let currentSortDirection = 'asc';

// List of common words to exclude
const commonWords = ['BANK', 'CREDIT', 'UNION', 'HOLDING', 'FEDRAL'];

async function searchCompanies() {
    const rawInput = document.getElementById('company-name').value.trim()
    sanitizedUserInput = rawInput.toUpperCase();
    // let companyName = document.getElementById('company-name').value.trim().toUpperCase();
    let companyAddress = document.getElementById('company-address').value.trim();
    let companyWebsite = document.getElementById('company-website').value.trim();

    // Remove common words from company name
    companyName = removeCommonWords(sanitizedUserInput);

    // Show loading indicator
    document.getElementById('loading').style.display = 'block';

    try {
        const response = await fetch('/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ companyName, companyAddress, companyWebsite })
        });

        // Hide loading indicator
        document.getElementById('loading').style.display = 'none';

        if (response.ok) {
            const results = await response.json();
            console.log("Received results:", results);  // Debug: Log the received results
            displayResults(results);
        } else {
            console.error("Failed to fetch data from the server");
        }
    } catch (error) {
        console.error("An error occurred:", error);
        // Hide loading indicator even in case of error
        document.getElementById('loading').style.display = 'none';
    }
}

function removeCommonWords(companyName) {
    const pattern = new RegExp(`\\b(${commonWords.join('|')})\\b`, 'gi');
    return companyName.replace(pattern, '').trim();
}

function displayResults(results) {
    console.log("Displaying results...", results);  // Debug: Log the entire results object
    displayIBanknetData(results.ibanknet || []);
    displayFDICData(results.fdic || []);
}

function displayIBanknetData(data) {
    displayTable(data, 'IBANKNET_DATA', 'results-container-ibanknet', 'CUSTOMER_NAME');
}

function displayFDICData(data) {
    console.log("FDIC Data:", data);  // Debug: Log the FDIC data array
    displayTable(data, 'FDIC_DATA', 'results-container-fdic', 'NAME');
}

function displayTable(data, tableName, containerId, linkColumn) {
    console.log(`Displaying data for ${tableName}`);
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    if (data.length === 0) {
        container.innerHTML = '<p>No matches found.</p>';
        return;
    }

    // Remove duplicates
    const uniqueData = data.filter((v, i, a) => a.findIndex(t => (t[linkColumn] === v[linkColumn])) === i);

    const table = document.createElement('table');
    table.className = 'results-table';
    const thead = document.createElement('thead');
    const tbody = document.createElement('tbody');
    
    // Create table header
    const headerRow = document.createElement('tr');
    const columns = Object.keys(uniqueData[0]).filter(col => col !== 'SOURCE_WEBSITE');
    if (columns.includes(linkColumn)) {
        columns.splice(columns.indexOf(linkColumn), 1);
        columns.unshift(linkColumn);
    }
    columns.forEach(col => {
        const th = document.createElement('th');
        th.textContent = col;
        th.onclick = () => sortTable(uniqueData, table, col);
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Create table body
    uniqueData.forEach(row => {
        const tr = document.createElement('tr');
        columns.forEach(col => {
            const td = document.createElement('td');
            if (tableName === 'IBANKNET_DATA' && col === 'CUSTOMER_NAME') {
                td.innerHTML = `<a href="${row['SOURCE_WEBSITE']}" target="_blank">${row[col]}</a>`;
            } else if (tableName === 'FDIC_DATA' && col === 'NAME') {
                td.innerHTML = `<a href="https://banks.data.fdic.gov/bankfind-suite/bankfind?activeStatus=0%20OR%201&branchOffices=true&name=${sanitizedUserInput.toLowerCase()}&pageNumber=1&resultLimit=25" target="_blank">${row[col]}</a>`;
            } else {
                td.textContent = row[col];
            }
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    container.appendChild(table);
}

function sortTable(data, table, column) {
    if (currentSortColumn === column) {
        currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        currentSortDirection = 'asc';
    }
    currentSortColumn = column;

    data.sort((a, b) => {
        if (a[column] < b[column]) return currentSortDirection === 'asc' ? -1 : 1;
        if (a[column] > b[column]) return currentSortDirection === 'asc' ? 1 : -1;
        return 0;
    });

    displayTable(data, table.parentNode.id, column);
}
